import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Res,
  HttpCode,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
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

  @Get('models')
  @ApiOperation({ summary: 'List locally installed Ollama models' })
  models() {
    return this.service.models();
  }

  @Post('chat')
  @ApiOperation({ summary: 'Chat with an Ollama model (non-streaming)' })
  @HttpCode(200)
  async chat(
    @Body('model') model: string,
    @Body('messages') messages: { role: string; content: string }[],
  ) {
    return this.service.chat(model, messages);
  }

  @Post('chat/stream')
  @ApiOperation({ summary: 'Chat with an Ollama model (streaming via SSE)' })
  async chatStream(
    @Body('model') model: string,
    @Body('messages') messages: { role: string; content: string }[],
    @Res() res: Response,
  ) {
    const ollamaRes = await this.service.chatStream(model, messages);
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    const reader = ollamaRes.body?.getReader();
    if (!reader) return res.end();
    const decoder = new TextDecoder();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value, { stream: true });
      res.write(`data: ${chunk}\n\n`);
    }
    res.write('data: [DONE]\n\n');
    res.end();
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
