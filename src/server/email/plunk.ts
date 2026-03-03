import { getRequiredEnv } from '@/src/server/env';

type SendShavonLloydContactEmailInput = {
  name: string;
  email: string;
  company?: string | null;
  message: string;
  submissionId: string;
  submittedAt: Date;
  ip: string;
  userAgent?: string | null;
};

type PlunkSendBody = {
  to: string[];
  subject: string;
  body: string;
  from?: string;
  name?: string;
  reply?: string;
};

function getRecipientList() {
  const csv = getRequiredEnv('SHAVON_LLOYD_CONTACT_TO_EMAIL');
  const recipients = csv
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);

  if (recipients.length === 0) {
    throw new Error('SHAVON_LLOYD_CONTACT_TO_EMAIL must include at least one email.');
  }

  return recipients;
}

function formatTextBody(input: SendShavonLloydContactEmailInput) {
  const lines = [
    'New shavon-lloyd-contact submission',
    '',
    `Submission ID: ${input.submissionId}`,
    `Submitted At: ${input.submittedAt.toISOString()}`,
    `Name: ${input.name}`,
    `Email: ${input.email}`,
    `Company: ${input.company?.trim() || 'N/A'}`,
    `IP: ${input.ip}`,
    `User Agent: ${input.userAgent?.trim() || 'N/A'}`,
    '',
    'Message:',
    input.message,
  ];

  return lines.join('\n');
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function formatHtmlBody(input: SendShavonLloydContactEmailInput) {
  const company = input.company?.trim() || 'N/A';
  const ua = input.userAgent?.trim() || 'N/A';
  const submittedAt = input.submittedAt.toISOString();
  const safeMessage = escapeHtml(input.message).replaceAll('\n', '<br />');

  return `
<div style="margin:0;padding:24px;background:#f4f6fb;font-family:Georgia,Times,serif;color:#0f172a;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:720px;margin:0 auto;background:#ffffff;border:1px solid #dce3f0;">
    <tr>
      <td style="padding:20px 24px;border-bottom:1px solid #e8edf7;">
        <p style="margin:0;font-size:12px;letter-spacing:0.1em;text-transform:uppercase;color:#64748b;">Shavon Lloyd Contact</p>
        <h1 style="margin:8px 0 0;font-size:26px;line-height:1.25;font-weight:600;color:#0f172a;">New Form Submission</h1>
      </td>
    </tr>
    <tr>
      <td style="padding:18px 24px 8px;">
        <p style="margin:0 0 10px;font-size:16px;line-height:1.5;"><strong>Name:</strong> ${escapeHtml(input.name)}</p>
        <p style="margin:0 0 10px;font-size:16px;line-height:1.5;"><strong>Email:</strong> <a href="mailto:${escapeHtml(input.email)}" style="color:#1d4ed8;text-decoration:none;">${escapeHtml(input.email)}</a></p>
        <p style="margin:0 0 10px;font-size:16px;line-height:1.5;"><strong>Company:</strong> ${escapeHtml(company)}</p>
      </td>
    </tr>
    <tr>
      <td style="padding:8px 24px 20px;">
        <p style="margin:0 0 8px;font-size:14px;letter-spacing:0.06em;text-transform:uppercase;color:#475569;">Message</p>
        <div style="padding:16px;border:1px solid #dbe4f3;background:#f8fbff;font-size:17px;line-height:1.6;color:#0f172a;">${safeMessage}</div>
      </td>
    </tr>
    <tr>
      <td style="padding:16px 24px;border-top:1px solid #e8edf7;background:#fbfcff;font-size:12px;line-height:1.6;color:#64748b;">
        Submission ID: ${escapeHtml(input.submissionId)}<br />
        Submitted At: ${escapeHtml(submittedAt)}<br />
        IP: ${escapeHtml(input.ip)}<br />
        User Agent: ${escapeHtml(ua)}
      </td>
    </tr>
  </table>
</div>`.trim();
}

export async function sendShavonLloydContactEmail(
  input: SendShavonLloydContactEmailInput
) {
  const apiKey = getRequiredEnv('PLUNK_API_KEY');
  const recipients = getRecipientList();
  const from = process.env.PLUNK_FROM_EMAIL;
  const fromName = process.env.PLUNK_FROM_NAME;

  const body: PlunkSendBody = {
    to: recipients,
    subject: `New Contact Inquiry from ${input.name}`,
    body: formatHtmlBody(input),
    reply: input.email,
  };

  if (from) body.from = from;
  if (fromName) body.name = fromName;

  const response = await fetch('https://next-api.useplunk.com/v1/send', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`Plunk email send failed (${response.status}): ${details}`);
  }
}
