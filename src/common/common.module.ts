import { Module } from '@nestjs/common';
import { ActivityLogger } from './activity-logger';

@Module({
  providers: [ActivityLogger],
  exports: [ActivityLogger],
})
export class CommonModule {}
