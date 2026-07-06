import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

interface CacheEntry {
  results: { title: string; snippet: string; url: string }[];
  expiresAt: number;
}

type EngineName = 'tavily' | 'brave';

interface EngineConfig {
  key: string;
}

@Injectable()
export class SearchService {
  private readonly cache = new Map<string, CacheEntry>();
  private readonly cacheTtlMs = 5 * 60 * 1000;
  private readonly engines: Record<EngineName, EngineConfig>;
  private requestCounts: Record<string, number> = {};

  constructor(private config: ConfigService) {
    this.engines = {
      tavily: {
        key: this.config.get<string>('TAVILY_API_KEY', ''),
      },
      brave: {
        key: this.config.get<string>('BRAVE_SEARCH_API_KEY', ''),
      },
    };
  }

  engineStatus(): Record<EngineName, { configured: boolean; requests: number }> {
    const status: any = {};
    for (const [name, cfg] of Object.entries(this.engines)) {
      status[name] = {
        configured: !!(cfg as EngineConfig).key,
        requests: this.requestCounts[name] ?? 0,
      };
    }
    return status;
  }

  totalRequests(): number {
    return Object.values(this.requestCounts).reduce((a, b) => a + b, 0);
  }

  async searchWeb(
    query: string,
    maxResults = 5,
    engine?: EngineName,
  ): Promise<{ title: string; snippet: string; url: string }[]> {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return [];

    const eng: EngineName = engine && this.engines[engine]?.key ? engine : this.defaultEngine();

    const cached = this.cache.get(`${eng}:${normalized}`);
    if (cached && Date.now() < cached.expiresAt) {
      return cached.results.slice(0, maxResults);
    }

    this.requestCounts[eng] = (this.requestCounts[eng] ?? 0) + 1;

    let results: { title: string; snippet: string; url: string }[];
    if (eng === 'tavily') {
      results = await this.searchTavily(query, maxResults);
    } else {
      results = await this.searchBrave(query, maxResults);
    }

    this.cache.set(`${eng}:${normalized}`, {
      results,
      expiresAt: Date.now() + this.cacheTtlMs,
    });

    return results.slice(0, maxResults);
  }

  private defaultEngine(): EngineName {
    if (this.engines.tavily.key) return 'tavily';
    if (this.engines.brave.key) return 'brave';
    return 'tavily';
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
