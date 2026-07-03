import { Module } from '@nestjs/common';
import { StackController } from './stack.controller';
import { StackService } from './stack.service';
import { CommonModule } from '../common/common.module';

@Module({
  imports: [CommonModule],
  controllers: [StackController],
  providers: [StackService],
  exports: [StackService],
})
export class StackModule {}
