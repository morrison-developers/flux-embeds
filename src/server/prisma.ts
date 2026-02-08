import { PrismaClient } from '@prisma/client';
import { logResolvedDatabaseEnv, resolveDatabaseEnv } from '@/src/server/env';

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

resolveDatabaseEnv();
logResolvedDatabaseEnv();

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
