import { Controller, Get, Post, Delete, Param, Query, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ImageService } from './image.service';

@ApiTags('Images')
@ApiBearerAuth()
@Controller('images')
export class ImageController {
  constructor(private service: ImageService) {}

  @Get()
  @ApiOperation({ summary: 'List local Docker images' })
  findAll() { return this.service.findAll(); }

  @Get('search')
  @ApiOperation({ summary: 'Search Docker Hub for images' })
  search(@Query('q') q: string) { return this.service.searchDockerHub(q); }

  @Get('tags/:namespace/:name')
  @ApiOperation({ summary: 'Get tags for an image from Docker Hub' })
  getTags(@Param('namespace') ns: string, @Param('name') name: string) {
    return this.service.getTags(ns, name);
  }

  @Post('pull')
  @ApiOperation({ summary: 'Pull a Docker image by name:tag' })
  pull(@Body('name') name: string) { return this.service.pullImage(name); }

  @Delete(':name')
  @ApiOperation({ summary: 'Remove a local image' })
  remove(@Param('name') name: string) { return this.service.removeImage(name); }
}
