import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { createPrismaClientOptions } from '../src/prisma/prisma-client';
import * as os from 'os';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient(createPrismaClientOptions());

async function main() {
  const existing = await prisma.workspace.findFirst();
  if (existing) {
    console.log('Seed skipped: workspace already exists');
    return;
  }

  const isDev = process.env.NODE_ENV === 'development';

  // Development: use project-local directory
  // Production: use DEFAULT_WORKSPACE_ROOT from .env, or fall back to ~/stacks
  const defaultRoot = isDev
    ? path.resolve(process.cwd(), 'workspaces-data', 'dev-workspace')
    : process.env.DEFAULT_WORKSPACE_ROOT || path.join(os.homedir(), 'stacks');

  if (!fs.existsSync(defaultRoot)) {
    fs.mkdirSync(defaultRoot, { recursive: true });
    console.log(`Created directory: ${defaultRoot}`);
  }

  const ws = await prisma.workspace.create({
    data: {
      name: isDev ? 'Development Workspace' : 'Default Workspace',
      description: 'Auto-created on first run',
      color: '#6366f1',
      icon: 'Server',
      rootFolderPath: defaultRoot,
    },
  });

  const mode = isDev ? 'development' : 'production';
  console.log(`[${mode}] Seeded workspace: ${ws.id} (${ws.name}) → ${defaultRoot}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

