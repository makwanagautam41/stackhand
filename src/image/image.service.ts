import { Injectable } from '@nestjs/common';
import Dockerode from 'dockerode';
import { getDockerClient } from '../common/docker-client';

const docker = getDockerClient();

@Injectable()
export class ImageService {
  async findAll() {
    const images = await docker.listImages({ all: true });
    return images.map((i) => ({
      id: i.Id,
      tags: i.RepoTags,
      created: i.Created,
      size: i.Size,
    }));
  }

  async searchDockerHub(query: string) {
    const url = `https://hub.docker.com/v2/search/repositories/?query=${encodeURIComponent(query)}&page_size=24`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Docker Hub search failed: ${res.statusText}`);
    const data = await res.json();
    return (data.results ?? []).map((r: any) => ({
      name: r.name,
      namespace: r.namespace ?? 'library',
      description: r.description ?? '',
      stars: r.star_count ?? 0,
      pulls: r.pull_count ?? 0,
      official: r.is_official ?? false,
    }));
  }

  async pullImage(name: string) {
    return new Promise<{ message: string }>((resolve, reject) => {
      docker.pull(name, {}, (err: any, stream: any) => {
        if (err) return reject(err);
        (docker as any).followProgress(stream, (pullErr: any) => {
          if (pullErr) return reject(pullErr);
          resolve({ message: `Image ${name} pulled successfully` });
        });
      });
    });
  }

  async removeImage(name: string) {
    const image = docker.getImage(name);
    await image.remove();
    return { message: `Image ${name} removed` };
  }

  async getTags(namespace: string, name: string) {
    const url = `https://hub.docker.com/v2/repositories/${namespace}/${name}/tags/?page_size=25&ordering=last_updated`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Failed to fetch tags: ${res.statusText}`);
    const data = await res.json();
    return (data.results ?? []).map((t: any) => t.name);
  }
}
