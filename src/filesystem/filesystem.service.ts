import { Injectable, BadRequestException } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';
import { resolveSafePath } from '../common/resolve-path';

@Injectable()
export class FilesystemService {
  browse(basePath: string, subPath?: string) {
    const target = subPath ? resolveSafePath(basePath, subPath) : path.resolve(basePath);
    this.ensureExists(target);
    const entries = fs.readdirSync(target, { withFileTypes: true });
    return entries.map((e) => {
      const full = path.join(target, e.name);
      const stat = fs.statSync(full);
      return {
        name: e.name,
        type: e.isDirectory() ? 'directory' : 'file',
        size: e.isFile() ? stat.size : 0,
        modifiedAt: stat.mtime,
      };
    });
  }

  getTree(basePath: string, subPath?: string) {
    const target = subPath ? resolveSafePath(basePath, subPath) : path.resolve(basePath);
    if (!fs.existsSync(target)) return null;

    const buildTree = (currentPath: string): any => {
      const stat = fs.statSync(currentPath);
      const name = path.basename(currentPath);
      const isDir = stat.isDirectory();
      
      const node: any = {
        id: Buffer.from(currentPath).toString('base64'),
        path: currentPath,
        name: name,
        isDir: isDir,
        content: '',
      };

      if (isDir) {
        const entries = fs.readdirSync(currentPath, { withFileTypes: true });
        node.children = entries
          .filter(e => e.name !== '.git' && e.name !== 'node_modules')
          .map(e => buildTree(path.join(currentPath, e.name)));
      } else {
        try {
          node.content = fs.readFileSync(currentPath, 'utf-8');
        } catch {
          node.content = 'Binary or unsupported file';
        }
      }
      return node;
    };

    return buildTree(target);
  }

  readFile(filePath: string) {
    this.ensureExists(filePath);
    const content = fs.readFileSync(filePath, 'utf-8');
    return { path: filePath, content };
  }

  writeFile(filePath: string, content: string) {
    const ext = path.extname(filePath).toLowerCase();
    if (ext === '.yml' || ext === '.yaml') {
      try {
        yaml.load(content);
      } catch (e: any) {
        throw new BadRequestException(`YAML validation error: ${e.message}`);
      }
    }
    fs.writeFileSync(filePath, content, 'utf-8');
    return { path: filePath, content };
  }

  createFolder(parentPath: string, name: string) {
    const target = resolveSafePath(parentPath, name);
    if (fs.existsSync(target)) {
      throw new BadRequestException('Folder or file already exists');
    }
    fs.mkdirSync(target, { recursive: true });
    return { path: target, name };
  }

  rename(oldPath: string, newName: string) {
    this.ensureExists(oldPath);
    const dir = path.dirname(oldPath);
    const newPath = path.join(dir, newName);
    if (fs.existsSync(newPath)) {
      throw new BadRequestException('Target name already exists');
    }
    fs.renameSync(oldPath, newPath);
    return { oldPath, newPath };
  }

  delete(targetPath: string) {
    this.ensureExists(targetPath);
    const stat = fs.statSync(targetPath);
    if (stat.isDirectory()) {
      fs.rmSync(targetPath, { recursive: true, force: true });
    } else {
      fs.unlinkSync(targetPath);
    }
    return { deleted: targetPath };
  }

  duplicate(filePath: string) {
    this.ensureExists(filePath);
    const dir = path.dirname(filePath);
    const ext = path.extname(filePath);
    const base = path.basename(filePath, ext);
    let copyPath = path.join(dir, `${base}-copy${ext}`);
    let idx = 1;
    while (fs.existsSync(copyPath)) {
      copyPath = path.join(dir, `${base}-copy-${idx}${ext}`);
      idx++;
    }
    fs.copyFileSync(filePath, copyPath);
    return { original: filePath, copy: copyPath };
  }

  private ensureExists(p: string) {
    if (!fs.existsSync(p)) {
      throw new BadRequestException(`Path does not exist: ${p}`);
    }
  }
}