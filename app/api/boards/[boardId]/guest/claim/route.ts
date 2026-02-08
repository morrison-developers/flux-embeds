import { ZodError } from 'zod';
import { apiError } from '@/src/server/api/errors';
import { resolveRouteParams } from '@/src/server/api/params';
import { boardIdSchema, guestClaimSchema } from '@/src/server/api/validation';
import { claimGuestOwner } from '@/src/server/boards/repository';
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

    const parsed = guestClaimSchema.parse(body);

    try {
      const owner = await claimGuestOwner({
        boardId,
        guestName,
        initials: parsed.initials,
        bgColor: parsed.bgColor,
        textColor: parsed.textColor,
      });
      return Response.json({ ok: true, data: owner });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to claim owner.';
      if (message === 'BOARD_OWNER_LIMIT_REACHED') {
        return apiError(409, 'Board owner limit (6) reached.', 'OWNER_LIMIT_REACHED');
      }
      if (message === 'OWNER_INITIALS_TAKEN') {
        return apiError(409, 'Initials already taken.', 'INITIALS_TAKEN');
      }
      if (message === 'ADMIN_OWNER_FORBIDDEN') {
        return apiError(403, 'Admin user cannot claim an owner slot.', 'FORBIDDEN');
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

    return apiError(500, 'Failed to claim owner.', 'INTERNAL');
  }
}
