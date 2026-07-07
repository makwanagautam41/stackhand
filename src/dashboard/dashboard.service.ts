import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as fs from 'fs';
import * as path from 'path';
import { execFile } from 'child_process';
import * as os from 'os';

const CACHE_TTL = 5000;
let overviewCache: { data: any; ts: number } | null = null;

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  async getOverview() {
    const now = Date.now();
    if (overviewCache && now - overviewCache.ts < CACHE_TTL) {
      return overviewCache.data;
    }

    const [workspaces, stacks, containers, recentActivity] = await Promise.all([
      this.prisma.workspace.findMany(),
      this.prisma.stack.findMany(),
      this.prisma.container.findMany(),
      this.prisma.activity.findMany({
        orderBy: { ts: 'desc' },
        take: 20,
      }),
    ]);

    let runningStacks = 0;
    let stoppedStacks = 0;
    let errorStacks = 0;
    for (const s of stacks) {
      if (s.status === 'running') runningStacks++;
      else if (s.status === 'stopped') stoppedStacks++;
      else if (s.status === 'error') errorStacks++;
    }

    let runningContainers = 0;
    for (const c of containers) {
      if (c.status === 'running') runningContainers++;
    }

    const diskUsage = await this.getDiskUsage(workspaces);

    const data = {
      totalStacks: stacks.length,
      runningStacks,
      stoppedStacks,
      errorStacks,
      totalContainers: containers.length,
      runningContainers,
      diskUsage,
      recentActivity,
    };

    overviewCache = { data, ts: now };
    return data;
  }

  private async getDiskUsage(workspaces: { rootFolderPath: string }[]) {
    const validPaths = workspaces
      .map((ws) => ws.rootFolderPath)
      .filter((p) => p);
    if (validPaths.length === 0) return 0;

    if (validPaths.length === 1) {
      return this.getDirSize(validPaths[0]);
    }

    const results = await Promise.allSettled(
      validPaths.map((p) => this.getDirSize(p)),
    );
    return results.reduce(
      (sum, r) => (r.status === 'fulfilled' ? sum + r.value : sum),
      0,
    );
  }

  private getDirSize(dirPath: string): Promise<number> {
    return new Promise((resolve) => {
      try {
        if (!fs.existsSync(dirPath)) return resolve(0);
      } catch { return resolve(0); }
      execFile('du', ['-sb', dirPath], { timeout: 10000 }, (err, stdout) => {
        if (err) return resolve(0);
        const size = parseInt(stdout.split('\t')[0], 10);
        resolve(isNaN(size) ? 0 : size);
      });
    });
  }
}
