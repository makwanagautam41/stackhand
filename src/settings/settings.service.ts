import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SettingsService {
  constructor(private prisma: PrismaService) {}

  async getGlobal() {
    const setting = await this.prisma.setting.findUnique({ where: { id: 'global' } });
    return setting ? JSON.parse(setting.value) : {};
  }

  async updateGlobal(value: Record<string, any>) {
    await this.prisma.setting.upsert({
      where: { id: 'global' },
      create: { id: 'global', value: JSON.stringify(value) },
      update: { value: JSON.stringify(value) },
    });
    return value;
  }
}
