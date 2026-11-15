import { EmailDeliveryService } from '../../features/mail/application/EmailDeliveryService'
import { MySqlEmailOutbox } from '../../features/mail/infrastructure/MySqlEmailOutbox'
import { SmtpEmailSender } from '../../features/mail/infrastructure/SmtpEmailSender'
import { EmailWorker } from '../../features/mail/infrastructure/EmailWorker'
import { mailConfig } from '../../features/mail/infrastructure/mailConfig'
import { ConsoleErrorReporter } from '../../platform/runtime/ConsoleErrorReporter'
import { CryptographicTokens } from '../../features/authentication/infrastructure/CryptographicTokens'
import { SystemClock } from '../../platform/runtime/SystemClock'
import { createDatabase } from '../../platform/database/client'
import { resolve } from 'node:path'
import { LocalImageStore } from '../../features/media/infrastructure/LocalImageStore'

export function createRuntimeModule() {
  const errors = new ConsoleErrorReporter()
  const database = createDatabase()
  const imageDirectory = resolve(process.env.UPLOAD_DIR || '.data/uploads')
  const imageStore = new LocalImageStore(imageDirectory)
  const clock = new SystemClock()
  const tokens = new CryptographicTokens()
  const emailConfig = mailConfig()
  const emailSender = emailConfig ? new SmtpEmailSender(emailConfig) : null
  const emailWorker = emailSender && emailConfig ? new EmailWorker(new EmailDeliveryService(new MySqlEmailOutbox(database.db), emailSender, clock, emailConfig.origin), errors) : null

  return { database, imageDirectory, imageStore, clock, tokens, errors, emailConfig, emailSender, emailWorker }
}
export type RuntimeModule = ReturnType<typeof createRuntimeModule>
