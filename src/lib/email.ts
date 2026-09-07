// Only ever imported from a 'use server' module, so it stays on the server.
// Email is pluggable so the sign-in flow works before a sending domain exists.
// With no RESEND_API_KEY the message is logged to the server console, which is
// enough to click through the whole flow locally.
//
// To send for real:
//   1. Verify a domain in Resend (a *.vercel.app URL cannot be a sender).
//   2. Set RESEND_API_KEY and EMAIL_FROM, e.g. "WizBiz <noreply@yourdomain>".

export type Mail = {
  to: string
  subject: string
  text: string
}

export function emailIsConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM)
}

export async function sendMail(mail: Mail): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!emailIsConfigured()) {
    console.log(
      [
        '',
        '─'.repeat(72),
        '  EMAIL NOT CONFIGURED — message not sent. Printing it instead.',
        `  To:      ${mail.to}`,
        `  Subject: ${mail.subject}`,
        '',
        mail.text.split('\n').map(l => `  ${l}`).join('\n'),
        '─'.repeat(72),
        '',
      ].join('\n')
    )
    return { ok: true }
  }

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM,
        to: [mail.to],
        subject: mail.subject,
        text: mail.text,
      }),
    })

    if (!res.ok) {
      const body = await res.text()
      console.error('Resend rejected the message:', res.status, body)
      return { ok: false, error: 'The email could not be sent.' }
    }
    return { ok: true }
  } catch (err) {
    console.error('Sending mail failed:', err)
    return { ok: false, error: 'The email could not be sent.' }
  }
}
