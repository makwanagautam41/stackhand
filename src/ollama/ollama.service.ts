import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class OllamaService {
  private baseUrl: string;

  constructor(private config: ConfigService) {
    this.baseUrl = this.config.get<string>(
      'OLLAMA_BASE_URL',
      'http://localhost:11434',
    );
  }

  private async fetchOllama(path: string, options?: RequestInit) {
    const res = await fetch(`${this.baseUrl}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(options?.headers ?? {}),
      },
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`Ollama API error (${res.status}): ${text || res.statusText}`);
    }
    return res;
  }

  async status() {
    try {
      const res = await this.fetchOllama('/api/tags');
      if (res.ok) return { connected: true };
      return { connected: false, error: `HTTP ${res.status}` };
    } catch (e: any) {
      return { connected: false, error: e.message };
    }
  }

  async models() {
    const res = await this.fetchOllama('/api/tags');
    const data = await res.json();
    return (data.models ?? []).map((m: any) => ({
      id: m.name,
      name: m.name,
      size: m.size ?? 0,
      modifiedAt: m.modified_at,
    }));
  }

  async modelInfo(name: string) {
    const res = await this.fetchOllama('/api/show', {
      method: 'POST',
      body: JSON.stringify({ name }),
    });
    const data = await res.json();
    const modelfile = data.modelfile ? this.parseModelfile(data.modelfile) : {};
    return {
      name: data.name ?? name,
      family: modelfile.family ?? data.details?.family ?? 'unknown',
      parameterSize: modelfile.parameterSize ?? data.details?.parameter_size ?? 'unknown',
      quantization: modelfile.quantization ?? data.details?.quantization_level ?? 'unknown',
      size: data.size ?? 0,
      contextLength: modelfile.numCtx ?? 32768,
      modifiedAt: data.modified_at ?? '',
      digest: data.digest ?? '',
      license: modelfile.license ?? data.license ?? '',
      supportsVision: modelfile.vision ?? false,
      supportsTools: modelfile.tools ?? false,
      supportsEmbedding: modelfile.embedding ?? false,
    };
  }

  private parseModelfile(modelfile: string) {
    const result: Record<string, any> = {};
    const lines = modelfile.split('\n');
    for (const line of lines) {
      const parts = line.trim().split(/\s+/);
      const key = parts[0]?.toLowerCase();
      const value = parts.slice(1).join(' ');
      if (key === 'from') {
        const family = value.split(':')[0];
        result.family = family;
      }
      if (key === 'parameter') {
        const [paramKey, ...paramVal] = value.split(/\s+/);
        if (paramKey === 'num_ctx') result.numCtx = parseInt(paramVal[0], 10);
      }
      if (key === 'license') result.license = value;
    }
    return result;
  }

  async chat(
    model: string,
    messages: { role: string; content: string }[],
    options?: {
      temperature?: number;
      topP?: number;
      topK?: number;
      repeatPenalty?: number;
      seed?: number;
      maxTokens?: number;
    },
  ) {
    const body: any = { model, messages, stream: false };
    if (options) {
      body.options = {};
      if (options.temperature !== undefined) body.options.temperature = options.temperature;
      if (options.topP !== undefined) body.options.top_p = options.topP;
      if (options.topK !== undefined) body.options.top_k = options.topK;
      if (options.repeatPenalty !== undefined) body.options.repeat_penalty = options.repeatPenalty;
      if (options.seed !== undefined) body.options.seed = options.seed;
      if (options.maxTokens !== undefined) body.options.num_predict = options.maxTokens;
    }

    const res = await this.fetchOllama('/api/chat', {
      method: 'POST',
      body: JSON.stringify(body),
    });
    const data = await res.json();
    return {
      role: 'assistant',
      content: data.message?.content ?? '',
      metrics: {
        promptEvalCount: data.prompt_eval_count ?? 0,
        evalCount: data.eval_count ?? 0,
        totalDuration: data.total_duration ?? 0,
        loadDuration: data.load_duration ?? 0,
        promptEvalDuration: data.prompt_eval_duration ?? 0,
        evalDuration: data.eval_duration ?? 0,
      },
    };
  }

  async chatStream(
    model: string,
    messages: { role: string; content: string }[],
    options?: {
      temperature?: number;
      topP?: number;
      topK?: number;
      repeatPenalty?: number;
      seed?: number;
      maxTokens?: number;
    },
  ): Promise<{ stream: Response; abortController: AbortController }> {
    const body: any = { model, messages, stream: true };
    if (options) {
      body.options = {};
      if (options.temperature !== undefined) body.options.temperature = options.temperature;
      if (options.topP !== undefined) body.options.top_p = options.topP;
      if (options.topK !== undefined) body.options.top_k = options.topK;
      if (options.repeatPenalty !== undefined) body.options.repeat_penalty = options.repeatPenalty;
      if (options.seed !== undefined) body.options.seed = options.seed;
      if (options.maxTokens !== undefined) body.options.num_predict = options.maxTokens;
    }

    const abortController = new AbortController();
    const stream = await fetch(`${this.baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: abortController.signal,
    });

    return { stream, abortController };
  }

  async pullModel(name: string) {
    const res = await this.fetchOllama('/api/pull', {
      method: 'POST',
      body: JSON.stringify({ name, stream: false }),
    });
    return res.json();
  }

  async deleteModel(name: string) {
    await this.fetchOllama('/api/delete', {
      method: 'DELETE',
      body: JSON.stringify({ name }),
    });
    return { deleted: true };
  }

  async version() {
    try {
      const res = await this.fetchOllama('/api/version');
      const data = await res.json();
      return { version: data.version ?? 'unknown' };
    } catch (e: any) {
      return { version: null, error: e.message };
    }
  }

  async generateStack(description: string) {
    const systemPrompt = `You are a Docker Compose expert. Given a natural language description of a service, generate a valid docker-compose.yml file. Return ONLY valid JSON with this shape: { "imageName": "the official docker image name", "composeYaml": "the full docker-compose.yml as a string", "explanation": "brief explanation of choices" }. If the description is ambiguous, choose the most popular/official image. ALWAYS wrap the composeYaml as a string with \\n for newlines.`;

    const res = await this.fetchOllama('/api/chat', {
      method: 'POST',
      body: JSON.stringify({
        model: 'llama3.2',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: description },
        ],
        stream: false,
      }),
    });
    const data: any = await res.json();
    const content = data.message?.content ?? '';
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[0]);
      } catch {}
    }
    const yamlMatch = content.match(/```(?:yaml)?\s*([\s\S]*?)```/);
    return {
      image: 'unknown',
      composeYaml: yamlMatch ? yamlMatch[1] : content,
      explanation: 'Parsed from model output (non-JSON response)',
    };
  }
}
