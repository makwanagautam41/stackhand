import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { DashboardService } from './dashboard.service';

@ApiTags('Dashboard')
@Controller('dashboard')
export class DashboardController {
  constructor(private service: DashboardService) {}

  @Get()
  @ApiOperation({ summary: 'Get aggregated dashboard overview' })
  getOverview() { return this.service.getOverview(); }
}
