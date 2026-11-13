import { describe, expect, test } from 'bun:test'
import { EmailDeliveryService } from '../../server/features/mail/application/EmailDeliveryService'
import { emailExcerpt } from '../../server/features/mail/domain/EmailActivity'
import { notificationEmail } from '../../server/features/mail/domain/notificationEmail'
import { deliveryPolicy, nextDeliveryAttempt } from '../../server/features/mail/domain/deliveryPolicy'
import type { EmailDelivery } from '../../server/features/mail/domain/EmailDelivery'
import type { EmailOutbox } from '../../server/features/mail/domain/EmailOutbox'
import { EmailWorker } from '../../server/features/mail/infrastructure/EmailWorker'
import { mailConfig } from '../../server/features/mail/infrastructure/mailConfig'

const now = new Date('2026-01-01T00:00:00Z')
const clock = { now: () => now }
const delivery: EmailDelivery = { id: 'email-id', recipient: 'member@example.invalid', recipientUserId: 'member', workspaceId: 'workspace', pageId: 'page', memberId: null,
  kind: 'mention', title: 'You were mentioned', activity: null, attempts: 1, leaseToken: 'lease' }

function fixture(readable = true) {
  const completed: string[] = []
  const retries: Array<{ availableAt: Date | null, code: string }> = []
  const outbox: EmailOutbox = {
    async claim() {
      return delivery
    },
    async deliverable() {
      return readable
    },
    async complete(_delivery, state) {
      completed.push(state)
    },
    async retry(_delivery, availableAt, code) {
      retries.push({ availableAt, code })
    }
  }
  return { outbox, completed, retries }
}

describe('background email delivery', () => {
  test('a successful send is acknowledged after delivery', async () => {
    const { outbox, completed } = fixture()
    let sent = false
    const service = new EmailDeliveryService(outbox, { async send(message) {
      expect(completed).toEqual([])
      expect(message.to).toBe(delivery.recipient)
      expect(message.text).toContain('/workspaces/workspace/pages/page')
      sent = true
    } }, clock, 'https://notes.example.com')
    expect(await service.deliverNext()).toBe(true)
    expect(sent).toBe(true)
    expect(completed).toEqual(['sent'])
  })

  test('revoked access skips SMTP delivery', async () => {
    const { outbox, completed } = fixture(false)
    const service = new EmailDeliveryService(outbox, { async send() {
      throw new Error('Must not send')
    } }, clock, 'https://notes.example.com')
    await service.deliverNext()
    expect(completed).toEqual(['skipped'])
  })

  test('SMTP failures persist a retry without acknowledging successful delivery', async () => {
    const { outbox, completed, retries } = fixture()
    const service = new EmailDeliveryService(outbox, { async send() {
      throw Object.assign(new Error('Sensitive server details'), { code: 'ECONNECTION' })
    } }, clock, 'https://notes.example.com')
    await service.deliverNext()
    expect(completed).toEqual([])
    expect(retries).toEqual([{ code: 'ECONNECTION', availableAt: new Date(now.getTime() + 30_000) }])
    expect(nextDeliveryAttempt(2, now)?.getTime()).toBe(now.getTime() + 60_000)
    expect(nextDeliveryAttempt(deliveryPolicy.maxAttempts, now)).toBeNull()
  })

  test('worker startup returns immediately while SMTP remains pending; shutdown waits for the active job', async () => {
    let begin!: () => void
    let release!: (value: boolean) => void
    const started = new Promise<void>((resolve) => {
      begin = resolve
    })
    const pending = new Promise<boolean>((resolve) => {
      release = resolve
    })
    let calls = 0
    const worker = new EmailWorker({ deliverNext() {
      calls++
      begin()
      return pending
    } }, { report() {
      throw new Error('Unexpected worker error')
    } })
    expect(worker.start()).toBeUndefined()
    worker.start()
    await started
    let closed = false
    const closing = worker.close().then(() => {
      closed = true
    })
    await Promise.resolve()
    expect(closed).toBe(false)
    release(true)
    await closing
    expect(closed).toBe(true)
    expect(calls).toBe(1)
  })

  test('HTML and subject escaping protect user-provided titles; invitation links require sign-in', () => {
    const result = notificationEmail({ ...delivery, title: '<script>alert(1)</script>\r\nBcc: other@example.invalid' }, 'https://notes.example.com')
    expect(result.html).not.toContain('<script>')
    expect(result.html).toContain('&lt;script&gt;')
    expect(result.subject).not.toMatch(/[\r\n]/)
    const invite = notificationEmail({ ...delivery, kind: 'invitation' }, 'https://notes.example.com')
    expect(invite.text).not.toContain('Sign in with')
    expect(invite.html).not.toContain('Sign in with')
    expect(invite.html).toContain('href="https://notes.example.com/"')
    expect(invite.html).not.toContain('/pages/')
  })

  test('activity snapshots show the actual author, selected text and message safely in HTML and plain text', () => {
    const activity = { actorName: 'Alex & Morgan', workspaceName: 'Product team', pageTitle: 'Launch plan', quote: 'Launch on Monday', body: '<script>bad</script>\nPlease review the final checklist.' }
    const result = notificationEmail({ ...delivery, kind: 'comment', activity }, 'https://notes.example.com')
    expect(result.html).toContain('Alex &amp; Morgan')
    expect(result.html).toContain('Launch on Monday')
    expect(result.html).toContain('&lt;script&gt;bad&lt;/script&gt;')
    expect(result.html).not.toContain('<script>')
    expect(result.text).toContain('Please review the final checklist.')
    expect(result.text).toContain('Selected text: Launch on Monday')
    const invite = notificationEmail({ ...delivery, kind: 'invitation', activity: { actorName: 'Alex', workspaceName: 'Product team', workspaceDescription: 'Roadmaps and shared project notes.', role: 'admin' } }, 'https://notes.example.com')
    expect(invite.html).toContain('Roadmaps and shared project notes.')
    expect(invite.html).toContain('Admin')
    expect(invite.text).toContain('Alex added you')
    expect(invite.html).not.toContain('Sign in with')
  })

  test('activity previews bound stored content without cutting Unicode surrogate pairs', () => {
    expect(emailExcerpt('  Hello  ')).toBe('Hello')
    expect(emailExcerpt('😀😀😀', 2)).toBe('😀😀…')
    expect(emailExcerpt('a'.repeat(1300))).toHaveLength(1201)
  })

  test('SMTP configuration is optional, validates required fields and supports an authenticated custom port', () => {
    expect(mailConfig({ MAIL_ENABLED: 'false', SMTP_HOST: 'incomplete' })).toBeNull()
    expect(mailConfig({})).toBeNull()
    expect(() => mailConfig({ MAIL_ENABLED: 'true' })).toThrow('Invalid email configuration')
    const configured = mailConfig({ MAIL_ENABLED: 'true', SMTP_HOST: 'smtp.example.invalid', SMTP_PORT: '1025', SMTP_FROM: 'no-reply@example.invalid', SMTP_USER: 'user', SMTP_PASS: 'secret', APP_ORIGIN: 'https://notes.example.com' })
    expect(configured?.secure).toBe(false)
    expect(configured?.requireTLS).toBe(false)
    expect(mailConfig({ SMTP_HOST: 'smtp.example.invalid', SMTP_PORT: '587', SMTP_FROM: 'no-reply@example.invalid', APP_ORIGIN: 'https://notes.example.com' })?.requireTLS).toBe(true)
    expect(() => mailConfig({ SMTP_HOST: 'smtp.example.invalid', SMTP_FROM: 'no-reply@example.invalid', SMTP_USER: 'user', APP_ORIGIN: 'https://notes.example.com' })).toThrow()
    expect(() => mailConfig({ MAIL_ENABLED: 'yes' })).toThrow()
  })
})
