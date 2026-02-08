import { getRequiredEnv } from '@/src/server/env';

export function isValidAdminToken(req: Request): boolean {
  const expected = getRequiredEnv('SUPERBOWL_ADMIN_TOKEN');
  const provided = req.headers.get('x-admin-token');
  return Boolean(provided && provided === expected);
}
