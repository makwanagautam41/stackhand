import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAiSessionDto, UpdateAiSessionDto, CreateAiMessageDto, UpdateAiMessageDto } from './dto';

@Injectable()
export class AiSessionService {
  constructor(private prisma: PrismaService) {}

  async findAll(workspaceId: string) {
    return this.prisma.aiSession.findMany({
      where: { workspaceId },
      orderBy: { updatedAt: 'desc' },
      include: { _count: { select: { messages: true } } },
    });
  }

  async findOne(id: string) {
    const session = await this.prisma.aiSession.findUnique({
      where: { id },
      include: { messages: { orderBy: { createdAt: 'asc' } } },
    });
    if (!session) throw new NotFoundException('AI session not found');
    return session;
  }

  async create(dto: CreateAiSessionDto) {
    return this.prisma.aiSession.create({
      data: {
        workspaceId: dto.workspaceId,
        name: dto.name,
        model: dto.model ?? '',
        options: dto.options ? JSON.stringify(dto.options) : '{}',
      },
    });
  }

  async update(id: string, dto: UpdateAiSessionDto) {
    await this.findOne(id);
    return this.prisma.aiSession.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.model !== undefined && { model: dto.model }),
        ...(dto.options !== undefined && { options: JSON.stringify(dto.options) }),
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.aiSession.delete({ where: { id } });
  }

  async addMessage(sessionId: string, dto: CreateAiMessageDto) {
    await this.findOne(sessionId);
    const msg = await this.prisma.aiMessage.create({
      data: {
        sessionId,
        role: dto.role,
        content: dto.content,
      },
    });
    await this.prisma.aiSession.update({
      where: { id: sessionId },
      data: { updatedAt: new Date() },
    });
    return msg;
  }

  async updateMessage(messageId: string, dto: UpdateAiMessageDto) {
    const msg = await this.prisma.aiMessage.findUnique({ where: { id: messageId } });
    if (!msg) throw new NotFoundException('Message not found');
    return this.prisma.aiMessage.update({
      where: { id: messageId },
      data: { content: dto.content },
    });
  }

  async removeMessage(messageId: string) {
    const msg = await this.prisma.aiMessage.findUnique({ where: { id: messageId } });
    if (!msg) throw new NotFoundException('Message not found');
    return this.prisma.aiMessage.delete({ where: { id: messageId } });
  }
}
