// Server-only utility for sending transactional emails via Resend.
// Fire-and-forget: errors are logged but never rethrown.

import type { EmailTemplate } from './templates'
import { renderTemplate } from './templates'

interface SendEmailInput {
  to: string
  template: EmailTemplate
  data: Record<string, string>
  link?: string
}

export async function sendEmail(input: SendEmailInput): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    console.warn('[sendEmail] RESEND_API_KEY not set — skipping email to', input.to)
    return
  }
  if (!input.to) return

  try {
    const { subject, html } = renderTemplate(input.template, input.data, input.link)
    const from = process.env.RESEND_FROM_EMAIL ?? 'MOSTRA <noreply@mostra.app>'

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to: [input.to],
        subject,
        html,
      }),
    })

    if (!res.ok) {
      const body = await res.text()
      console.error('[sendEmail] Resend API error:', res.status, body)
    }
  } catch (err) {
    console.error('[sendEmail] Unexpected error:', err)
  }
}
