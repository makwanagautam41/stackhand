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

  async status() {
    try {
      const res = await fetch(`${this.baseUrl}/api/tags`);
      if (res.ok) return { connected: true };
      return { connected: false, error: `HTTP ${res.status}` };
    } catch (e: any) {
      return { connected: false, error: e.message };
    }
  }

  async models() {
    const res = await fetch(`${this.baseUrl}/api/tags`);
    if (!res.ok) throw new Error(`Failed to fetch models: ${res.statusText}`);
    const data = await res.json();
    return (data.models ?? []).map((m: any) => ({
      id: m.name,
      name: m.name,
      size: m.size ?? 0,
      modifiedAt: m.modified_at,
    }));
  }

  async chat(model: string, messages: { role: string; content: string }[]) {
    const response = await fetch(`${this.baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, messages, stream: true }),
    });
    if (!response.ok)
      throw new Error(`Ollama chat error: ${response.statusText}`);
    const reader = response.body?.getReader();
    if (!reader) throw new Error('No response body');
    const decoder = new TextDecoder();
    let fullContent = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split('\n').filter(Boolean);
      for (const line of lines) {
        try {
          const parsed = JSON.parse(line);
          if (parsed.message?.content) {
            fullContent += parsed.message.content;
          }
        } catch {}
      }
    }
    return { role: 'assistant', content: fullContent };
  }

  async chatStream(
    model: string,
    messages: { role: string; content: string }[],
  ): Promise<Response> {
    return fetch(`${this.baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, messages, stream: true }),
    });
  }

  async generateStack(description: string) {
    const systemPrompt = `You are a Docker Compose expert. Given a natural language description of a service, generate a valid docker-compose.yml file. Return ONLY valid JSON with this shape: { "imageName": "the official docker image name", "composeYaml": "the full docker-compose.yml as a string", "explanation": "brief explanation of choices" }. If the description is ambiguous, choose the most popular/official image. ALWAYS wrap the composeYaml as a string with \\n for newlines.`;

    const res = await fetch(`${this.baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'llama3.2',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: description },
        ],
        stream: false,
      }),
    });
    if (!res.ok) throw new Error(`Ollama error: ${res.statusText}`);
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
