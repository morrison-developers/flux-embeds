let hasWarnedMissingEnv = false;

export class EnvConfigError extends Error {
  code = 'CONFIG_ERROR' as const;
}

export function getRequiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new EnvConfigError(`Missing required environment variable: ${name}`);
  }
  return value;
}

export function validateDatabaseEnv() {
  getRequiredEnv('DATABASE_URL');
}

export function hasDatabaseEnv() {
  return Boolean(process.env.DATABASE_URL);
}

export function validateAdminEnv() {
  getRequiredEnv('SUPERBOWL_ADMIN_TOKEN');
}

export function isEnvConfigError(error: unknown): error is EnvConfigError {
  return error instanceof EnvConfigError;
}

export function warnMissingOptionalEnv() {
  if (hasWarnedMissingEnv) return;
  hasWarnedMissingEnv = true;

  if (!process.env.SUPERBOWL_DEFAULT_GAME_ID) {
    console.warn('[superb-owl] SUPERBOWL_DEFAULT_GAME_ID not set. Auto-discovery will be used.');
  }
}
