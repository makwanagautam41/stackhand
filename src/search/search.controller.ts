import { Body, Controller, Get, HttpCode, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { SearchService } from './search.service';

@ApiTags('Search')
@ApiBearerAuth()
@Controller('search')
export class SearchController {
  constructor(private service: SearchService) {}

  @Get('status')
  @ApiOperation({ summary: 'Get search engine configuration status and usage stats' })
  status() {
    const engines = this.service.engineStatus();
    const total = Object.values(engines).reduce((s, e) => s + e.requests, 0);
    return { engines, totalRequests: total };
  }

  @Post('web')
  @HttpCode(200)
  @ApiOperation({ summary: 'Search the web using the selected engine (Google or Brave)' })
  async searchWeb(
    @Body('query') query: string,
    @Body('maxResults') maxResults?: number,
    @Body('engine') engine?: string,
  ) {
    if (!query || typeof query !== 'string' || !query.trim()) {
      return { results: [], error: 'Query is required' };
    }
    const results = await this.service.searchWeb(
      query.trim(),
      maxResults ?? 5,
      engine as any,
    );
    return { results };
  }
}
