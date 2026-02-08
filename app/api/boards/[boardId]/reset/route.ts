import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { isValidAdminToken } from '@/src/server/api/auth';
import { apiError } from '@/src/server/api/errors';
import { resolveRouteParams } from '@/src/server/api/params';
import { boardIdSchema } from '@/src/server/api/validation';
import { resetQuarterWinners } from '@/src/server/boards/repository';
import {
  isEnvConfigError,
  validateAdminEnv,
  validateDatabaseEnv,
} from '@/src/server/env';

export async function POST(
  req: Request,
  context: { params: Promise<{ boardId: string }> | { boardId: string } }
) {
  try {
    validateDatabaseEnv();
    validateAdminEnv();

    if (!isValidAdminToken(req)) {
      console.warn('[superb-owl] unauthorized board reset');
      return apiError(401, 'Unauthorized.', 'UNAUTHORIZED');
    }

    const params = await resolveRouteParams(context.params);
    const boardId = boardIdSchema.parse(params.boardId);

    await resetQuarterWinners(boardId);

    return NextResponse.json({ ok: true, data: { boardId, reset: true } });
  } catch (error) {
    if (error instanceof ZodError) {
      return apiError(400, 'Invalid board id.', 'BAD_REQUEST');
    }
    if (isEnvConfigError(error)) {
      return apiError(500, error.message, error.code);
    }

    return apiError(500, 'Failed to reset board quarter winners.', 'INTERNAL');
  }
}
