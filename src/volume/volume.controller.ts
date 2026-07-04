import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Query,
  Body,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { VolumeService } from './volume.service';

@ApiTags('Volumes')
@Controller('volumes')
export class VolumeController {
  constructor(private service: VolumeService) {}

  @Get()
  @ApiOperation({ summary: 'List all Docker volumes' })
  findAll() {
    return this.service.findAll();
  }

  @Get(':name')
  @ApiOperation({ summary: 'Inspect a volume' })
  findOne(@Param('name') name: string) {
    return this.service.findOne(name);
  }

  @Get(':name/files')
  @ApiOperation({ summary: 'Browse files in a volume' })
  browseFiles(@Param('name') name: string, @Query('path') subPath?: string) {
    return this.service.browseFiles(name, subPath);
  }

  @Get(':name/files/read')
  @ApiOperation({ summary: 'Read a file from a volume' })
  readFile(@Param('name') name: string, @Query('path') filePath: string) {
    return this.service.readFile(name, filePath);
  }

  @Get(':name/usage')
  @ApiOperation({ summary: 'Get volume disk usage' })
  getUsage(@Param('name') name: string) {
    return this.service.getUsage(name);
  }

  @Delete(':name')
  @ApiOperation({ summary: 'Remove a volume' })
  remove(@Param('name') name: string) {
    return this.service.remove(name);
  }

  @Post('prune')
  @ApiOperation({ summary: 'Remove all unused volumes' })
  prune() {
    return this.service.prune();
  }
}
