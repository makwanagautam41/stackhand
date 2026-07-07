import { PrismaClient, type Prisma } from '@prisma/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import * as fs from 'fs';
import * as path from 'path';

function resolveSqliteUrl(
  databaseUrl = process.env.DATABASE_URL ||
    'file:./workspaces-data/stackhand.db',
): string {
  // Strip any query parameters (e.g. ?journal_mode=WAL) — better-sqlite3
  // does not understand URL query strings and treats them as part of the filename.
  const raw = databaseUrl.replace(/^file:/, '').split('?')[0];
  if (path.isAbsolute(raw)) {
    return raw;
  }
  return path.resolve(process.cwd(), raw);
}

export function createPrismaClient() {
  return new PrismaClient(createPrismaClientOptions());
}

export function createPrismaClientOptions(): Prisma.PrismaClientOptions {
  const dbPath = resolveSqliteUrl();
  try {
    fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  } catch {}
  return {
    adapter: new PrismaBetterSqlite3({ url: dbPath }),
  };
}
