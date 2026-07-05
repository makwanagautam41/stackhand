import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  Res,
  HttpCode,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { OllamaService } from './ollama.service';
import type { Response } from 'express';

@ApiTags('Ollama')
@ApiBearerAuth()
@Controller('ollama')
export class OllamaController {
  constructor(private service: OllamaService) {}

  @Get('status')
  @ApiOperation({ summary: 'Check Ollama connection status' })
  status() {
    return this.service.status();
  }

  @Get('version')
  @ApiOperation({ summary: 'Get Ollama version' })
  version() {
    return this.service.version();
  }

  @Get('models')
  @ApiOperation({ summary: 'List locally installed Ollama models' })
  models() {
    return this.service.models();
  }

  @Get('model/:name')
  @ApiOperation({ summary: 'Get detailed info about a specific model' })
  modelInfo(@Param('name') name: string) {
    return this.service.modelInfo(decodeURIComponent(name));
  }

  @Post('chat')
  @ApiOperation({ summary: 'Chat with an Ollama model (non-streaming)' })
  @HttpCode(200)
  async chat(
    @Body('model') model: string,
    @Body('messages') messages: { role: string; content: string }[],
    @Body('options') options?: {
      temperature?: number;
      topP?: number;
      topK?: number;
      repeatPenalty?: number;
      seed?: number;
      maxTokens?: number;
    },
  ) {
    return this.service.chat(model, messages, options);
  }

  @Post('chat/stream')
  @ApiOperation({ summary: 'Chat with an Ollama model (streaming via SSE)' })
  async chatStream(
    @Body('model') model: string,
    @Body('messages') messages: { role: string; content: string }[],
    @Res() res: Response,
    @Body('options') options?: {
      temperature?: number;
      topP?: number;
      topK?: number;
      repeatPenalty?: number;
      seed?: number;
      maxTokens?: number;
    },
  ) {
    const { stream, abortController } = await this.service.chatStream(model, messages, options);

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');

    const reader = stream.body?.getReader();
    if (!reader) return res.end();

    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          if (line.trim()) {
            res.write(`data: ${line}\n\n`);
          }
        }
      }

      if (buffer.trim()) {
        res.write(`data: ${buffer}\n\n`);
      }

      res.write('data: [DONE]\n\n');
    } catch (e: any) {
      if (e.name !== 'AbortError') {
        res.write(`data: {"error": "${e.message}"}\n\n`);
      }
    } finally {
      res.end();
    }
  }

  @Post('stop-stream')
  @ApiOperation({ summary: 'Stop an active streaming response' })
  @HttpCode(200)
  stopStream() {
    return { stopped: true };
  }

  @Post('pull')
  @ApiOperation({ summary: 'Pull/download an Ollama model' })
  async pullModel(@Body('name') name: string) {
    return this.service.pullModel(name);
  }

  @Delete('model/:name')
  @ApiOperation({ summary: 'Delete an Ollama model' })
  async deleteModel(@Param('name') name: string) {
    return this.service.deleteModel(decodeURIComponent(name));
  }

  @Post('generate-stack')
  @ApiOperation({
    summary: 'Generate a docker-compose.yml from a description via Ollama',
  })
  @HttpCode(200)
  generateStack(@Body('description') description: string) {
    return this.service.generateStack(description);
  }
}
