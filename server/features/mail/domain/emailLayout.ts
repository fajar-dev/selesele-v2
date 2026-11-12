import type { EmailActivity } from './EmailActivity'

// Email clients need inline styles. Keep their design tokens in one place.
const theme = {
  color: { canvas: '#f5f5f3', surface: '#ffffff', ink: '#20201e', muted: '#74746e', border: '#e8e8e3', subtle: '#fafaf8' },
  space: { xs: '8px', sm: '16px', md: '24px', lg: '32px', xl: '40px', outer: '48px' },
  font: { xs: '12px', sm: '13px', md: '15px', lg: '18px', xl: '22px', display: '32px' },
  radius: { sm: '6px', md: '12px', avatar: '50%' },
  width: { content: '560px', mobile: '600px', avatar: '36px' }
} as const

const escapeHtml = (value: string) => value.replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', '\'': '&#39;' })[character]!)

interface EmailLayoutInput {
  preheader: string
  category: string
  headline: string
  introduction: string
  activity: EmailActivity | null
  actorAction: string
  context: string
  contextLabel: string
  actionLabel: string
  url: string
  recipient: string
}

export function emailLayout(input: EmailLayoutInput): string {
  const { color, space, font, radius, width } = theme
  const url = escapeHtml(input.url)
  const activity = input.activity
  const initials = activity?.actorName.trim().split(/\s+/).slice(0, 2).map(part => Array.from(part)[0] || '').join('').toUpperCase()
  const actor = activity
    ? `<table role="presentation" width="100%" style="width:100%;margin-top:${space.md};"><tr>
    <td width="${Number.parseInt(width.avatar, 10)}" style="width:${width.avatar};vertical-align:top;">
      <table role="presentation"><tr><td align="center" style="width:${width.avatar};height:${width.avatar};background-color:${color.border};border-radius:${radius.avatar};font-size:${font.xs};font-weight:700;">${escapeHtml(initials || 'S')}</td></tr></table>
    </td><td style="padding-left:${space.xs};vertical-align:top;">
      <p style="margin:0;font-size:${font.sm};font-weight:700;line-height:1.6;">${escapeHtml(activity.actorName)}</p>
      <p style="margin:0;color:${color.muted};font-size:${font.xs};line-height:1.6;">${escapeHtml(input.actorAction)}</p>
    </td>
  </tr></table>`
    : ''
  const quote = activity?.quote
    ? `<table role="presentation" width="100%" style="width:100%;margin-top:${space.md};"><tr><td style="padding-left:${space.sm};border-left:2px solid ${color.border};">
    <p style="margin:0 0 ${space.xs};color:${color.muted};font-size:${font.xs};line-height:1.5;">Selected text</p>
    <p style="margin:0;color:${color.muted};font-size:${font.sm};font-style:italic;line-height:1.7;white-space:pre-wrap;">${escapeHtml(activity.quote)}</p>
  </td></tr></table>`
    : ''
  const body = activity?.body || activity?.workspaceDescription
  const message = body ? `<p style="margin:${space.md} 0 0;font-size:${font.md};font-weight:400;line-height:1.8;white-space:pre-wrap;">${escapeHtml(body)}</p>` : ''
  const role = activity?.role ? `<p style="margin:${space.md} 0 0;color:${color.muted};font-size:${font.sm};line-height:1.7;">Your access <strong style="color:${color.ink};">${activity.role === 'admin' ? 'Admin' : 'Member'}</strong></p>` : ''
  return `<!doctype html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="x-apple-disable-message-reformatting">
  <meta name="color-scheme" content="light">
  <title>${escapeHtml(input.headline)} · SeleSele</title>
  <style>
    body, table, td, a { -webkit-text-size-adjust:100%; -ms-text-size-adjust:100%; }
    table { border-collapse:collapse; mso-table-lspace:0; mso-table-rspace:0; }
    a { color:${color.ink}; }
    @media only screen and (max-width:${width.mobile}) {
      .email-outer { padding:${space.md} ${space.sm} !important; }
      .email-content { padding:${space.lg} ${space.md} !important; }
      .email-heading { font-size:${font.xl} !important; }
      .email-action { display:block !important; text-align:center !important; }
    }
  </style>
</head>
<body style="margin:0;padding:0;background-color:${color.canvas};color:${color.ink};font-family:Arial,Helvetica,sans-serif;">
  <div style="display:none;max-height:0;overflow:hidden;mso-hide:all;opacity:0;">${escapeHtml(input.preheader)}</div>
  <table role="presentation" width="100%" style="width:100%;background-color:${color.canvas};">
    <tr><td class="email-outer" align="center" style="padding:${space.outer} ${space.md};">
      <!--[if mso]><table role="presentation" width="${Number.parseInt(width.content, 10)}" align="center"><tr><td><![endif]-->
      <table role="presentation" width="100%" style="width:100%;max-width:${width.content};">
        <tr><td class="email-content" style="background-color:${color.surface};border:1px solid ${color.border};border-radius:${radius.md};padding:${space.xl};">
          <p style="margin:0 0 ${space.md};color:${color.muted};font-size:${font.xs};font-weight:700;line-height:1.5;letter-spacing:1.5px;text-transform:uppercase;">${escapeHtml(input.category)}</p>
          <h1 class="email-heading" style="margin:0 0 ${space.sm};font-size:${font.display};font-weight:700;line-height:1.2;letter-spacing:-1px;">${escapeHtml(input.headline)}</h1>
          <p style="margin:0 0 ${space.lg};color:${color.muted};font-size:${font.md};line-height:1.75;">${escapeHtml(input.introduction)}</p>
          <table role="presentation" width="100%" style="width:100%;background-color:${color.subtle};border:1px solid ${color.border};border-radius:${radius.sm};">
            <tr><td style="padding:${space.md};overflow-wrap:anywhere;word-break:break-word;">
              <p style="margin:0 0 ${space.xs};color:${color.muted};font-size:${font.xs};line-height:1.5;">${escapeHtml(input.contextLabel)}</p>
              <p style="margin:0;font-size:${font.lg};font-weight:600;line-height:1.6;">${escapeHtml(input.context)}</p>
              ${actor}${quote}${message}${role}
            </td></tr>
          </table>
          <table role="presentation" style="margin-top:${space.lg};"><tr>
            <td style="background-color:${color.ink};border-radius:${radius.sm};mso-padding-alt:${space.sm} ${space.md};">
              <a class="email-action" href="${url}" style="display:inline-block;padding:${space.sm} ${space.md};border:1px solid ${color.ink};border-radius:${radius.sm};background-color:${color.ink};color:${color.surface};font-size:${font.md};font-weight:700;line-height:1.2;text-decoration:none;mso-padding-alt:0;">${escapeHtml(input.actionLabel)}</a>
            </td>
          </tr></table>
          <table role="presentation" width="100%" style="width:100%;margin-top:${space.md};">
            <tr><td style="padding-top:${space.md};">
              <p style="margin:0 0 ${space.xs};color:${color.muted};font-size:${font.xs};line-height:1.7;">Button not working? Copy this link into your browser.</p>
              <a href="${url}" style="color:${color.muted};font-size:${font.xs};line-height:1.7;overflow-wrap:anywhere;word-break:break-all;">${url}</a>
            </td></tr>
          </table>
        </td></tr>
        <tr><td align="center" style="padding:${space.md} ${space.sm} 0;">
          <p style="margin:0;color:${color.muted};font-size:${font.xs};line-height:1.8;">Sent to ${escapeHtml(input.recipient)} by SeleSele.<br>This is an automated notification. Please do not reply to this email.</p>
        </td></tr>
      </table>
      <!--[if mso]></td></tr></table><![endif]-->
    </td></tr>
  </table>
</body>
</html>`
}
