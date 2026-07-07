import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { createPrismaClientOptions } from './prisma-client';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor() {
    super(createPrismaClientOptions());
  }

  async onModuleInit() {
    await this.$connect();
    try {
      await this.$executeRawUnsafe('PRAGMA journal_mode=WAL');
      await this.$executeRawUnsafe('PRAGMA busy_timeout=5000');
    } catch {}
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
