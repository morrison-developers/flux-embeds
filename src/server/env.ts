let hasWarnedMissingEnv = false;
let hasLoggedResolvedDbEnv = false;

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

function getFirstDefinedEnvWithName(names: string[]) {
  for (const name of names) {
    const value = process.env[name];
    if (value) return { name, value };
  }
  return undefined;
}

export function resolveDatabaseEnv() {
  const databaseUrlSource = getFirstDefinedEnvWithName([
    'DATABASE_URL',
    'POSTGRES_URL',
    'POSTGRES_PRISMA_URL',
  ]);
  if (databaseUrlSource?.value && !process.env.DATABASE_URL) {
    process.env.DATABASE_URL = databaseUrlSource.value;
  }

  const directUrlSource = getFirstDefinedEnvWithName([
    'DIRECT_URL',
    'POSTGRES_URL_NON_POOLING',
    'POSTGRES_URL',
  ]);
  if (directUrlSource?.value && !process.env.DIRECT_URL) {
    process.env.DIRECT_URL = directUrlSource.value;
  }

  return {
    databaseUrl: process.env.DATABASE_URL,
    directUrl: process.env.DIRECT_URL,
    databaseUrlSource: databaseUrlSource?.name ?? null,
    directUrlSource: directUrlSource?.name ?? null,
  };
}

export function validateDatabaseEnv() {
  const resolved = resolveDatabaseEnv();
  if (!resolved.databaseUrl) {
    throw new EnvConfigError(
      'Missing required database URL. Set DATABASE_URL or one of POSTGRES_URL / POSTGRES_PRISMA_URL.'
    );
  }
}

export function hasDatabaseEnv() {
  return Boolean(resolveDatabaseEnv().databaseUrl);
}

export function logResolvedDatabaseEnv() {
  if (hasLoggedResolvedDbEnv) return;
  hasLoggedResolvedDbEnv = true;

  const resolved = resolveDatabaseEnv();
  console.info(
    `[db] Resolved DB env vars: DATABASE_URL <- ${resolved.databaseUrlSource ?? 'missing'}, DIRECT_URL <- ${resolved.directUrlSource ?? 'missing'}`
  );
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
