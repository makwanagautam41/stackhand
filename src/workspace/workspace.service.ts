import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ActivityLogger } from '../common/activity-logger';
import { CreateWorkspaceDto, UpdateWorkspaceDto } from './dto';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class WorkspaceService {
  constructor(
    private prisma: PrismaService,
    private activity: ActivityLogger,
  ) {}

  async findAll() {
    return this.prisma.workspace.findMany({ orderBy: { createdAt: 'desc' } });
  }

  async findOne(id: string) {
    const ws = await this.prisma.workspace.findUnique({ where: { id } });
    if (!ws) throw new NotFoundException('Workspace not found');
    return ws;
  }

  async create(dto: CreateWorkspaceDto) {
    const ws = await this.prisma.workspace.create({
      data: {
        name: dto.name,
        description: dto.description,
        color: dto.color ?? '#6366f1',
        icon: dto.icon ?? 'Server',
        rootFolderPath: dto.rootFolderPath ?? '',
      },
    });
    await this.activity.log(ws.id, 'create', `workspace created: ${ws.name}`);
    return ws;
  }

  async update(id: string, dto: UpdateWorkspaceDto) {
    await this.findOne(id);
    const ws = await this.prisma.workspace.update({ where: { id }, data: dto });
    await this.activity.log(id, 'edit', `workspace updated: ${ws.name}`);
    return ws;
  }

  async remove(id: string, alsoDeleteFolder?: boolean) {
    const ws = await this.findOne(id);
    if (alsoDeleteFolder && ws.rootFolderPath) {
      const fp = path.resolve(ws.rootFolderPath);
      if (fs.existsSync(fp)) {
        fs.rmSync(fp, { recursive: true, force: true });
      }
    }
    const name = ws.name;
    await this.prisma.workspace.delete({ where: { id } });
    return { message: `Workspace "${name}" deleted` };
  }

  async validatePath(pathToCheck: string) {
    const resolved = path.resolve(pathToCheck);
    try {
      const stat = fs.statSync(resolved);
      return { valid: stat.isDirectory(), path: resolved };
    } catch {
      return { valid: false, path: resolved, error: 'Path does not exist or is not accessible' };
    }
  }
}