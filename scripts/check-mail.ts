import { mailConfig } from '../server/features/mail/infrastructure/mailConfig'
import { SmtpEmailSender } from '../server/features/mail/infrastructure/SmtpEmailSender'

const config = mailConfig()
if (!config) {
  throw new Error('Set MAIL_ENABLED=true and configure SMTP before checking email delivery')
}
const sender = new SmtpEmailSender(config)
try {
  await sender.verify()
  console.log('SMTP connection and authentication verified; no email was sent')
} finally {
  sender.close()
}
