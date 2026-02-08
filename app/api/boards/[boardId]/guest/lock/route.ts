import { ZodError } from 'zod';
import { apiError } from '@/src/server/api/errors';
import { resolveRouteParams } from '@/src/server/api/params';
import { boardIdSchema } from '@/src/server/api/validation';
import { lockGuestPicks } from '@/src/server/boards/repository';
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

    try {
      const owner = await lockGuestPicks({ boardId, guestName });
      return Response.json({ ok: true, data: owner });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to lock picks.';
      if (message === 'OWNER_NOT_FOUND') {
        return apiError(404, 'Owner not found for guest.', 'OWNER_NOT_FOUND');
      }
      if (message === 'PICKS_INCOMPLETE') {
        return apiError(409, 'You must place all picks before locking.', 'PICKS_INCOMPLETE');
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

    return apiError(500, 'Failed to lock picks.', 'INTERNAL');
  }
}
