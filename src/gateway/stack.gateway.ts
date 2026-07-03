import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { StackService } from '../stack/stack.service';
import { ContainerService } from '../container/container.service';
import { ImageService } from '../image/image.service';
import { ChildProcess } from 'child_process';

interface StreamState {
  process: ChildProcess;
  clientId: string;
}

function getConfiguredOrigins() {
  const configured = process.env.CORS_ORIGIN || process.env.FRONTEND_ORIGIN;
  if (!configured) return null;
  return configured
    .split(',')
    .map((v) => v.trim())
    .filter(Boolean);
}

function isPrivateOrLocalHostname(hostname: string) {
  return (
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname === '0.0.0.0' ||
    hostname === '::1' ||
    hostname.startsWith('10.') ||
    hostname.startsWith('192.168.') ||
    /^172\.(1[6-9]|2\d|3[0-1])\./.test(hostname)
  );
}

@WebSocketGateway({
  cors: {
    origin: (origin, callback) => {
      if (!origin) {
        callback(null, true);
        return;
      }
      const configuredOrigins = getConfiguredOrigins();
      if (configuredOrigins) {
        callback(null, configuredOrigins.includes(origin));
        return;
      }
      try {
        const url = new URL(origin);
        callback(null, isPrivateOrLocalHostname(url.hostname));
      } catch {
        callback(null, false);
      }
    },
    credentials: false,
  },
  namespace: '/',
})
export class StackGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;

  private activeStreams = new Map<string, StreamState>();

  constructor(
    private stackService: StackService,
    private containerService: ContainerService,
    private imageService: ImageService,
  ) {}

  handleConnection(client: Socket) {
    client.emit('connected', { message: 'Connected to Stackhand WebSocket' });
  }

  handleDisconnect(client: Socket) {
    for (const [key, state] of this.activeStreams) {
      if (state.clientId === client.id) {
        state.process?.kill();
        this.activeStreams.delete(key);
      }
    }
  }

  @SubscribeMessage('stack:logs')
  async handleStackLogs(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { stackId: string; tail?: number },
  ) {
    try {
      const stack = await this.stackService['prisma'].stack.findUnique({ where: { id: data.stackId } });
      if (!stack) {
        client.emit('error', { message: 'Stack not found' });
        return;
      }
      const child = this.stackService.getComposeChild(stack.folderPath, 'logs', ['-f', '--tail', String(data.tail ?? 200)]);
      const key = `logs:${data.stackId}:${client.id}`;
      this.activeStreams.set(key, { process: child, clientId: client.id });

      child.stdout?.on('data', (d: Buffer) => {
        client.emit('stack:logs', { stackId: data.stackId, line: d.toString() });
      });
      child.stderr?.on('data', (d: Buffer) => {
        client.emit('stack:logs', { stackId: data.stackId, line: d.toString() });
      });
      child.on('close', () => {
        client.emit('stack:logs:end', { stackId: data.stackId });
      });
    } catch (e: any) {
      client.emit('error', { message: e.message });
    }
  }

  @SubscribeMessage('stack:logs:stop')
  handleStopLogs(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { stackId: string },
  ) {
    const key = `logs:${data.stackId}:${client.id}`;
    const state = this.activeStreams.get(key);
    if (state) {
      state.process?.kill();
      this.activeStreams.delete(key);
    }
  }

  @SubscribeMessage('stack:compose-progress')
  async handleComposeProgress(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { stackId: string; action: 'up' | 'down' },
  ) {
    try {
      const stack = await this.stackService['prisma'].stack.findUnique({ where: { id: data.stackId } });
      if (!stack) { client.emit('error', { message: 'Stack not found' }); return; }
      const child = this.stackService.getComposeChild(stack.folderPath, data.action, data.action === 'up' ? ['-d'] : []);
      const room = `compose:${data.stackId}`;
      const key = `compose:${data.stackId}:${client.id}`;
      this.activeStreams.set(key, { process: child, clientId: client.id });

      child.stdout?.on('data', (d: Buffer) => {
        client.emit('stack:compose-progress', { stackId: data.stackId, line: d.toString() });
      });
      child.stderr?.on('data', (d: Buffer) => {
        client.emit('stack:compose-progress', { stackId: data.stackId, line: d.toString() });
      });
      child.on('close', (code) => {
        client.emit('stack:compose-end', { stackId: data.stackId, code });
        this.activeStreams.delete(key);
      });
    } catch (e: any) {
      client.emit('error', { message: e.message });
    }
  }

  @SubscribeMessage('container:stats')
  async handleContainerStats(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { containerId: string },
  ) {
    const interval = setInterval(async () => {
      try {
        const stats = await this.containerService.stats(data.containerId);
        client.emit('container:stats', { containerId: data.containerId, stats });
      } catch {
        client.emit('container:stats:end', { containerId: data.containerId });
        clearInterval(interval);
      }
    }, 3000);

    client.on('disconnect', () => clearInterval(interval));
    client.on('container:stats:stop', () => clearInterval(interval));
  }

  @SubscribeMessage('image:pull-progress')
  async handleImagePull(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { name: string },
  ) {
    try {
      const Dockerode = require('dockerode');
      const docker = new Dockerode();
      const stream = await docker.pull(data.name);
      docker.modem.followProgress(stream, (err: any) => {
        if (err) client.emit('error', { message: err.message });
        client.emit('image:pull-end', { name: data.name });
      }, (event: any) => {
        client.emit('image:pull-progress', { name: data.name, event });
      });
    } catch (e: any) {
      client.emit('error', { message: e.message });
    }
  }

  @SubscribeMessage('ollama:chat-stream')
  async handleOllamaChat(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { model: string; messages: { role: string; content: string }[] },
  ) {
    try {
      const ollamaRes = await fetch('http://localhost:11434/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: data.model, messages: data.messages, stream: true }),
      });
      const reader = ollamaRes.body?.getReader();
      if (!reader) return;
      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n').filter(Boolean);
        for (const line of lines) {
          try {
            const parsed = JSON.parse(line);
            client.emit('ollama:chat-token', { token: parsed.message?.content ?? '' });
          } catch {}
        }
      }
      client.emit('ollama:chat-end');
    } catch (e: any) {
      client.emit('error', { message: e.message });
    }
  }
}
