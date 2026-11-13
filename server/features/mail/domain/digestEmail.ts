import type { EmailDelivery, EmailMessage } from './EmailDelivery'
import { emailLayout } from './emailLayout'
import { notificationEmail } from './notificationEmail'

export function digestEmail(deliveries: EmailDelivery[], origin: string): EmailMessage {
  const first = deliveries[0]!
  const messages = deliveries.map(item => notificationEmail(item, origin))
  const workspace = first.activity?.workspaceName || 'your workspace'
  const summary = deliveries.map((item, index) => `${index + 1}. ${item.title}\n${item.activity?.body || ''}\n${new URL(`/workspaces/${item.workspaceId}/pages/${item.pageId}`, origin).href}`).join('\n\n')
  const headline = `${deliveries.length} updates in ${workspace}`
  return {
    id: first.id, to: first.recipient, subject: `SeleSele · Daily summary · ${workspace}`,
    text: messages.map(message => message.text).join('\n\n---\n\n'),
    html: emailLayout({ preheader: headline, category: 'Daily summary', headline, introduction: 'Your workspace activity, together in one email.', actorAction: '', contextLabel: workspace, context: 'Today’s updates', activity: { actorName: 'Your team', workspaceName: workspace, body: summary }, actionLabel: 'Open workspace', url: new URL(`/workspaces/${first.workspaceId}`, origin).href, recipient: first.recipient })
  }
}
