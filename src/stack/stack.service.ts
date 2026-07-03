import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ActivityLogger } from '../common/activity-logger';
import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';
import { spawn } from 'child_process';
import Dockerode from 'dockerode';
import { getDockerClient } from '../common/docker-client';
import { STACK_TEMPLATES, StackTemplate } from './templates';

const docker = getDockerClient();

@Injectable()
export class StackService {
  constructor(
    private prisma: PrismaService,
    private activity: ActivityLogger,
  ) { }

  async findAll(workspaceId: string) {
    await this.ensureWorkspace(workspaceId);
    const stacks = await this.prisma.stack.findMany({
      where: { workspaceId },
      orderBy: { createdAt: 'desc' },
    });
    return Promise.all(
      stacks.map(async (s) => {
        const status = await this.resolveStatus(s);
        return { ...s, status };
      }),
    );
  }

  async findOne(id: string) {
    const stack = await this.prisma.stack.findUnique({
      where: { id },
      include: { containers: true },
    });
    if (!stack) throw new NotFoundException('Stack not found');
    const status = await this.resolveStatus(stack);
    const composePath = path.join(stack.folderPath, 'docker-compose.yml');
    let yamlContent = '';
    let services: any[] = [];
    try {
      if (fs.existsSync(composePath)) {
        yamlContent = fs.readFileSync(composePath, 'utf-8');
        const parsed: any = yaml.load(yamlContent);
        if (parsed?.services) {
          services = Object.entries(parsed.services).map(([name, svc]: [string, any]) => ({
            name,
            image: svc.image,
            ports: svc.ports,
            volumes: svc.volumes,
            environment: svc.environment,
          }));
        }
      }
    } catch { }
    return { ...stack, status, services, yaml: yamlContent };
  }

  async create(dto: { name: string; workspaceId: string; yaml: string; folderName?: string; envContent?: string }) {
    const ws = await this.ensureWorkspace(dto.workspaceId);
    if (!ws.rootFolderPath) throw new BadRequestException('Workspace has no root folder path set');

    // Auto-fix stale /home/user/ paths left from seed/onboarding defaults
    let rootFolderPath = ws.rootFolderPath;
    if (rootFolderPath.startsWith('/home/user/')) {
      const homeDir = require('os').homedir();
      rootFolderPath = rootFolderPath.replace('/home/user/', `${homeDir}/`);
      await this.prisma.workspace.update({
        where: { id: ws.id },
        data: { rootFolderPath },
      });
    }

    // Auto-create the workspace root directory if it doesn't exist yet
    if (!fs.existsSync(rootFolderPath)) {
      fs.mkdirSync(rootFolderPath, { recursive: true });
    }

    const folderName = dto.folderName || dto.name.toLowerCase().replace(/[^a-z0-9-]/g, '-');
    const folderPath = path.join(rootFolderPath, folderName);
    if (fs.existsSync(folderPath)) throw new BadRequestException('Folder already exists');
    fs.mkdirSync(folderPath, { recursive: true });
    const composePath = path.join(folderPath, 'docker-compose.yml');
    try { yaml.load(dto.yaml); } catch (e: any) { throw new BadRequestException(`Invalid YAML: ${e.message}`); }
    fs.writeFileSync(composePath, dto.yaml, 'utf-8');
    if (dto.envContent) {
      fs.writeFileSync(path.join(folderPath, '.env'), dto.envContent, 'utf-8');
    }
    const stack = await this.prisma.stack.create({
      data: { name: dto.name, workspaceId: dto.workspaceId, folderPath, status: 'stopped' },
    });
    await this.activity.log(dto.workspaceId, 'create', `stack created: ${dto.name}`);
    return stack;
  }

  async updateYaml(id: string, yamlContent: string) {
    const stack = await this.prisma.stack.findUnique({ where: { id } });
    if (!stack) throw new NotFoundException('Stack not found');
    try { yaml.load(yamlContent); } catch (e: any) { throw new BadRequestException(`Invalid YAML: ${e.message}`); }
    const composePath = path.join(stack.folderPath, 'docker-compose.yml');
    if (!fs.existsSync(composePath)) throw new BadRequestException('docker-compose.yml not found on disk');
    fs.writeFileSync(composePath, yamlContent, 'utf-8');
    await this.prisma.yamlVersion.create({
      data: { stackId: id, content: yamlContent, message: 'Updated via editor' },
    });
    await this.activity.log(stack.workspaceId, 'edit', `YAML updated: ${stack.name}`);
    return { message: 'YAML updated' };
  }

  async remove(id: string, deleteFolder = false) {
    const stack = await this.prisma.stack.findUnique({ where: { id } });
    if (!stack) throw new NotFoundException('Stack not found');
    try { await this.execCompose(stack.folderPath, 'down'); } catch { }
    if (deleteFolder && fs.existsSync(stack.folderPath)) {
      fs.rmSync(stack.folderPath, { recursive: true, force: true });
    }
    await this.prisma.stack.delete({ where: { id } });
    await this.activity.log(stack.workspaceId, 'delete', `stack removed: ${stack.name}`);
    return { message: `Stack "${stack.name}" deleted` };
  }

  async composeUp(id: string): Promise<{ stdout: string; stderr: string }> {
    const stack = await this.prisma.stack.findUnique({ where: { id } });
    if (!stack) throw new NotFoundException('Stack not found');
    const result = await this.execComposeWithOutput(stack.folderPath, 'up', ['-d']);
    await this.syncContainers(stack);
    await this.prisma.stack.update({ where: { id }, data: { status: 'running' } });
    await this.activity.log(stack.workspaceId, 'start', `stack started: ${stack.name}`);
    return result;
  }

  async composeDown(id: string): Promise<{ stdout: string; stderr: string }> {
    const stack = await this.prisma.stack.findUnique({ where: { id } });
    if (!stack) throw new NotFoundException('Stack not found');
    const result = await this.execComposeWithOutput(stack.folderPath, 'down');
    await this.prisma.container.updateMany({ where: { stackId: id }, data: { status: 'stopped' } });
    await this.prisma.stack.update({ where: { id }, data: { status: 'stopped' } });
    await this.activity.log(stack.workspaceId, 'stop', `stack stopped: ${stack.name}`);
    return result;
  }

  async composeRestart(id: string): Promise<{ stdout: string; stderr: string }> {
    const stack = await this.prisma.stack.findUnique({ where: { id } });
    if (!stack) throw new NotFoundException('Stack not found');
    await this.execCompose(stack.folderPath, 'down');
    const result = await this.execComposeWithOutput(stack.folderPath, 'up', ['-d']);
    await this.syncContainers(stack);
    await this.prisma.stack.update({ where: { id }, data: { status: 'running' } });
    await this.activity.log(stack.workspaceId, 'restart', `stack restarted: ${stack.name}`);
    return result;
  }

  async getLogs(id: string, tail = 200) {
    const stack = await this.prisma.stack.findUnique({ where: { id } });
    if (!stack) throw new NotFoundException('Stack not found');
    return this.execComposeWithOutput(stack.folderPath, 'logs', ['--tail', String(tail)]);
  }

  async getTemplates() {
    return STACK_TEMPLATES.map((t) => ({
      id: t.id,
      name: t.name,
      description: t.description,
      yaml: t.yaml,
      params: t.params,
    }));
  }

  async generateFromTemplate(templateId: string, overrides: Record<string, string>) {
    const tpl = STACK_TEMPLATES.find((t) => t.id === templateId);
    if (!tpl) throw new NotFoundException('Template not found');
    let yamlStr = tpl.yaml;
    for (const [k, v] of Object.entries(overrides)) {
      yamlStr = yamlStr.replace(new RegExp(`\\{\\{${k}\\}\\}`, 'g'), v);
    }
    for (const param of tpl.params.envVars ?? []) {
      yamlStr = yamlStr.replace(new RegExp(`\\{\\{${param.key}\\}\\}`, 'g'), overrides[param.key] ?? param.value);
    }
    return { yaml: yamlStr, template: tpl.name };
  }

  getComposeChild(folderPath: string, cmd: string, args: string[] = []) {
    const composeFile = path.join(folderPath, 'docker-compose.yml');
    if (!fs.existsSync(composeFile)) throw new Error('docker-compose.yml not found');
    return spawn('docker', ['compose', '-f', composeFile, cmd, ...args], { cwd: folderPath });
  }

  private async resolveStatus(stack: { id: string; folderPath: string }) {
    const containers = await this.prisma.container.findMany({ where: { stackId: stack.id } });
    if (containers.length === 0) {
      const composeFile = path.join(stack.folderPath, 'docker-compose.yml');
      if (fs.existsSync(composeFile)) return 'stopped';
      return 'unknown';
    }
    const running = containers.filter((c) => c.status === 'running').length;
    const total = containers.length;
    if (running === total) return 'running';
    if (running === 0) return 'stopped';
    if (containers.some((c) => c.status === 'error')) return 'error';
    return 'partial';
  }

  private async syncContainers(stack: { id: string; name: string; folderPath: string }) {
    try {
      // Docker Compose sets project name = folder basename (lowercased)
      const projectName = path.basename(stack.folderPath).toLowerCase();
      const dockerContainers = await docker.listContainers({ all: true });
      const stackContainers = dockerContainers.filter((c) => {
        const proj = c.Labels?.['com.docker.compose.project'] ?? '';
        return proj === projectName || proj === stack.name.toLowerCase();
      });
      for (const dc of stackContainers) {
        const name = dc.Names?.[0]?.replace(/^\//, '') ?? '';
        const dockerId = dc.Id;
        const existing = await this.prisma.container.findUnique({ where: { dockerId } });
        const data = { name, image: dc.Image, status: dc.State ?? 'unknown', stackId: stack.id };
        if (existing) {
          await this.prisma.container.update({ where: { dockerId }, data: { status: dc.State ?? 'unknown' } });
        } else {
          await this.prisma.container.create({ data: { ...data, dockerId } });
        }
      }
    } catch { }
  }

  private execComposeWithOutput(folderPath: string, cmd: string, args: string[] = []): Promise<{ stdout: string; stderr: string }> {
    return new Promise((resolve, reject) => {
      const child = spawn('docker', ['compose', '-f', path.join(folderPath, 'docker-compose.yml'), cmd, ...args], {
        cwd: folderPath,
      });
      let stdout = '';
      let stderr = '';
      child.stdout?.on('data', (d: Buffer) => { stdout += d.toString(); });
      child.stderr?.on('data', (d: Buffer) => { stderr += d.toString(); });
      child.on('close', (code) => {
        // docker compose writes normal progress to stderr even on success.
        // Only reject if exit code is non-zero AND we have a meaningful error message.
        if (code === 0) {
          resolve({ stdout, stderr });
        } else {
          const msg = stderr.trim() || stdout.trim() || `Command exited with code ${code}`;
          reject(new Error(msg));
        }
      });
      child.on('error', (e) => reject(e));
    });
  }

  private execCompose(folderPath: string, cmd: string, args: string[] = []): Promise<void> {
    return this.execComposeWithOutput(folderPath, cmd, args).then(() => { });
  }

  private async ensureWorkspace(id: string) {
    const ws = await this.prisma.workspace.findUnique({ where: { id } });
    if (!ws) throw new NotFoundException('Workspace not found');
    return ws;
  }
}
