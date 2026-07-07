import Dockerode from 'dockerode';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

let cachedSocketPath: string | null = null;
let cachedClient: Dockerode | null = null;

function resolveDockerSocket(): string | undefined {
  if (process.env.DOCKER_HOST) return undefined;
  if (cachedSocketPath) return cachedSocketPath;

  const candidates = [
    path.join(os.homedir(), '.docker', 'desktop', 'docker.sock'),
    '/run/user/' + os.userInfo().uid + '/docker.sock',
    '/var/run/docker.sock',
  ];

  for (const sock of candidates) {
    try {
      fs.accessSync(sock, fs.constants.R_OK);
      cachedSocketPath = sock;
      return sock;
    } catch {}
  }
  cachedSocketPath = null;
  return undefined;
}

let dockerOpts: Dockerode.DockerOptions = {};

export function getDockerClient(): Dockerode {
  if (cachedClient) return cachedClient;
  const socketPath = resolveDockerSocket();
  if (socketPath) {
    dockerOpts = { socketPath };
  }
  cachedClient = new Dockerode(dockerOpts);
  return cachedClient;
}

export function resetDockerClient(): void {
  cachedClient = null;
}
