import { Module } from '@nestjs/common';
import { AiSessionController } from './ai-session.controller';
import { AiSessionService } from './ai-session.service';

@Module({
  controllers: [AiSessionController],
  providers: [AiSessionService],
  exports: [AiSessionService],
})
export class AiSessionModule {}
