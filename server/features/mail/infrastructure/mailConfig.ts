import { z } from 'zod'

const smtpBoolean = (value: string | undefined, fallback: boolean) => {
  if (!value) {
    return fallback
  }
  if (value !== 'true' && value !== 'false') {
    throw new Error('SMTP boolean configuration must be true or false')
  }
  return value === 'true'
}

const configSchema = z.object({
  host: z.string().trim().min(1),
  port: z.coerce.number().int().min(1).max(65535),
  from: z.email(),
  origin: z.url(),
  user: z.string(),
  password: z.string(),
  secure: z.boolean(),
  requireTLS: z.boolean(),
  servername: z.string().optional()
}).refine(config => !config.user || !!config.password, { message: 'SMTP_PASS is required with SMTP_USER' })

export type MailConfig = z.infer<typeof configSchema>

export function mailConfig(environment: Record<string, string | undefined> = process.env): MailConfig | null {
  const enabled = smtpBoolean(environment.MAIL_ENABLED, !!(environment.SMTP_HOST || environment.SMTP_FROM))
  if (!enabled) {
    return null
  }
  const port = Number(environment.SMTP_PORT || 587)
  const result = configSchema.safeParse({
    host: environment.SMTP_HOST,
    port,
    from: environment.SMTP_FROM,
    origin: environment.APP_ORIGIN,
    user: environment.SMTP_USER || '',
    password: environment.SMTP_PASS || '',
    secure: smtpBoolean(environment.SMTP_SECURE, port === 465),
    requireTLS: smtpBoolean(environment.SMTP_REQUIRE_TLS, port === 587),
    servername: environment.SMTP_TLS_SERVERNAME || undefined
  })
  if (!result.success) {
    throw new Error('Invalid email configuration: check SMTP_HOST, SMTP_PORT, SMTP_FROM, APP_ORIGIN and SMTP credentials')
  }
  const origin = new URL(result.data.origin)
  if (!['http:', 'https:'].includes(origin.protocol) || origin.username || origin.password) {
    throw new Error('Email APP_ORIGIN must be an HTTP(S) application origin')
  }
  return { ...result.data, origin: origin.origin }
}
