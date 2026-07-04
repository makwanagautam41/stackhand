import Dockerode from 'dockerode';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

export function getDockerClient(): Dockerode {
  let dockerOpts: Dockerode.DockerOptions = {};
  if (!process.env.DOCKER_HOST) {
    const desktopSock = path.join(
      os.homedir(),
      '.docker',
      'desktop',
      'docker.sock',
    );
    const rootlessSock = '/run/user/' + os.userInfo().uid + '/docker.sock';
    const defaultSock = '/var/run/docker.sock';

    if (fs.existsSync(desktopSock)) {
      dockerOpts = { socketPath: desktopSock };
    } else if (fs.existsSync(rootlessSock)) {
      dockerOpts = { socketPath: rootlessSock };
    } else if (fs.existsSync(defaultSock)) {
      dockerOpts = { socketPath: defaultSock };
    }
  }
  return new Dockerode(dockerOpts);
}
