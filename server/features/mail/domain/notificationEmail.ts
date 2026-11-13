import type { EmailDelivery, EmailMessage } from './EmailDelivery'
import { emailLayout } from './emailLayout'

const content = {
  invitation: {
    category: 'Workspace access', headline: 'You’re part of the team.',
    introduction: 'Your workspace access is ready. Open the workspace to start working with your team.',
    actorAction: 'added you to this workspace', actionLabel: 'Open workspace'
  },
  comment: {
    category: 'New comment', headline: 'Your item has a new comment.',
    introduction: 'Someone left a comment on an item you are involved in. Take a look, share your thoughts, and keep the work moving.',
    actorAction: 'left a comment', actionLabel: 'Read comment'
  },
  reply: {
    category: 'New reply', headline: 'A new reply to your conversation.',
    introduction: 'There is a new reply in a discussion you are part of. Jump back in to catch up with your team.',
    actorAction: 'replied to the conversation', actionLabel: 'View reply'
  },
  mention: {
    category: 'You were mentioned', headline: 'You were mentioned.',
    introduction: 'You were mentioned on a workspace item. Open it to see the context and add your perspective.',
    actorAction: 'mentioned you', actionLabel: 'View mention'
  }
} satisfies Record<EmailDelivery['kind'], {
  category: string
  headline: string
  introduction: string
  actorAction: string
  actionLabel: string
}>
export function notificationEmail(delivery: EmailDelivery, origin: string): EmailMessage {
  const activity = delivery.activity
  const invitation = delivery.kind === 'invitation'
  const path = invitation || !delivery.itemId ? '/' : `/workspaces/${delivery.workspaceId}/items/${delivery.itemId}`
  const target = new URL(path, origin)
  if (!invitation && delivery.itemId) {
    if (activity?.threadId) {
      target.searchParams.set('comment', activity.threadId)
    } else if (delivery.kind === 'mention') {
      target.searchParams.set('mention', '1')
    }
  }
  const url = target.href
  const title = delivery.title.replace(/[\p{Cc}\p{Zl}\p{Zp}]/gu, ' ').trim()
  const copy = content[delivery.kind]
  const context = activity?.itemTitle || activity?.workspaceName || title
  const details = [
    activity?.workspaceName,
    context !== activity?.workspaceName ? context : undefined,
    activity ? `${activity.actorName} ${copy.actorAction}` : undefined,
    activity?.quote ? `Selected text: ${activity.quote}` : undefined,
    activity?.body || activity?.workspaceDescription,
    activity?.role ? `Your access: ${activity.role === 'admin' ? 'Admin' : activity.role === 'viewer' ? 'Viewer' : 'Member'}` : undefined
  ].filter(Boolean).join('\n\n')
  return {
    id: delivery.id,
    to: delivery.recipient,
    subject: `SeleSele · ${title}`,
    text: `SeleSele · ${copy.category}\n\n${copy.headline}\n\n${copy.introduction}\n\n${details}\n\n${copy.actionLabel}: ${url}\n\nSent to ${delivery.recipient}. This is an automated notification; please do not reply.`,
    html: emailLayout({ ...copy, preheader: title, context, contextLabel: invitation ? 'Workspace' : activity?.workspaceName || copy.category, activity, url, recipient: delivery.recipient })
  }
}
