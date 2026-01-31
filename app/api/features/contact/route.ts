import { NextResponse } from 'next/server';

type Body = {
  name?: unknown;
  email?: unknown;
  message?: unknown;
  company?: unknown;
};

function asString(v: unknown) {
  return typeof v === 'string' ? v : '';
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

// Minimal in-memory throttle (per instance). Replace with Redis for prod.
const THROTTLE_MS = 15_000;
const lastSubmitByIp = new Map<string, number>();

async function notifySlack(text: string, level: 'info' | 'warn' | 'error' = 'error') {
  const url = process.env.SLACK_CONTACT_WEBHOOK_URL;
  if (!url) return;

  const emoji = level === 'error' ? '🔥' : level === 'warn' ? '⚠️' : 'ℹ️';

  try {
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: `${emoji} *Contact Form ${level.toUpperCase()}*\n${text}`,
      }),
    });
  } catch (err) {
    console.error('[slack] failed to send message', err);
  }
}

export async function POST(req: Request) {
  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    'unknown';

  const now = Date.now();
  const last = lastSubmitByIp.get(ip);
  if (last && now - last < THROTTLE_MS) {
    await notifySlack(`Throttled submission from IP ${ip}`, 'warn');
    return NextResponse.json(
      { ok: false, error: 'Please wait a moment and try again.', ui: { action: null } },
      { status: 429 }
    );
  }

  try {
    let body: Body;
    try {
      body = (await req.json()) as Body;
    } catch {
      return NextResponse.json(
        { ok: false, error: 'Invalid JSON body.', ui: { action: null } },
        { status: 400 }
      );
    }

    const name = asString(body.name).trim();
    const email = asString(body.email).trim();
    const message = asString(body.message).trim();
    const company = asString(body.company).trim();

    if (!name) {
      return NextResponse.json(
        { ok: false, error: 'Name is required.', ui: { action: null } },
        { status: 400 }
      );
    }

    if (!email || !isValidEmail(email)) {
      await notifySlack(`Validation failed (email) from IP ${ip}\nEmail: ${email || '(missing)'}`, 'warn');
      return NextResponse.json(
        { ok: false, error: 'Valid email is required.', ui: { action: null } },
        { status: 400 }
      );
    }

    if (!message || message.length < 10) {
      return NextResponse.json(
        { ok: false, error: 'Message must be at least 10 characters.', ui: { action: null } },
        { status: 400 }
      );
    }

    await notifySlack(
      `New submission received\nIP: ${ip}\nName: ${name}\nEmail: ${email}\nCompany: ${company || '—'}\n\nMessage:\n${message}`,
      'info'
    );

    lastSubmitByIp.set(ip, now);

    return NextResponse.json({
      ok: true,
      message: "Thanks — we got your message.",
      ui: {
        action: "CLOSE_MODAL",
      },
    });
  } catch (err) {
    await notifySlack(`Unhandled server error from IP ${ip}\n${(err as Error).message}`, 'error');
    return NextResponse.json(
      { ok: false, error: 'Internal server error.', ui: { action: null } },
      { status: 500 }
    );
  }
}

export async function GET() {
  // Simple health/info endpoint for debugging
  return NextResponse.json({
    ok: true,
    feature: 'contact',
    endpoints: ['POST /api/features/contact'],
  });
}