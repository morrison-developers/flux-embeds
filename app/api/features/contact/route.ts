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

export async function POST(req: Request) {
  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    'unknown';

  const now = Date.now();
  const last = lastSubmitByIp.get(ip);
  if (last && now - last < THROTTLE_MS) {
    return NextResponse.json(
      { ok: false, error: 'Please wait a moment and try again.' },
      { status: 429 }
    );
  }

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json(
      { ok: false, error: 'Invalid JSON body.' },
      { status: 400 }
    );
  }

  const name = asString(body.name).trim();
  const email = asString(body.email).trim();
  const message = asString(body.message).trim();
  const company = asString(body.company).trim();

  if (!name) {
    return NextResponse.json(
      { ok: false, error: 'Name is required.' },
      { status: 400 }
    );
  }

  if (!email || !isValidEmail(email)) {
    return NextResponse.json(
      { ok: false, error: 'Valid email is required.' },
      { status: 400 }
    );
  }

  if (!message || message.length < 10) {
    return NextResponse.json(
      { ok: false, error: 'Message must be at least 10 characters.' },
      { status: 400 }
    );
  }

  // TODO (later): deliver to email/CRM.
  // For now: just log server-side so you can verify in dev.
  console.log('[contact]', { name, email, company: company || undefined, message });

  lastSubmitByIp.set(ip, now);

  return NextResponse.json({ ok: true });
}

export async function GET() {
  // Simple health/info endpoint for debugging
  return NextResponse.json({
    ok: true,
    feature: 'contact',
    endpoints: ['POST /api/features/contact'],
  });
}