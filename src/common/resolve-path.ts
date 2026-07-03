import * as path from 'path';
import * as fs from 'fs';

export function resolveSafePath(basePath: string, userPath: string): string {
  const resolved = path.resolve(basePath, userPath);
  const normalizedBase = path.resolve(basePath);
  if (!resolved.startsWith(normalizedBase)) {
    throw new Error('Path traversal detected: resolved path escapes allowed root');
  }
  return resolved;
}

export function assertPathExists(filePath: string): void {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Path does not exist: ${filePath}`);
  }
}

export function assertIsYamlFile(filePath: string): void {
  const ext = path.extname(filePath).toLowerCase();
  if (ext !== '.yml' && ext !== '.yaml') {
    throw new Error(`Only .yml/.yaml files are allowed, got: ${ext}`);
  }
}