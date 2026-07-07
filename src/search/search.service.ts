import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';

interface CacheEntry {
  results: { title: string; snippet: string; url: string }[];
  expiresAt: number;
}

type EngineName = 'tavily' | 'google' | 'brave';

interface EngineConfig {
  key: string;
  cx?: string;
}

@Injectable()
export class SearchService {
  private readonly cache = new Map<string, CacheEntry>();
  private readonly cacheTtlMs = 5 * 60 * 1000;
  private readonly engines: Record<EngineName, EngineConfig>;

  constructor(
    private config: ConfigService,
    private prisma: PrismaService,
  ) {
    this.engines = {
      tavily: {
        key: this.config.get<string>('TAVILY_API_KEY', ''),
      },
      google: {
        key: this.config.get<string>('GOOGLE_API_KEY', ''),
        cx: this.config.get<string>('GOOGLE_CX', ''),
      },
      brave: {
        key: this.config.get<string>('BRAVE_SEARCH_API_KEY', ''),
      },
    };
  }

  async engineStatus(): Promise<Record<EngineName, { configured: boolean; requests: number }>> {
    const status: any = {};
    for (const [name, cfg] of Object.entries(this.engines)) {
      const ec = cfg as EngineConfig;
      const count = await this.prisma.searchLog.count({ where: { engine: name } });
      status[name] = {
        configured: !!(ec.key && (name !== 'google' || ec.cx)),
        requests: count,
      };
    }
    return status;
  }

  async totalRequests(): Promise<number> {
    return this.prisma.searchLog.count();
  }

  async searchWeb(
    query: string,
    maxResults = 5,
    engine?: EngineName,
  ): Promise<{ title: string; snippet: string; url: string }[]> {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return [];

    const allowed = engine && this.engines[engine]?.key && (engine !== 'google' || this.engines.google.cx);
    const eng: EngineName = allowed ? engine : this.defaultEngine();

    const cached = this.cache.get(`${eng}:${normalized}`);
    if (cached && Date.now() < cached.expiresAt) {
      return cached.results.slice(0, maxResults);
    }

    let results: { title: string; snippet: string; url: string }[];
    if (eng === 'tavily') {
      results = await this.searchTavily(query, maxResults);
    } else if (eng === 'google') {
      results = await this.searchGoogle(query, maxResults);
    } else {
      results = await this.searchBrave(query, maxResults);
    }

    this.cache.set(`${eng}:${normalized}`, {
      results,
      expiresAt: Date.now() + this.cacheTtlMs,
    });

    await this.prisma.searchLog.create({
      data: { query, engine: eng, results: results.length },
    });

    return results.slice(0, maxResults);
  }

  async searchLogs(engine?: string, limit = 20) {
    const where = engine ? { engine } : {};
    return this.prisma.searchLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  async deleteSearchLog(id: string) {
    await this.prisma.searchLog.delete({ where: { id } });
  }

  private defaultEngine(): EngineName {
    if (this.engines.tavily.key) return 'tavily';
    if (this.engines.brave.key) return 'brave';
    if (this.engines.google.key && this.engines.google.cx) return 'google';
    return 'tavily';
  }

  private async searchGoogle(
    query: string,
    maxResults: number,
  ): Promise<{ title: string; snippet: string; url: string }[]> {
    const { key, cx } = this.engines.google;
    if (!key || !cx) {
      throw new Error(
        'Google Search is disabled.',
      );
    }

    const url = `https://www.googleapis.com/customsearch/v1?key=${encodeURIComponent(key)}&cx=${encodeURIComponent(cx)}&q=${encodeURIComponent(query)}&num=${Math.min(maxResults, 10)}`;

    const response = await fetch(url);
    if (!response.ok) {
      let detail = `HTTP ${response.status}`;
      try {
        const body = await response.json();
        if (body.error?.message) detail += ` — ${body.error.message}`;
      } catch {}
      throw new Error(`Google Search API error (${detail})`);
    }

    const data: any = await response.json();
    return (data.items ?? []).map((r: any) => ({
      title: r.title ?? '',
      snippet: r.snippet ?? '',
      url: r.link ?? '',
    }));
  }

  private async searchTavily(
    query: string,
    maxResults: number,
  ): Promise<{ title: string; snippet: string; url: string }[]> {
    const key = this.engines.tavily.key;
    if (!key) {
      throw new Error(
        'Tavily Search API key is not configured. Set TAVILY_API_KEY in your .env file. Get a free key at https://tavily.com/',
      );
    }

    const response = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query,
        max_results: Math.min(maxResults, 10),
        search_depth: 'basic',
        include_answer: false,
        include_raw_content: false,
      }),
    });

    if (!response.ok) {
      let detail = `HTTP ${response.status}`;
      try {
        const body = await response.json();
        if (body.error) detail += ` — ${body.error}`;
      } catch {}
      throw new Error(`Tavily Search API error (${detail})`);
    }

    const data: any = await response.json();
    return (data.results ?? []).map((r: any) => ({
      title: r.title ?? '',
      snippet: r.content ?? '',
      url: r.url ?? '',
    }));
  }

  private async searchBrave(
    query: string,
    maxResults: number,
  ): Promise<{ title: string; snippet: string; url: string }[]> {
    const key = this.engines.brave.key;
    if (!key) {
      throw new Error(
        'Brave Search API key is not configured. Set BRAVE_SEARCH_API_KEY in your .env file. Get a free key at https://brave.com/search/api/',
      );
    }

    const url = `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=${Math.min(maxResults, 20)}`;

    const response = await fetch(url, {
      headers: {
        'X-Subscription-Token': key,
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      let detail = `HTTP ${response.status}`;
      try {
        const body = await response.json();
        if (body.reason) detail += ` — ${body.reason}`;
      } catch {}
      throw new Error(`Brave Search API error (${detail})`);
    }

    const data: any = await response.json();
    return (data.web?.results ?? []).map((r: any) => ({
      title: r.title ?? '',
      snippet: r.description ?? '',
      url: r.url ?? '',
    }));
  }
}
