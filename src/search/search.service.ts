import { Injectable } from '@nestjs/common';
import * as cheerio from 'cheerio';

@Injectable()
export class SearchService {
  async searchWeb(query: string, maxResults = 5): Promise<{ title: string; snippet: string; url: string }[]> {
    const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      },
    });

    if (!response.ok) {
      throw new Error(`Search request failed (HTTP ${response.status})`);
    }

    const html = await response.text();
    const $ = cheerio.load(html);
    const results: { title: string; snippet: string; url: string }[] = [];

    $('.result, .results_links').each((i, el) => {
      if (i >= maxResults) return false;

      const titleEl = $(el).find('.result__title a, .result__a');
      const title = titleEl.text().trim();
      if (!title) return;

      const snippet = $(el).find('.result__snippet').text().trim();
      const href = titleEl.attr('href') || '';
      const cleanUrl = this.extractUrl(href);

      results.push({ title, snippet, url: cleanUrl });
    });

    return results;
  }

  private extractUrl(href: string): string {
    try {
      const parsed = new URL(href, 'https://duckduckgo.com');
      const redirectParam = parsed.searchParams.get('uddg');
      if (redirectParam) return redirectParam;
      if (parsed.hostname !== 'duckduckgo.com') return parsed.href;
    } catch {}
    return href;
  }
}
