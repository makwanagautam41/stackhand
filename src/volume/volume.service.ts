import { Injectable } from '@nestjs/common';
import { getDockerClient } from '../common/docker-client';

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
}
