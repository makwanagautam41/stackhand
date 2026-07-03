import { Controller, Get, Post, Delete, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ContainerService } from './container.service';

@ApiTags('Containers')
@ApiBearerAuth()
@Controller('containers')
export class ContainerController {
  constructor(private service: ContainerService) {}

  @Get()
  @ApiOperation({ summary: 'List all containers' })
  findAll() { return this.service.findAll(); }

  @Get(':id')
  @ApiOperation({ summary: 'Inspect container details' })
  findOne(@Param('id') id: string) { return this.service.findOne(id); }

  @Post(':id/start')
  @ApiOperation({ summary: 'Start a container' })
  start(@Param('id') id: string) { return this.service.start(id); }

  @Post(':id/stop')
  @ApiOperation({ summary: 'Stop a container' })
  stop(@Param('id') id: string) { return this.service.stop(id); }

  @Post(':id/restart')
  @ApiOperation({ summary: 'Restart a container' })
  restart(@Param('id') id: string) { return this.service.restart(id); }

  @Delete(':id')
  @ApiOperation({ summary: 'Remove a container' })
  remove(@Param('id') id: string) { return this.service.remove(id); }

  @Get(':id/stats')
  @ApiOperation({ summary: 'Get container stats (CPU, memory)' })
  stats(@Param('id') id: string) { return this.service.stats(id); }
}
