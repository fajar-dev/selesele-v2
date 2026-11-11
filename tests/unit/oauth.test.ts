import { describe, expect, test } from 'bun:test'
import { createHash, generateKeyPairSync, sign } from 'node:crypto'
import type { CustomFetch } from 'openid-client'
import type { OAuthTransaction } from '../../server/domain/entities/OAuthTransaction'
import { OAuthService, OAUTH_TTL_SECONDS } from '../../server/application/OAuthService'
import { AuthService } from '../../server/application/AuthService'
import { MicrosoftIdentityProvider } from '../../server/infrastructure/auth/MicrosoftIdentityProvider'
import { MemoryAccounts } from '../support/fakes'

const tenantId = '11111111-1111-4111-8111-111111111111'
const clientId = '22222222-2222-4222-8222-222222222222'
const objectId = '33333333-3333-4333-8333-333333333333'
const origin = 'https://sele.example'
const issuer = `https://login.microsoftonline.com/${tenantId}/v2.0`
const keys = generateKeyPairSync('rsa', { modulusLength: 2048 })
const otherKeys = generateKeyPairSync('rsa', { modulusLength: 2048 })
const configuration = { tenantId, clientId, clientSecret: 'test-client-secret', origin }

function transaction(): OAuthTransaction {
  return { state: 'state-for-this-browser', nonce: 'nonce-for-this-browser', verifier: 'a'.repeat(43), createdAt: Date.now() }
}

function callback(state = transaction().state) {
  const url = new URL('/api/auth/microsoft/callback', origin)
  url.searchParams.set('code', 'authorization-code')
  url.searchParams.set('state', state)
  return url
}

function providerFixture(overrides: Record<string, unknown> = {}, wrongSignature = false) {
  let tokenRequest: URLSearchParams | undefined
  const fetcher: CustomFetch = async (url, options) => {
    if (url.includes('.well-known/openid-configuration')) {
      return Response.json({ issuer, authorization_endpoint: `${issuer}/authorize`, token_endpoint: `${issuer}/token`,
        jwks_uri: `${issuer}/keys`, response_types_supported: ['code'], subject_types_supported: ['pairwise'],
        id_token_signing_alg_values_supported: ['RS256'], token_endpoint_auth_methods_supported: ['client_secret_post'],
        code_challenge_methods_supported: ['S256'] })
    }
    if (url.endsWith('/keys')) {
      return Response.json({ keys: [{ ...keys.publicKey.export({ format: 'jwk' }), kid: 'test-key', alg: 'RS256', use: 'sig' }] })
    }
    if (!url.endsWith('/token')) {
      throw new Error('Unexpected identity endpoint')
    }
    tokenRequest = new URLSearchParams(String(options.body))
    const now = Math.floor(Date.now() / 1000)
    const claims = { iss: issuer, aud: clientId, sub: 'app-specific-subject', oid: objectId, tid: tenantId,
      iat: now, exp: now + 300, nonce: transaction().nonce, email: 'Owner@Example.com', name: 'Owner', ...overrides }
    const encode = (value: unknown) => Buffer.from(JSON.stringify(value)).toString('base64url')
    const input = `${encode({ alg: 'RS256', kid: 'test-key' })}.${encode(claims)}`
    const signature = sign('RSA-SHA256', Buffer.from(input), wrongSignature ? otherKeys.privateKey : keys.privateKey).toString('base64url')
    return Response.json({ access_token: 'unused-access-token', token_type: 'Bearer', expires_in: 300, id_token: `${input}.${signature}` })
  }
  return { provider: new MicrosoftIdentityProvider(configuration, fetcher), request: () => tokenRequest }
}

describe('Microsoft OpenID Connect', () => {
  test('sends state, nonce and S256 PKCE and validates a signed tenant identity', async () => {
    const { provider, request } = providerFixture()
    const pending = transaction()
    const url = new URL(await provider.authorizationUrl(pending))
    expect(url.origin).toBe('https://login.microsoftonline.com')
    expect(url.searchParams.get('state')).toBe(pending.state)
    expect(url.searchParams.get('nonce')).toBe(pending.nonce)
    expect(url.searchParams.get('code_challenge_method')).toBe('S256')
    expect(url.searchParams.get('code_challenge')).toBe(createHash('sha256').update(pending.verifier).digest('base64url'))
    expect(url.searchParams.get('redirect_uri')).toBe(`${origin}/api/auth/microsoft/callback`)
    expect(url.searchParams.get('scope')).toBe('openid profile email')
    expect(await provider.verify(callback(), pending)).toEqual({ subject: `${tenantId}:${objectId}`, email: 'owner@example.com', name: 'Owner' })
    expect(request()?.get('code_verifier')).toBe(pending.verifier)
    expect(request()?.get('client_secret')).toBe(configuration.clientSecret)
    expect(request()?.get('redirect_uri')).toBe(`${origin}/api/auth/microsoft/callback`)
  })

  test('rejects wrong nonce, issuer, audience, expiry, tenant, missing identity and signature', async () => {
    for (const overrides of [
      { nonce: 'other-browser' }, { iss: 'https://untrusted.example' }, { aud: 'another-client' }, { exp: 1 },
      { tid: clientId }, { oid: undefined }, { email: undefined }, { email: 'invalid' }
    ]) {
      const { provider } = providerFixture(overrides)
      await expect(provider.verify(callback(), transaction())).rejects.toMatchObject({ statusCode: 401 })
    }
    const { provider } = providerFixture({}, true)
    await expect(provider.verify(callback(), transaction())).rejects.toMatchObject({ statusCode: 401 })
  })

  test('uses a valid email username when the optional email claim is absent', async () => {
    const { provider } = providerFixture({ email: undefined, preferred_username: 'Member@Example.com' })
    expect((await provider.verify(callback(), transaction())).email).toBe('member@example.com')
    const phoneUsername = providerFixture({ preferred_username: '+62812345678' })
    expect((await phoneUsername.provider.verify(callback(), transaction())).email).toBe('owner@example.com')
  })

  test('rejects configuration that allows arbitrary tenants or insecure public origins', async () => {
    for (const config of [{ ...configuration, tenantId: 'common' }, { ...configuration, clientSecret: '' },
      { ...configuration, origin: 'http://public.example' }, { ...configuration, origin: 'https://sele.example/path' }]) {
      const provider = new MicrosoftIdentityProvider(config)
      await expect(provider.authorizationUrl(transaction())).rejects.toMatchObject({ statusCode: 503 })
    }
  })
})

describe('OAuth transaction boundaries', () => {
  test('generates fresh independent secrets for every login attempt', async () => {
    const accounts = new MemoryAccounts()
    const oauth = new OAuthService(accounts, new AuthService(accounts, accounts))
    const first = await oauth.begin()
    const second = await oauth.begin()
    expect(first.transaction.state).toHaveLength(43)
    expect(first.transaction.verifier).toHaveLength(43)
    expect(first.transaction.nonce).toHaveLength(43)
    expect(new Set([first.transaction.state, first.transaction.nonce, first.transaction.verifier, second.transaction.state]).size).toBe(4)
  })

  test('rejects unbound, expired, future, duplicate and cancelled callbacks before creating a session', async () => {
    const accounts = new MemoryAccounts()
    const oauth = new OAuthService(accounts, new AuthService(accounts, accounts))
    const expired = { ...transaction(), createdAt: Date.now() - OAUTH_TTL_SECONDS * 1000 }
    const future = { ...transaction(), createdAt: Date.now() + 60_000 }
    for (const pending of [undefined, expired, future, { ...transaction(), state: 'other-browser' }]) {
      await expect(oauth.complete(callback(), pending, null)).rejects.toMatchObject({ statusCode: 400 })
    }
    for (const parameter of ['code', 'state']) {
      const url = callback()
      url.searchParams.append(parameter, 'duplicate')
      await expect(oauth.complete(url, transaction(), null)).rejects.toMatchObject({ statusCode: 400 })
    }
    const denied = callback()
    denied.searchParams.set('error', 'access_denied')
    await expect(oauth.complete(denied, transaction(), null)).rejects.toMatchObject({ statusCode: 401 })
    expect(accounts.sessions.size).toBe(0)
  })

  test('creates an application session after a valid Microsoft callback', async () => {
    const accounts = new MemoryAccounts()
    const { provider } = providerFixture()
    const auth = new AuthService(accounts, accounts)
    const result = await new OAuthService(provider, auth).complete(callback(), transaction(), null)
    expect(await auth.authenticate(result.token)).toEqual(result.user)
  })
})
