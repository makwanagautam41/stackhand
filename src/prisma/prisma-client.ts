import { PrismaClient } from '@prisma/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import * as fs from 'fs';
import * as path from 'path';

function resolveSqliteUrl(
  databaseUrl = process.env.DATABASE_URL ||
    'file:./workspaces-data/stackhand.db',
) {
  const raw = databaseUrl.replace(/^file:/, '');
  if (path.isAbsolute(raw)) {
    return `file:${raw}`;
  }
  return `file:${path.resolve(process.cwd(), raw)}`;
}

export function createPrismaClient() {
  return new PrismaClient(createPrismaClientOptions());
}

export function createPrismaClientOptions() {
  const url = resolveSqliteUrl();
  fs.mkdirSync(path.dirname(url.replace(/^file:/, '')), { recursive: true });
  return { adapter: new PrismaBetterSqlite3({ url }) };
}
