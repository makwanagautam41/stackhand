import { Module } from '@nestjs/common';
import { ContainerController } from './container.controller';
import { ContainerService } from './container.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [ContainerController],
  providers: [ContainerService],
  exports: [ContainerService],
})
export class ContainerModule {}
