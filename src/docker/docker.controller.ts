import { Controller, Get, Post, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { DockerService } from './docker.service';

@ApiTags('Docker')
@Controller('docker')
export class DockerController {
  constructor(private service: DockerService) {}

  @Get('status')
  @ApiOperation({ summary: 'Get Docker engine status' })
  getStatus() {
    return this.service.getStatus();
  }

  @Get('ping')
  @ApiOperation({ summary: 'Ping Docker engine' })
  ping() {
    return this.service.ping();
  }
}
