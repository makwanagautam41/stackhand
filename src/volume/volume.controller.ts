import { Controller, Get, Delete, Param, Post } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { VolumeService } from './volume.service';

@ApiTags('Volumes')
@Controller('volumes')
export class VolumeController {
  constructor(private service: VolumeService) {}

  @Get()
  @ApiOperation({ summary: 'List all Docker volumes' })
  findAll() { return this.service.findAll(); }

  @Get(':name')
  @ApiOperation({ summary: 'Inspect a volume' })
  findOne(@Param('name') name: string) { return this.service.findOne(name); }

  @Delete(':name')
  @ApiOperation({ summary: 'Remove a volume' })
  remove(@Param('name') name: string) { return this.service.remove(name); }

  @Post('prune')
  @ApiOperation({ summary: 'Remove all unused volumes' })
  prune() { return this.service.prune(); }
}
