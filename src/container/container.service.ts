import { Injectable, NotFoundException } from '@nestjs/common';
import Dockerode from 'dockerode';
import { getDockerClient } from '../common/docker-client';
import * as cp from 'child_process';

const docker = getDockerClient();

@Injectable()
export class ContainerService {
  async findAll() {
    const containers = await docker.listContainers({ all: true });
    return containers.map((c) => ({
      id: c.Id,
      name: c.Names?.[0]?.replace(/^\//, '') ?? '',
      image: c.Image,
      status: c.State ?? 'unknown',
      ports: (c.Ports ?? []).map((p) => ({
        host: p.PublicPort,
        container: p.PrivatePort,
        protocol: p.Type ?? 'tcp',
      })),
      created: c.Created,
      state: c.Status,
    }));
  }

  async findOne(id: string) {
    const container = docker.getContainer(id);
    const info = await container.inspect();
    return {
      id: info.Id,
      name: info.Name.replace(/^\//, ''),
      image: info.Config.Image,
      status: info.State.Status,
      ports: info.NetworkSettings?.Ports ?? {},
      env: info.Config.Env,
      mounts: info.Mounts?.map((m) => ({
        source: m.Source,
        destination: m.Destination,
        mode: m.Mode,
        rw: m.RW,
      })),
      networkSettings: info.NetworkSettings?.Networks,
    };
  }

  async start(id: string) {
    const container = docker.getContainer(id);
    await container.start();
    return { message: `Container ${id} started` };
  }

  async stop(id: string) {
    const container = docker.getContainer(id);
    await container.stop();
    return { message: `Container ${id} stopped` };
  }

  async restart(id: string) {
    const container = docker.getContainer(id);
    await container.restart();
    return { message: `Container ${id} restarted` };
  }

  async remove(id: string) {
    const container = docker.getContainer(id);
    await container.remove({ force: true });
    return { message: `Container ${id} removed` };
  }

  async stats(id: string): Promise<any> {
    const container = docker.getContainer(id);
    const stats = await container.stats({ stream: false });
    const cpuDelta =
      stats.cpu_stats.cpu_usage.total_usage -
      stats.precpu_stats.cpu_usage.total_usage;
    const systemDelta =
      stats.cpu_stats.system_cpu_usage - stats.precpu_stats.system_cpu_usage;
    const cpuPercent =
      systemDelta > 0
        ? (cpuDelta / systemDelta) * stats.cpu_stats.online_cpus * 100
        : 0;
    const memUsage = stats.memory_stats.usage ?? 0;
    const memLimit = stats.memory_stats.limit ?? 1;
    const memPercent = (memUsage / memLimit) * 100;
    return {
      cpu: Math.round(cpuPercent * 100) / 100,
      mem: Math.round(memPercent * 100) / 100,
      memUsage,
      memLimit,
      network: stats.networks,
    };
  }

  async create(data: {
    image: string;
    name?: string;
    port?: number;
    env?: Record<string, string>;
    volumes?: string[];
    cmd?: string[];
  }) {
    const createOptions: Dockerode.ContainerCreateOptions = {
      Image: data.image,
      name: data.name,
      Env: data.env
        ? Object.entries(data.env).map(([k, v]) => `${k}=${v}`)
        : undefined,
      ExposedPorts: data.port ? { [`${data.port}/tcp`]: {} } : undefined,
      HostConfig: {
        PortBindings: data.port
          ? { [`${data.port}/tcp`]: [{ HostPort: String(data.port) }] }
          : undefined,
        Binds: data.volumes,
      },
      Cmd: data.cmd,
    };
    const container = await docker.createContainer(createOptions);
    await container.start();
    const info = await container.inspect();
    return {
      id: info.Id,
      name: info.Name.replace(/^\//, ''),
      image: info.Config.Image,
      status: info.State.Status,
    };
  }

  async logs(id: string, tail = 200): Promise<string> {
    return new Promise((resolve, reject) => {
      const child = cp.spawn('docker', [
        'logs',
        '--tail',
        String(tail),
        '--timestamps',
        id,
      ]);
      let stdout = '';
      let stderr = '';
      child.stdout?.on('data', (d: Buffer) => {
        stdout += d.toString();
      });
      child.stderr?.on('data', (d: Buffer) => {
        stderr += d.toString();
      });
      child.on('close', (code) => {
        const output = stdout + stderr;
        resolve(output || 'No logs available');
      });
      child.on('error', (e) => reject(e));
    });
  }
}
