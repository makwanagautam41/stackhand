import { Injectable, NotFoundException } from '@nestjs/common';
import Dockerode from 'dockerode';

const docker = new Dockerode();

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
      ports: (info.NetworkSettings?.Ports ?? {}),
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
    const cpuDelta = stats.cpu_stats.cpu_usage.total_usage - stats.precpu_stats.cpu_usage.total_usage;
    const systemDelta = stats.cpu_stats.system_cpu_usage - stats.precpu_stats.system_cpu_usage;
    const cpuPercent = systemDelta > 0 ? (cpuDelta / systemDelta) * stats.cpu_stats.online_cpus * 100 : 0;
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
}
