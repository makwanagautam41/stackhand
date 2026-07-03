import { Controller, Get, Post, Patch, Delete, Param, Body, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { WorkspaceService } from './workspace.service';
import { CreateWorkspaceDto, UpdateWorkspaceDto, DeleteWorkspaceDto, ValidatePathDto } from './dto';

@ApiTags('Workspaces')
@ApiBearerAuth()
@Controller('workspaces')
export class WorkspaceController {
  constructor(private service: WorkspaceService) {}

  @Get()
  @ApiOperation({ summary: 'List all workspaces' })
  findAll() { return this.service.findAll(); }

  @Get(':id')
  @ApiOperation({ summary: 'Get workspace by id' })
  findOne(@Param('id') id: string) { return this.service.findOne(id); }

  @Post()
  @ApiOperation({ summary: 'Create a workspace' })
  create(@Body() dto: CreateWorkspaceDto) { return this.service.create(dto); }

  @Patch(':id')
  @ApiOperation({ summary: 'Update workspace' })
  update(@Param('id') id: string, @Body() dto: UpdateWorkspaceDto) { return this.service.update(id, dto); }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete workspace' })
  remove(@Param('id') id: string, @Body() dto?: DeleteWorkspaceDto) {
    return this.service.remove(id, dto?.alsoDeleteFolder);
  }

  @Post('validate-path')
  @ApiOperation({ summary: 'Check if a folder path is valid and accessible' })
  validatePath(@Body() dto: ValidatePathDto) { return this.service.validatePath(dto.path); }
}
