import { ZodError } from 'zod';
import { apiError } from '@/src/server/api/errors';
import { resolveRouteParams } from '@/src/server/api/params';
import { boardIdSchema, guestPickSchema } from '@/src/server/api/validation';
import { setGuestPick } from '@/src/server/boards/repository';
import { isEnvConfigError, validateDatabaseEnv } from '@/src/server/env';

export async function POST(
  req: Request,
  context: { params: Promise<{ boardId: string }> | { boardId: string } }
) {
  try {
    validateDatabaseEnv();

    const params = await resolveRouteParams(context.params);
    const boardId = boardIdSchema.parse(params.boardId);

    const guestName = (req.headers.get('x-superbowl-guest-name') ?? '').trim();
    if (!guestName) {
      return apiError(401, 'Guest authentication required.', 'UNAUTHORIZED');
    }

    let body: unknown;
    try {
      body = (await req.json()) as unknown;
    } catch {
      return apiError(400, 'Invalid JSON body.', 'BAD_REQUEST');
    }

    const parsed = guestPickSchema.parse(body);

    try {
      await setGuestPick({
        boardId,
        guestName,
        row: parsed.row,
        col: parsed.col,
        selected: parsed.selected,
      });
      return Response.json({ ok: true, data: { boardId, ...parsed } });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update pick.';
      if (message === 'OWNER_NOT_FOUND') {
        return apiError(404, 'Owner not found for guest.', 'OWNER_NOT_FOUND');
      }
      if (message === 'CELL_TAKEN') {
        return apiError(409, 'Cell is already taken.', 'CELL_TAKEN');
      }
      if (message === 'PICK_LIMIT_REACHED') {
        return apiError(409, 'Pick limit reached for this guest.', 'PICK_LIMIT_REACHED');
      }
      if (message === 'PICKS_LOCKED') {
        return apiError(409, 'Picks are locked and can no longer be changed.', 'PICKS_LOCKED');
      }
      if (message === 'INVALID_CELL') {
        return apiError(400, 'Invalid cell coordinates.', 'BAD_REQUEST');
      }
      throw error;
    }
  } catch (error) {
    if (error instanceof ZodError) {
      return apiError(400, 'Invalid request payload.', 'BAD_REQUEST');
    }
    if (isEnvConfigError(error)) {
      return apiError(500, error.message, error.code);
    }

    return apiError(500, 'Failed to update guest pick.', 'INTERNAL');
  }
}
