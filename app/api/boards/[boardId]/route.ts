import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { isValidAdminToken } from '@/src/server/api/auth';
import { apiError } from '@/src/server/api/errors';
import { resolveRouteParams } from '@/src/server/api/params';
import { boardIdSchema, boardPatchSchema } from '@/src/server/api/validation';
import { getOrCreateBoard, patchBoard } from '@/src/server/boards/repository';
import {
  isEnvConfigError,
  validateAdminEnv,
  validateDatabaseEnv,
  warnMissingOptionalEnv,
} from '@/src/server/env';

export async function GET(
  _req: Request,
  context: { params: Promise<{ boardId: string }> | { boardId: string } }
) {
  try {
    validateDatabaseEnv();
    warnMissingOptionalEnv();

    const params = await resolveRouteParams(context.params);
    const boardId = boardIdSchema.parse(params.boardId);

    const board = await getOrCreateBoard(boardId);
    return NextResponse.json({ ok: true, data: board });
  } catch (error) {
    if (error instanceof ZodError) {
      return apiError(400, 'Invalid board id.', 'BAD_REQUEST');
    }
    if (isEnvConfigError(error)) {
      return apiError(500, error.message, error.code);
    }

    return apiError(500, 'Failed to load board.', 'INTERNAL');
  }
}

export async function PATCH(
  req: Request,
  context: { params: Promise<{ boardId: string }> | { boardId: string } }
) {
  try {
    validateDatabaseEnv();
    validateAdminEnv();

    if (!isValidAdminToken(req)) {
      console.warn('[superb-owl] unauthorized board patch');
      return apiError(401, 'Unauthorized.', 'UNAUTHORIZED');
    }

    const params = await resolveRouteParams(context.params);
    const boardId = boardIdSchema.parse(params.boardId);

    let body: unknown;
    try {
      body = (await req.json()) as unknown;
    } catch {
      return apiError(400, 'Invalid JSON body.', 'BAD_REQUEST');
    }
    const input = boardPatchSchema.parse(body);

    const board = await patchBoard(boardId, input);
    return NextResponse.json({ ok: true, data: board });
  } catch (error) {
    if (error instanceof ZodError) {
      return apiError(400, 'Invalid request payload.', 'BAD_REQUEST');
    }
    if (isEnvConfigError(error)) {
      return apiError(500, error.message, error.code);
    }

    return apiError(500, 'Failed to update board.', 'INTERNAL');
  }
}
