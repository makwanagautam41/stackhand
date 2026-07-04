import { Injectable, BadRequestException } from '@nestjs/common';
import { Observable } from 'rxjs';
import { getDockerClient } from '../common/docker-client';
import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';
import * as cp from 'child_process';

const docker = getDockerClient();
const DOCKER_HUB_API = 'https://hub.docker.com/v2';

@Injectable()
export class RegistryService {
  async search(query: string, page = 1, pageSize = 25) {
    try {
      const url = `${DOCKER_HUB_API}/search/repositories/?query=${encodeURIComponent(query)}&page=${page}&page_size=${pageSize}`;
      const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
      if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new BadRequestException(
          `Docker Hub search failed (${res.status}): ${text.slice(0, 200)}`,
        );
      }
      const data = await res.json();
      return {
        results: (data.results ?? []).map((r: any) => ({
          name: r.repo_name ?? r.name,
          namespace: r.namespace ?? 'library',
          repository: r.name ?? '',
          description: r.short_description ?? '',
          starCount: r.star_count ?? 0,
          pullCount: r.pull_count ?? 0,
          isOfficial: r.is_automated === false && r.namespace === 'library',
          isAutomated: r.is_automated ?? false,
          lastUpdated: r.last_updated ?? '',
        })),
        total: data.count ?? 0,
        page,
        pageSize,
      };
    } catch (e: any) {
      if (e instanceof BadRequestException) throw e;
      throw new BadRequestException(`Docker Hub search error: ${e.message}`);
    }
  }

  async getRepository(namespace: string, repo: string) {
    const url = `${DOCKER_HUB_API}/repositories/${namespace}/${repo}`;
    const res = await fetch(url);
    if (!res.ok)
      throw new BadRequestException(`Repository not found: ${res.statusText}`);
    const data = await res.json();

    // Also fetch tags to get latest version info
    const tagsUrl = `${DOCKER_HUB_API}/repositories/${namespace}/${repo}/tags?page_size=10&ordering=last_updated`;
    let tags: any[] = [];
    try {
      const tagsRes = await fetch(tagsUrl);
      if (tagsRes.ok) {
        const tagsData = await tagsRes.json();
        tags = (tagsData.results ?? []).slice(0, 10).map((t: any) => ({
          name: t.name,
          digest: t.digest ?? '',
          size: t.full_size ?? 0,
          architecture: t.architecture ?? '',
          os: t.os ?? '',
          lastUpdated: t.last_updated ?? '',
        }));
      }
    } catch {}

    return {
      name: data.name ?? repo,
      namespace: data.namespace ?? namespace,
      description: data.description ?? '',
      fullDescription: data.full_description ?? '',
      official: data.namespace === 'library',
      starCount: data.star_count ?? 0,
      pullCount: data.pull_count ?? 0,
      lastUpdated: data.last_updated ?? '',
      repositoryType: data.repository_type ?? '',
      repositoryUrl: `https://hub.docker.com/r/${namespace}/${repo}`,
      pullCommand: `docker pull ${namespace === 'library' ? '' : namespace + '/'}${repo}`,
      categories: data.categories ?? [],
      tags,
    };
  }

  async getTags(namespace: string, repo: string, page = 1, pageSize = 50) {
    const url = `${DOCKER_HUB_API}/repositories/${namespace}/${repo}/tags?page=${page}&page_size=${pageSize}&ordering=last_updated`;
    const res = await fetch(url);
    if (!res.ok)
      throw new BadRequestException(`Failed to fetch tags: ${res.statusText}`);
    const data = await res.json();
    return {
      results: (data.results ?? []).map((t: any) => ({
        name: t.name,
        digest: t.digest ?? '',
        size: t.full_size ?? 0,
        architecture: t.architecture ?? '',
        os: t.os ?? '',
        lastUpdated: t.last_updated ?? '',
        pullCommand: `docker pull ${namespace === 'library' ? '' : namespace + '/'}${repo}:${t.name}`,
      })),
      total: data.count ?? 0,
      page,
      pageSize,
    };
  }

  async pullImage(imageName: string) {
    return new Promise<{ message: string }>((resolve, reject) => {
      docker.pull(imageName, {}, (err: any, stream: any) => {
        if (err) return reject(err);
        (docker as any).followProgress(stream, (pullErr: any) => {
          if (pullErr) return reject(pullErr);
          resolve({ message: `Image ${imageName} pulled successfully` });
        });
      });
    });
  }

  pullImageStream(imageName: string): Observable<any> {
    return new Observable((subscriber) => {
      const child = cp.spawn('docker', ['pull', imageName], {
        stdio: ['ignore', 'pipe', 'pipe'],
      });
      let stdoutBuffer = '';
      let stderrBuffer = '';

      const parseLine = (line: string) => {
        if (!line.trim()) return;

        if (
          line.startsWith('Error') ||
          (line.includes('error') && line.includes('denied')) ||
          line.includes('authentication')
        ) {
          subscriber.next({
            type: 'error',
            data: { message: line, image: imageName },
          });
          return;
        }

        if (line.includes('Pulling from') || line.startsWith('Digest:')) {
          subscriber.next({
            type: 'progress',
            data: { id: 'meta', status: line, image: imageName },
          });
          return;
        }

        if (line.startsWith('Status:')) {
          const msg = line.replace('Status: ', '');
          subscriber.next({
            type: 'progress',
            data: { id: 'status', status: msg, image: imageName },
          });
          return;
        }

        const layerMatch = line.match(/^([a-f0-9]+):\s+(.+)$/);
        if (layerMatch) {
          const [, id, rest] = layerMatch;
          const [status, ...progressParts] = rest.split(/\s{2,}|\t/);
          subscriber.next({
            type: 'progress',
            data: {
              id,
              status: status.trim(),
              progress: progressParts.join(' ').trim() || undefined,
              image: imageName,
            },
          });
          return;
        }

        subscriber.next({
          type: 'progress',
          data: { id: 'line', status: line, image: imageName },
        });
      };

      const onData = (buffer: string, chunk: Buffer) => {
        buffer += chunk.toString();
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        for (const line of lines) {
          parseLine(line);
        }
        return buffer;
      };

      child.stdout?.on('data', (data: Buffer) => {
        stdoutBuffer = onData(stdoutBuffer, data);
      });

      child.stderr?.on('data', (data: Buffer) => {
        stderrBuffer = onData(stderrBuffer, data);
      });

      child.on('close', (code) => {
        if (stdoutBuffer.trim()) parseLine(stdoutBuffer.trim());
        if (stderrBuffer.trim()) parseLine(stderrBuffer.trim());
        if (code === 0) {
          subscriber.next({
            type: 'done',
            data: { message: `Image ${imageName} pulled successfully` },
          });
        } else {
          subscriber.next({
            type: 'error',
            data: {
              message: `docker pull exited with code ${code}`,
              image: imageName,
            },
          });
        }
        subscriber.complete();
      });

      child.on('error', (err) => {
        subscriber.next({
          type: 'error',
          data: { message: err.message, image: imageName },
        });
        subscriber.complete();
      });
    });
  }

  generateCompose(data: {
    image: string;
    name?: string;
    port?: number;
    env?: Record<string, string>;
    volumes?: string[];
  }) {
    const imageName = data.image;
    const containerName =
      data.name || imageName.split('/').pop()?.split(':')[0] || 'service';
    const port = data.port || 80;
    const env = data.env || {};
    const volumes = data.volumes || [];

    const compose: any = {
      services: {
        [containerName]: {
          image: imageName,
          container_name: containerName,
          restart: 'unless-stopped',
        },
      },
    };

    if (port) {
      compose.services[containerName].ports = [`${port}:${port}`];
    }

    if (Object.keys(env).length > 0) {
      compose.services[containerName].environment = env;
    }

    if (volumes.length > 0) {
      compose.services[containerName].volumes = volumes;
    }

    return {
      yaml: yaml.dump(compose, { indent: 2, lineWidth: -1 }),
      image: imageName,
      name: containerName,
    };
  }

  async saveToWorkspace(data: {
    workspaceRoot: string;
    folderName: string;
    yaml: string;
    description?: string;
  }) {
    const folderPath = path.join(data.workspaceRoot, data.folderName);
    if (fs.existsSync(folderPath)) {
      throw new BadRequestException('Folder already exists');
    }
    fs.mkdirSync(folderPath, { recursive: true });
    const composePath = path.join(folderPath, 'docker-compose.yml');
    fs.writeFileSync(composePath, data.yaml, 'utf-8');
    if (data.description) {
      fs.writeFileSync(
        path.join(folderPath, '.description'),
        data.description,
        'utf-8',
      );
    }
    return { message: 'Saved to workspace', path: composePath };
  }

  async getPopularSections() {
    const sections = [
      {
        title: 'Trending',
        query: 'trending',
        images: [
          {
            name: 'nginx',
            namespace: 'library',
            description: 'Official build of Nginx.',
            stars: 19243,
            pulls: '10B+',
          },
          {
            name: 'postgres',
            namespace: 'library',
            description: 'The PostgreSQL object-relational database system.',
            stars: 13102,
            pulls: '5B+',
          },
          {
            name: 'redis',
            namespace: 'library',
            description: 'Redis is an open source key-value store.',
            stars: 12432,
            pulls: '5B+',
          },
          {
            name: 'mongo',
            namespace: 'library',
            description: 'MongoDB document database.',
            stars: 9821,
            pulls: '1B+',
          },
          {
            name: 'node',
            namespace: 'library',
            description: 'Node.js JavaScript runtime.',
            stars: 11234,
            pulls: '2B+',
          },
        ],
      },
      {
        title: 'Most Pulled',
        query: 'popular',
        images: [
          {
            name: 'ubuntu',
            namespace: 'library',
            description: 'Ubuntu is a Debian-based Linux OS.',
            stars: 15234,
            pulls: '10B+',
          },
          {
            name: 'alpine',
            namespace: 'library',
            description: 'A minimal Docker image based on Alpine Linux.',
            stars: 11234,
            pulls: '10B+',
          },
          {
            name: 'python',
            namespace: 'library',
            description: 'Python is an interpreted language.',
            stars: 8921,
            pulls: '5B+',
          },
          {
            name: 'mysql',
            namespace: 'library',
            description: 'MySQL is a widely used SQL database.',
            stars: 11021,
            pulls: '5B+',
          },
          {
            name: 'debian',
            namespace: 'library',
            description: 'Debian is a Linux distribution.',
            stars: 6721,
            pulls: '5B+',
          },
        ],
      },
      {
        title: 'Databases',
        query: 'database',
        images: [
          {
            name: 'postgres',
            namespace: 'library',
            description: 'PostgreSQL database.',
            stars: 13102,
            pulls: '5B+',
          },
          {
            name: 'mysql',
            namespace: 'library',
            description: 'MySQL database.',
            stars: 11021,
            pulls: '5B+',
          },
          {
            name: 'mongo',
            namespace: 'library',
            description: 'MongoDB database.',
            stars: 9821,
            pulls: '1B+',
          },
          {
            name: 'mariadb',
            namespace: 'library',
            description: 'MariaDB database.',
            stars: 5211,
            pulls: '1B+',
          },
          {
            name: 'couchdb',
            namespace: 'library',
            description: 'CouchDB database.',
            stars: 1821,
            pulls: '500M+',
          },
        ],
      },
      {
        title: 'AI & Machine Learning',
        query: 'ai',
        images: [
          {
            name: 'tensorflow',
            namespace: 'tensorflow',
            description: 'TensorFlow ML framework.',
            stars: 3211,
            pulls: '500M+',
          },
          {
            name: 'pytorch',
            namespace: 'pytorch',
            description: 'PyTorch ML framework.',
            stars: 2891,
            pulls: '500M+',
          },
          {
            name: 'ollama',
            namespace: 'ollama',
            description: 'Run LLMs locally.',
            stars: 1891,
            pulls: '100M+',
          },
          {
            name: 'jupyter',
            namespace: 'jupyter',
            description: 'Jupyter notebooks.',
            stars: 4211,
            pulls: '500M+',
          },
        ],
      },
      {
        title: 'Monitoring',
        query: 'monitoring',
        images: [
          {
            name: 'prometheus',
            namespace: 'prom',
            description: 'Prometheus monitoring system.',
            stars: 4211,
            pulls: '500M+',
          },
          {
            name: 'grafana',
            namespace: 'grafana',
            description: 'Grafana observability platform.',
            stars: 3891,
            pulls: '1B+',
          },
          {
            name: 'node-exporter',
            namespace: 'prom',
            description: 'Prometheus node exporter.',
            stars: 1211,
            pulls: '500M+',
          },
        ],
      },
      {
        title: 'Reverse Proxies',
        query: 'proxy',
        images: [
          {
            name: 'nginx',
            namespace: 'library',
            description: 'Nginx web server and proxy.',
            stars: 19243,
            pulls: '10B+',
          },
          {
            name: 'traefik',
            namespace: 'library',
            description: 'Modern reverse proxy.',
            stars: 3891,
            pulls: '1B+',
          },
          {
            name: 'caddy',
            namespace: 'library',
            description: 'Caddy web server.',
            stars: 2211,
            pulls: '500M+',
          },
          {
            name: 'haproxy',
            namespace: 'library',
            description: 'HAProxy load balancer.',
            stars: 1891,
            pulls: '500M+',
          },
        ],
      },
    ];
    return sections;
  }
}
