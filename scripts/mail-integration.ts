import { strict as assert } from 'node:assert'
import { randomUUID } from 'node:crypto'
import { createServer, type Socket } from 'node:net'
import { and, eq } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/mysql2'
import { migrate } from 'drizzle-orm/mysql2/migrator'
import { createConnection } from 'mysql2/promise'
import { createDatabase } from '../server/platform/database/client'
import { databaseConfig } from '../server/platform/database/config'
import { documents, emailDeliveries, folders, pages, sessions, users, workspaceInvitations, workspaceMembers, workspaces } from '../server/platform/database/schema'
import { MySqlNotificationRepository } from '../server/features/notifications/infrastructure/MySqlNotificationRepository'
import { MySqlEmailOutbox } from '../server/features/mail/infrastructure/MySqlEmailOutbox'
import { SmtpEmailSender } from '../server/features/mail/infrastructure/SmtpEmailSender'
import { EmailDeliveryService } from '../server/features/mail/application/EmailDeliveryService'
import { CryptographicTokens } from '../server/features/identity/infrastructure/CryptographicTokens'
import { deliveryPolicy } from '../server/features/mail/domain/deliveryPolicy'

// Own both the database and SMTP listener: no configured relay or real recipient is used.
const databaseName = `sele_mail_test_${randomUUID().replaceAll('-', '')}`
const admin = await createConnection({ ...databaseConfig(), database: undefined, timezone: 'Z' })
const received: string[] = []
const sockets = new Set<Socket>()
let acknowledge: (() => void) | undefined
let holdDelivery = true
let rejectDelivery = false
const smtp = createServer((socket) => {
  sockets.add(socket)
  socket.on('close', () => sockets.delete(socket))
  socket.on('error', () => {})
  socket.write('220 localhost test SMTP\r\n')
  let buffer = ''
  let data = false
  socket.on('data', (chunk) => {
    buffer += chunk.toString()
    while (buffer.includes('\r\n')) {
      if (data) {
        const end = buffer.indexOf('\r\n.\r\n')
        if (end < 0) {
          return
        }
        received.push(buffer.slice(0, end))
        buffer = buffer.slice(end + 5)
        data = false
        const reply = () => socket.write(rejectDelivery ? '550 Simulated refusal\r\n' : '250 Accepted\r\n')
        if (holdDelivery) {
          acknowledge = () => {
            reply()
          }
        } else {
          reply()
        }
        continue
      }
      const end = buffer.indexOf('\r\n')
      const command = buffer.slice(0, end).toUpperCase()
      buffer = buffer.slice(end + 2)
      if (command.startsWith('EHLO')) {
        socket.write('250-localhost\r\n250 PIPELINING\r\n')
      } else if (command === 'DATA') {
        data = true
        socket.write('354 End with dot\r\n')
      } else if (command === 'QUIT') {
        socket.end('221 Bye\r\n')
      } else {
        socket.write('250 OK\r\n')
      }
    }
  })
})
await new Promise<void>((resolve, reject) => {
  smtp.once('error', reject)
  smtp.listen(0, '127.0.0.1', resolve)
})
const address = smtp.address()
assert.ok(address && typeof address === 'object')
const sender = new SmtpEmailSender({ host: '127.0.0.1', port: address.port, from: 'no-reply@example.invalid', user: '', password: '', secure: false, requireTLS: false, origin: 'https://notes.example.invalid' })
let database: ReturnType<typeof createDatabase> | undefined
let server: ReturnType<typeof Bun.spawn> | undefined
async function stopServer() {
  if (!server) {
    return
  }
  server.kill('SIGTERM')
  const timeout = setTimeout(() => server?.kill('SIGKILL'), 5000)
  try {
    await server.exited
  } finally {
    clearTimeout(timeout)
    server = undefined
  }
}

async function until(check: () => Promise<boolean>, label: string) {
  const deadline = Date.now() + 15_000
  while (!await check()) {
    assert.ok(Date.now() < deadline, `Timed out: ${label}`)
    await Bun.sleep(25)
  }
}

try {
  await admin.query(`CREATE DATABASE \`${databaseName}\``)
  await admin.changeUser({ database: databaseName })
  await migrate(drizzle(admin), { migrationsFolder: './drizzle' })
  process.env.DB_NAME = databaseName
  database = createDatabase()
  const db = database.db
  const owner = randomUUID()
  const member = randomUUID()
  const workspaceId = randomUUID()
  const pageId = randomUUID()
  const folderId = randomUUID()
  await db.insert(users).values([
    { id: owner, email: 'owner@example.invalid', name: 'Alex Morgan', microsoftSubject: randomUUID() },
    { id: member, email: 'member@example.invalid', name: 'Jamie Lee', microsoftSubject: randomUUID() }
  ])
  await db.insert(workspaces).values({ id: workspaceId, name: 'Email workspace', description: 'Shared plans and team documentation.' })
  await db.insert(workspaceMembers).values([{ workspaceId, userId: owner, role: 'owner' }, { workspaceId, userId: member }])
  await db.insert(folders).values({ id: folderId, workspaceId, name: 'Plans' })
  await db.insert(pages).values({ id: pageId, workspaceId, folderId, title: 'Launch', createdBy: owner })
  const tokens = new CryptographicTokens()
  const ownerToken = tokens.generate()
  const memberToken = tokens.generate()
  await db.insert(sessions).values([
    { tokenHash: tokens.digest(ownerToken), userId: owner, expiresAt: new Date(Date.now() + 3_600_000) },
    { tokenHash: tokens.digest(memberToken), userId: member, expiresAt: new Date(Date.now() + 3_600_000) }
  ])
  const origin = `http://127.0.0.1:${Number(process.env.MAIL_TEST_PORT || 13811)}`
  assert.ok(!await fetch(`${origin}/api/health`).then(() => true, () => false), 'Email integration port is already in use')
  server = Bun.spawn(['bun', '.output/server/index.mjs'], {
    env: { ...process.env, DB_NAME: databaseName, APP_ORIGIN: origin, HOST: '127.0.0.1', PORT: new URL(origin).port, NODE_ENV: 'production',
      MAIL_ENABLED: 'true', SMTP_HOST: '127.0.0.1', SMTP_PORT: String(address.port), SMTP_USER: '', SMTP_PASS: '', SMTP_FROM: 'no-reply@example.invalid', SMTP_SECURE: 'false', SMTP_REQUIRE_TLS: 'false', SMTP_TLS_SERVERNAME: '' },
    stdout: 'inherit', stderr: 'inherit'
  })
  await until(async () => {
    assert.equal(server!.exitCode, null, 'Production mail worker failed to start')
    return fetch(`${origin}/api/health`).then(response => response.ok, () => false)
  }, 'Production application startup')
  const request = async (token: string, path: string, body: unknown) => {
    const response = await fetch(`${origin}/api${path}`, {
      method: 'POST', headers: { 'Cookie': `sele_session=${token}`, 'Origin': origin, 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal: AbortSignal.timeout(2000)
    })
    assert.equal(response.status, 201, path)
    return await response.json() as { data: { id: string } }
  }
  await request(ownerToken, `/workspaces/${workspaceId}/invitations`, { email: 'guest@example.invalid', role: 'member' })
  const [invitationRow] = await db.select().from(workspaceInvitations)
  const invitationId = invitationRow!.id
  const expiresAt = invitationRow!.expiresAt
  const notifications = new MySqlNotificationRepository(db, true)
  await notifications.invitation(workspaceId, 'guest@example.invalid', owner)
  assert.equal((await db.select().from(emailDeliveries)).length, 1, 'Repeated invitation publication deduplicates even for a recipient without an account')
  const outbox = new MySqlEmailOutbox(db)
  await until(async () => !!acknowledge, 'SMTP receives invitation while acknowledgement is held')
  const start = Date.now()
  const anchor = { from: { type: { client: 1, clock: 1 }, item: { client: 1, clock: 2 }, assoc: 0 }, to: { type: { client: 1, clock: 1 }, item: { client: 1, clock: 8 }, assoc: 0 } }
  const thread = await request(memberToken, `/pages/${pageId}/comments`, { quote: 'launch', body: 'Review this', anchor })
  const threadId = thread.data.id
  assert.ok(Date.now() - start < 2000, 'Enqueue finishes while the SMTP server remains blocked')
  const queued = await db.select().from(emailDeliveries)
  assert.equal(queued.find(row => row.kind === 'invitation')?.state, 'processing')
  assert.equal(queued.find(row => row.kind === 'comment')?.state, 'pending')
  holdDelivery = false
  acknowledge!()
  await until(async () => (await db.select().from(emailDeliveries)).every(row => row.state === 'sent'), 'Invitation and new-comment deliveries')
  const invitation = received.find(message => message.includes('To: guest@example.invalid'))!
  assert.ok(invitation.includes('Content-Type: multipart/alternative'), 'Real SMTP transport serializes plain text and HTML')
  assert.ok(invitation.includes(origin))
  assert.ok(invitation.includes('Message-ID: <'))
  await request(ownerToken, `/pages/${pageId}/comments/${threadId}/replies`, { body: 'Reviewed' })
  await request(ownerToken, `/pages/${pageId}/comments/${threadId}/replies`, { body: '@member@example.invalid please check' })
  await db.insert(documents).values({ pageId, markdown: '# Launch\n\n@Jamie Lee please confirm the launch checklist.' })
  await notifications.mentions(pageId, [owner, member], owner)
  await until(async () => (await db.select().from(emailDeliveries)).every(row => row.state === 'sent'), 'Replies and mentions')
  const delivered = await db.select().from(emailDeliveries)
  assert.equal(delivered.length, 5, 'One invitation, comment, reply, comment mention and document mention; no self-notification or duplicate reply')
  assert.equal(delivered.filter(row => row.kind === 'mention').length, 2)
  assert.equal(received.length, 5)
  assert.equal(delivered.find(row => row.kind === 'invitation')!.activity?.role, 'member')
  assert.equal(delivered.find(row => row.kind === 'invitation')!.activity?.workspaceDescription, 'Shared plans and team documentation.')
  assert.equal(delivered.find(row => row.kind === 'comment')!.activity?.body, 'Review this')
  assert.equal(delivered.find(row => row.kind === 'comment')!.activity?.quote, 'launch')
  assert.equal(delivered.find(row => row.kind === 'comment')!.activity?.actorName, 'Jamie Lee')
  assert.equal(delivered.find(row => row.kind === 'reply')!.activity?.body, 'Reviewed')
  assert.ok(delivered.some(row => row.kind === 'mention' && row.activity?.body === '@Jamie Lee please confirm the launch checklist.'))
  assert.ok(received.some(message => message.includes('Review this')), 'SMTP message contains the actual comment content')
  await stopServer()

  // Manual future clock isolates lease/retry cases from any runtime timer.
  const future = new Date(Date.now() + 3_600_000)
  const add = async (key: string) => {
    const id = randomUUID()
    await db.insert(emailDeliveries).values({ id, deduplicationKey: key, recipient: 'member@example.invalid', recipientUserId: member, workspaceId, pageId, kind: 'mention', title: 'Test mention', availableAt: future })
    return id
  }
  const firstId = await add('lease-first')
  const secondId = await add('lease-second')
  const claims = await Promise.all([outbox.claim(future), outbox.claim(future)])
  assert.ok(claims[0] && claims[1])
  assert.notEqual(claims[0].id, claims[1].id, 'Concurrent workers claim distinct jobs')
  const old = claims.find(job => job!.id === firstId)!
  const other = claims.find(job => job!.id === secondId)!
  await outbox.complete(other, 'sent', future)
  const later = new Date(future.getTime() + deliveryPolicy.leaseMs + 1)
  const recovered = await new MySqlEmailOutbox(db).claim(later)
  assert.equal(recovered?.id, firstId, 'New worker recovers an expired lease')
  assert.equal(recovered?.attempts, 2)
  await outbox.complete(old, 'sent', later)
  assert.equal((await db.select().from(emailDeliveries).where(eq(emailDeliveries.id, firstId)))[0]!.state, 'processing', 'Old lease cannot acknowledge a new claim')
  await outbox.complete(recovered!, 'sent', later)
  const clock = { now: () => later }
  const processor = new EmailDeliveryService(outbox, sender, clock, 'https://notes.example.invalid')
  const failedId = await add('smtp-refused')
  rejectDelivery = true
  await processor.deliverNext()
  const [failed] = await db.select().from(emailDeliveries).where(eq(emailDeliveries.id, failedId))
  assert.equal(failed!.state, 'pending')
  assert.equal(failed!.lastError, 'EMESSAGE')
  assert.equal(failed!.attempts, 1)
  rejectDelivery = false
  clock.now = () => new Date(later.getTime() + 30_001)
  await processor.deliverNext()
  assert.equal((await db.select().from(emailDeliveries).where(eq(emailDeliveries.id, failedId)))[0]!.state, 'sent', 'SMTP failure retries successfully')

  const beforeSkip = received.length
  const revokedId = await add('revoked-member')
  await db.delete(workspaceMembers).where(and(eq(workspaceMembers.workspaceId, workspaceId), eq(workspaceMembers.userId, member)))
  await processor.deliverNext()
  assert.equal((await db.select().from(emailDeliveries).where(eq(emailDeliveries.id, revokedId)))[0]!.state, 'skipped')
  await db.insert(workspaceMembers).values({ workspaceId, userId: member })
  const hiddenId = await add('deleted-folder')
  await db.update(folders).set({ deletedAt: new Date() }).where(eq(folders.id, folderId))
  await processor.deliverNext()
  assert.equal((await db.select().from(emailDeliveries).where(eq(emailDeliveries.id, hiddenId)))[0]!.state, 'skipped')
  await db.update(workspaceInvitations).set({ expiresAt: new Date(Date.now() - 1000) }).where(eq(workspaceInvitations.id, invitationId))
  const expiredId = randomUUID()
  await db.insert(emailDeliveries).values({ id: expiredId, deduplicationKey: 'expired-invite', recipient: 'guest@example.invalid', workspaceId, invitationId, invitationExpiresAt: expiresAt, kind: 'invitation', title: 'Invitation', availableAt: future })
  await processor.deliverNext()
  assert.equal((await db.select().from(emailDeliveries).where(eq(emailDeliveries.id, expiredId)))[0]!.state, 'skipped')
  assert.equal(received.length, beforeSkip, 'Revoked, hidden and expired resources never reach SMTP')
  console.log('Email integration passed: isolated SMTP delivery, nonblocking enqueue, guest invites, comment/reply/mention recipients, deduplication, concurrent leases, restart recovery, stale acknowledgements, SMTP retries and access/expiry checks')
} finally {
  holdDelivery = false
  acknowledge?.()
  await stopServer()
  sender.close()
  for (const socket of sockets) {
    socket.destroy()
  }
  await new Promise<void>(resolve => smtp.close(() => resolve()))
  await database?.close()
  await admin.query(`DROP DATABASE IF EXISTS \`${databaseName}\``)
  await admin.end()
}
