import { Controller, Get, Put, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { SettingsService } from './settings.service';

@ApiTags('Settings')
@ApiBearerAuth()
@Controller('settings')
export class SettingsController {
  constructor(private service: SettingsService) {}

  @Get()
  @ApiOperation({ summary: 'Get global settings' })
  getGlobal() {
    return this.service.getGlobal();
  }

  @Put()
  @ApiOperation({ summary: 'Update global settings' })
  updateGlobal(@Body() value: Record<string, any>) {
    return this.service.updateGlobal(value);
  }
}
