import { Injectable } from '@nestjs/common';
import { v4 as uuid } from 'uuid';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ActivityLogger {
  constructor(private prisma: PrismaService) {}

  async log(workspaceId: string, kind: string, message: string): Promise<void> {
    try {
      await this.prisma.activity.create({
        data: { id: uuid(), workspaceId, kind, message, ts: new Date() },
      });
    } catch {}
  }
}
