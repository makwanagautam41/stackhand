import { Controller, Get, Post, Param, Query, Body, Sse } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Observable } from 'rxjs';
import { RegistryService } from './registry.service';
import { Public } from '../common/skip-auth.decorator';

@ApiTags('Registry')
@Controller('registry')
export class RegistryController {
  constructor(private service: RegistryService) {}

  @Get('search')
  @ApiOperation({ summary: 'Search Docker Hub for images' })
  search(
    @Query('q') q: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    if (!q || !q.trim()) {
      return { results: [], total: 0, page: 1, pageSize: 25 };
    }
    return this.service.search(
      q.trim(),
      page ? parseInt(page) : 1,
      pageSize ? parseInt(pageSize) : 25,
    );
  }

  @Get('repository/:namespace/:repo')
  @ApiOperation({ summary: 'Get repository details' })
  getRepository(@Param('namespace') ns: string, @Param('repo') repo: string) {
    return this.service.getRepository(ns, repo);
  }

  @Get('repository/:namespace/:repo/tags')
  @ApiOperation({ summary: 'Get repository tags' })
  getTags(
    @Param('namespace') ns: string,
    @Param('repo') repo: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.service.getTags(
      ns,
      repo,
      page ? parseInt(page) : 1,
      pageSize ? parseInt(pageSize) : 50,
    );
  }

  @Post('pull')
  @ApiOperation({ summary: 'Pull a Docker image (returns after completion)' })
  pull(@Body('name') name: string) {
    return this.service.pullImage(name);
  }

  @Public()
  @Sse('pull-stream')
  @ApiOperation({ summary: 'Pull a Docker image with SSE progress stream' })
  pullStream(@Query('name') name: string): Observable<any> {
    if (!name || !name.trim()) {
      return new Observable((sub) => {
        sub.next({ type: 'error', message: 'Image name is required' });
        sub.complete();
      });
    }
    return this.service.pullImageStream(name.trim());
  }

  @Post('generate-compose')
  @ApiOperation({ summary: 'Generate a Docker Compose file from an image' })
  generateCompose(
    @Body()
    data: {
      image: string;
      name?: string;
      port?: number;
      env?: Record<string, string>;
      volumes?: string[];
    },
  ) {
    return this.service.generateCompose(data);
  }

  @Post('save-workspace')
  @ApiOperation({ summary: 'Save a compose file to a workspace' })
  saveToWorkspace(
    @Body()
    data: {
      workspaceRoot: string;
      folderName: string;
      yaml: string;
      description?: string;
    },
  ) {
    return this.service.saveToWorkspace(data);
  }

  @Get('popular')
  @ApiOperation({ summary: 'Get popular image sections' })
  getPopularSections() {
    return this.service.getPopularSections();
  }
}
