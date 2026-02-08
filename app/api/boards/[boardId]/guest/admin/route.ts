import { ZodError } from 'zod';
import { apiError } from '@/src/server/api/errors';
import { resolveRouteParams } from '@/src/server/api/params';
import { boardIdSchema, guestAdminActionSchema } from '@/src/server/api/validation';
import { runGuestAdminAction } from '@/src/server/boards/repository';
import { isEnvConfigError, validateDatabaseEnv } from '@/src/server/env';

function isSuperAdmin(guestName: string) {
  return guestName.trim().toLowerCase() === 'admin adminson';
}

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

    if (!isSuperAdmin(guestName)) {
      return apiError(403, 'Admin testing actions are restricted.', 'FORBIDDEN');
    }

    let body: unknown;
    try {
      body = (await req.json()) as unknown;
    } catch {
      return apiError(400, 'Invalid JSON body.', 'BAD_REQUEST');
    }

    const parsed = guestAdminActionSchema.parse(body);
    const result = await runGuestAdminAction({ boardId, action: parsed.action });

    return Response.json({ ok: true, data: result });
  } catch (error) {
    if (error instanceof ZodError) {
      return apiError(400, 'Invalid request payload.', 'BAD_REQUEST');
    }
    if (error instanceof Error && error.message === 'OWNERS_REQUIRED') {
      return apiError(409, 'At least one board owner is required before filling blank squares.', 'CONFLICT');
    }
    if (isEnvConfigError(error)) {
      return apiError(500, error.message, error.code);
    }

    return apiError(500, 'Failed to run admin action.', 'INTERNAL');
  }
}
