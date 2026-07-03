import { Injectable } from '@nestjs/common';
import Dockerode from 'dockerode';
import { getDockerClient } from '../common/docker-client';

const docker = getDockerClient();

@Injectable()
export class DockerService {
  async getStatus() {
    try {
      const info = await docker.info();
      return {
        running: true,
        version: info.ServerVersion,
        containers: info.Containers,
        runningContainers: info.ContainersRunning,
        images: info.Images,
        os: info.OperatingSystem,
        architecture: info.Architecture,
      };
    } catch {
      return {
        running: false,
        version: null,
        containers: 0,
        runningContainers: 0,
        images: 0,
        os: null,
        architecture: null,
      };
    }
  }

  async ping() {
    try {
      await docker.ping();
      return { alive: true };
    } catch {
      return { alive: false };
    }
  }
}
