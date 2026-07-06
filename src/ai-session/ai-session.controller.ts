import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  HttpCode,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { AiSessionService } from './ai-session.service';
import {
  CreateAiSessionDto,
  UpdateAiSessionDto,
  CreateAiMessageDto,
  UpdateAiMessageDto,
} from './dto';

@ApiTags('AI Sessions')
@ApiBearerAuth()
@Controller('ai-sessions')
export class AiSessionController {
  constructor(private service: AiSessionService) {}

  @Get()
  @ApiOperation({ summary: 'List AI sessions for a workspace' })
  @ApiQuery({ name: 'workspaceId', required: true })
  findAll(@Query('workspaceId') workspaceId: string) {
    return this.service.findAll(workspaceId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get an AI session with its messages' })
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new AI session' })
  create(@Body() dto: CreateAiSessionDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update an AI session' })
  update(@Param('id') id: string, @Body() dto: UpdateAiSessionDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete an AI session' })
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }

  @Post(':id/messages')
  @ApiOperation({ summary: 'Add a message to an AI session' })
  addMessage(@Param('id') id: string, @Body() dto: CreateAiMessageDto) {
    return this.service.addMessage(id, dto);
  }

  @Patch(':id/messages/:msgId')
  @ApiOperation({ summary: 'Update a message content' })
  updateMessage(@Param('msgId') msgId: string, @Body() dto: UpdateAiMessageDto) {
    return this.service.updateMessage(msgId, dto);
  }

  @Delete(':id/messages/:msgId')
  @ApiOperation({ summary: 'Delete a message' })
  @HttpCode(204)
  async removeMessage(@Param('msgId') msgId: string) {
    await this.service.removeMessage(msgId);
  }
}
