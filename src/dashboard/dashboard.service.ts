import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as fs from 'fs';
import * as path from 'path';
import { execFile } from 'child_process';

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  async getOverview() {
    const workspaces = await this.prisma.workspace.findMany();
    const stacks = await this.prisma.stack.findMany();
    const containers = await this.prisma.container.findMany();

    const totalStacks = stacks.length;
    const runningStacks = stacks.filter((s) => s.status === 'running').length;
    const stoppedStacks = stacks.filter((s) => s.status === 'stopped').length;
    const errorStacks = stacks.filter((s) => s.status === 'error').length;
    const totalContainers = containers.length;
    const runningContainers = containers.filter((c) => c.status === 'running').length;

    const diskUsage = await this.getDiskUsage(workspaces);

    const recentActivity = await this.prisma.activity.findMany({
      orderBy: { ts: 'desc' },
      take: 20,
    });

    return {
      totalStacks,
      runningStacks,
      stoppedStacks,
      errorStacks,
      totalContainers,
      runningContainers,
      diskUsage,
      recentActivity,
    };
  }

  private async getDiskUsage(workspaces: { rootFolderPath: string }[]) {
    let totalBytes = 0;
    for (const ws of workspaces) {
      if (!ws.rootFolderPath || !fs.existsSync(ws.rootFolderPath)) continue;
      try {
        totalBytes += await this.getDirSize(ws.rootFolderPath);
      } catch {}
    }
    return totalBytes;
  }

  private getDirSize(dirPath: string): Promise<number> {
    return new Promise((resolve, reject) => {
      execFile('du', ['-sb', dirPath], (err, stdout) => {
        if (err) return reject(err);
        const size = parseInt(stdout.split('\t')[0], 10);
        resolve(isNaN(size) ? 0 : size);
      });
    });
  }
}
