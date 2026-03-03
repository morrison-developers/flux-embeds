import { NextResponse } from 'next/server';
import { isValidAdminToken } from '@/src/server/api/auth';
import { apiError } from '@/src/server/api/errors';
import { prisma } from '@/src/server/prisma';
import { sendShavonLloydContactEmail } from '@/src/server/email/plunk';
import {
  isEnvConfigError,
  validateAdminEnv,
  validateDatabaseEnv,
} from '@/src/server/env';

type Body = {
  name?: unknown;
  email?: unknown;
  message?: unknown;
  company?: unknown;
  website?: unknown;
};

function asString(value: unknown) {
  return typeof value === 'string' ? value : '';
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

const THROTTLE_MS = 15_000;
const lastSubmitByIp = new Map<string, number>();

function resolveIp(req: Request) {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    'unknown'
  );
}

export async function GET(req: Request) {
  try {
    validateDatabaseEnv();
    validateAdminEnv();

    if (!isValidAdminToken(req)) {
      return apiError(401, 'Unauthorized.', 'UNAUTHORIZED');
    }

    const submissions = await prisma.shavonLloydContactSubmission.findMany({
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({
      ok: true,
      data: submissions,
    });
  } catch (error) {
    if (isEnvConfigError(error)) {
      return apiError(500, error.message, error.code);
    }

    return apiError(500, 'Failed to load submissions.', 'INTERNAL');
  }
}

export async function POST(req: Request) {
  const ip = resolveIp(req);
  const now = Date.now();
  const last = lastSubmitByIp.get(ip);
  if (last && now - last < THROTTLE_MS) {
    return apiError(429, 'Please wait a moment and try again.', 'TOO_MANY_REQUESTS');
  }

  try {
    let body: Body;
    try {
      body = (await req.json()) as Body;
    } catch {
      return apiError(400, 'Invalid JSON body.', 'BAD_REQUEST');
    }

    const name = asString(body.name).trim();
    const email = asString(body.email).trim();
    const message = asString(body.message).trim();
    const company = asString(body.company).trim();
    const website = asString(body.website).trim();

    if (website.length > 0) {
      return apiError(400, 'Invalid request.', 'BAD_REQUEST');
    }
    if (!name) {
      return apiError(400, 'Name is required.', 'BAD_REQUEST');
    }
    if (!email || !isValidEmail(email)) {
      return apiError(400, 'Valid email is required.', 'BAD_REQUEST');
    }
    if (!message || message.length < 10) {
      return apiError(400, 'Message must be at least 10 characters.', 'BAD_REQUEST');
    }

    let submissionId = 'not-persisted';
    let submittedAt = new Date();
    let persisted = false;

    try {
      validateDatabaseEnv();
      const submission = await prisma.shavonLloydContactSubmission.create({
        data: {
          name,
          email,
          company: company || null,
          message,
          ip,
          userAgent: req.headers.get('user-agent'),
        },
      });
      submissionId = submission.id;
      submittedAt = submission.createdAt;
      persisted = true;
    } catch (error) {
      console.error('[shavon-lloyd-contact] failed to persist submission', error);
    }

    let emailSent = false;
    try {
      await sendShavonLloydContactEmail({
        submissionId,
        submittedAt,
        name,
        email,
        company: company || null,
        message,
        ip,
        userAgent: req.headers.get('user-agent'),
      });
      emailSent = true;
    } catch (error) {
      console.error('[shavon-lloyd-contact] failed to send email notification', error);
    }

    if (!persisted && !emailSent) {
      return apiError(500, 'Internal server error.', 'INTERNAL');
    }

    lastSubmitByIp.set(ip, now);

    return NextResponse.json({
      ok: true,
      message: 'Thanks — we got your message.',
    });
  } catch (error) {
    if (isEnvConfigError(error)) {
      return apiError(500, error.message, error.code);
    }

    return apiError(500, 'Internal server error.', 'INTERNAL');
  }
}
