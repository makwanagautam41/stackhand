import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { getDockerClient } from '../common/docker-client';
import * as fs from 'fs';
import * as path from 'path';

const docker = getDockerClient();

@Injectable()
export class VolumeService {
  async findAll() {
    const info: any = await docker.listVolumes();
    const volumes = info.Volumes ?? [];
    return volumes.map((v: any) => ({
      name: v.Name,
      driver: v.Driver,
      mountpoint: v.Mountpoint,
      scope: v.Scope,
      size: v.UsageData?.Size ?? 0,
      refCount: v.UsageData?.RefCount ?? 0,
      created: v.CreatedAt ?? '',
      labels: v.Labels ?? {},
    }));
  }

  async findOne(name: string) {
    const volume = docker.getVolume(name);
    const info: any = await volume.inspect();
    return {
      name: info.Name,
      driver: info.Driver,
      mountpoint: info.Mountpoint,
      scope: info.Scope,
      size: info.UsageData?.Size ?? 0,
      refCount: info.UsageData?.RefCount ?? 0,
      created: info.CreatedAt ?? '',
      labels: info.Labels ?? {},
      status: info.Status ?? {},
    };
  }

  async remove(name: string) {
    const volume = docker.getVolume(name);
    await volume.remove();
    return { message: `Volume ${name} removed` };
  }

  async prune() {
    const result: any = await docker.pruneVolumes();
    return { message: 'Volumes pruned', reclaimed: result.SpaceReclaimed ?? 0 };
  }

  async browseFiles(name: string, subPath?: string) {
    const volume = docker.getVolume(name);
    const info: any = await volume.inspect();
    const mountpoint = info.Mountpoint;
    if (!mountpoint) {
      throw new NotFoundException(`Volume mountpoint not found for ${name}`);
    }
    if (!fs.existsSync(mountpoint)) {
      return { error: 'Mountpoint does not exist on disk', files: [] };
    }
    try {
      fs.accessSync(mountpoint, fs.constants.R_OK);
    } catch {
      return {
        error: 'Permission denied accessing volume mountpoint',
        files: [],
      };
    }

    const targetDir = subPath ? path.join(mountpoint, subPath) : mountpoint;
    const resolved = path.resolve(targetDir);
    if (!resolved.startsWith(mountpoint)) {
      throw new BadRequestException('Invalid path');
    }
    if (!fs.existsSync(resolved)) {
      throw new NotFoundException('Path not found');
    }

    const entries = fs.readdirSync(resolved, { withFileTypes: true });
    return {
      files: entries.map((entry) => {
        const fullPath = path.join(resolved, entry.name);
        const stat = fs.statSync(fullPath);
        return {
          name: entry.name,
          path: fullPath.replace(mountpoint, '').replace(/^\//, ''),
          type: entry.isDirectory() ? 'directory' : 'file',
          size: entry.isFile() ? stat.size : 0,
          mode: stat.mode.toString(8).slice(-3),
          modifiedAt: stat.mtime.toISOString(),
          createdAt: stat.birthtime.toISOString(),
        };
      }),
    };
  }

  async readFile(name: string, filePath: string) {
    const volume = docker.getVolume(name);
    const info: any = await volume.inspect();
    const mountpoint = info.Mountpoint;
    if (!mountpoint) {
      throw new NotFoundException('Volume mountpoint not found');
    }
    if (!fs.existsSync(mountpoint)) {
      throw new NotFoundException('Volume mountpoint does not exist on disk');
    }
    try {
      fs.accessSync(mountpoint, fs.constants.R_OK);
    } catch {
      throw new NotFoundException(
        'Permission denied: cannot read volume mountpoint',
      );
    }

    const fullPath = path.resolve(path.join(mountpoint, filePath));
    if (!fullPath.startsWith(mountpoint)) {
      throw new BadRequestException('Invalid file path');
    }
    if (!fs.existsSync(fullPath)) {
      throw new NotFoundException('File not found');
    }
    if (fs.statSync(fullPath).isDirectory()) {
      throw new BadRequestException('Path is a directory, not a file');
    }

    try {
      const content = fs.readFileSync(fullPath, 'utf-8');
      return { path: filePath, content, size: Buffer.byteLength(content) };
    } catch {
      return {
        path: filePath,
        content: '(binary file)',
        size: fs.statSync(fullPath).size,
      };
    }
  }

  async getUsage(volumeName: string) {
    const volume = docker.getVolume(volumeName);
    const info: any = await volume.inspect();
    const mountpoint = info.Mountpoint;
    if (!mountpoint) {
      return { totalFiles: 0, totalSize: 0, mountpoint: '' };
    }
    if (!fs.existsSync(mountpoint)) {
      return {
        totalFiles: 0,
        totalSize: 0,
        mountpoint,
        error: 'Mountpoint does not exist',
      };
    }
    const stats = this.getDirStats(mountpoint);
    return { ...stats, mountpoint };
  }

  private getDirStats(dir: string): { totalFiles: number; totalSize: number } {
    let totalFiles = 0;
    let totalSize = 0;
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        try {
          if (entry.isDirectory()) {
            const sub = this.getDirStats(fullPath);
            totalFiles += sub.totalFiles;
            totalSize += sub.totalSize;
          } else {
            totalFiles++;
            totalSize += fs.statSync(fullPath).size;
          }
        } catch {}
      }
    } catch {}
    return { totalFiles, totalSize };
  }
}
