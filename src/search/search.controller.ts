import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { SearchService } from './search.service';

@ApiTags('Search')
@ApiBearerAuth()
@Controller('search')
export class SearchController {
  constructor(private service: SearchService) {}

  @Post('web')
  @HttpCode(200)
  @ApiOperation({ summary: 'Search the web using DuckDuckGo' })
  async searchWeb(
    @Body('query') query: string,
    @Body('maxResults') maxResults?: number,
  ) {
    if (!query || typeof query !== 'string' || !query.trim()) {
      return { results: [], error: 'Query is required' };
    }
    const results = await this.service.searchWeb(query.trim(), maxResults ?? 5);
    return { results };
  }
}
