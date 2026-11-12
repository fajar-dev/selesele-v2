import nodemailer from 'nodemailer'
import type { EmailSender } from '../domain/EmailSender'
import type { EmailMessage } from '../domain/EmailDelivery'
import type { MailConfig } from './mailConfig'

export class SmtpEmailSender implements EmailSender {
  private readonly transport

  constructor(private readonly config: MailConfig) {
    this.transport = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      requireTLS: config.requireTLS,
      auth: config.user ? { user: config.user, pass: config.password } : undefined,
      tls: config.servername ? { servername: config.servername } : undefined,
      pool: true,
      maxConnections: 1,
      connectionTimeout: 10_000,
      greetingTimeout: 10_000,
      socketTimeout: 15_000,
      disableFileAccess: true,
      disableUrlAccess: true
    })
  }

  async send(message: EmailMessage): Promise<void> {
    const domain = this.config.from.split('@')[1]!
    await this.transport.sendMail({
      from: { name: 'SeleSele', address: this.config.from },
      to: { address: message.to, name: '' },
      messageId: `<${message.id}@${domain}>`,
      subject: message.subject,
      text: message.text,
      html: message.html
    })
  }

  async verify(): Promise<void> {
    await this.transport.verify()
  }

  close(): void {
    this.transport.close()
  }
}
