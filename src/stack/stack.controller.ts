import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { StackService } from './stack.service';
import { CreateStackDto } from './dto';

@ApiTags('Stacks')
@ApiBearerAuth()
@Controller()
export class StackController {
  constructor(private service: StackService) {}

  @Get('workspaces/:workspaceId/stacks')
  @ApiOperation({ summary: 'List stacks in a workspace' })
  findAll(@Param('workspaceId') workspaceId: string) {
    return this.service.findAll(workspaceId);
  }

  @Get('stacks/:id')
  @ApiOperation({ summary: 'Get stack detail with parsed services' })
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post('workspaces/:workspaceId/stacks')
  @ApiOperation({ summary: 'Create a new stack' })
  create(
    @Param('workspaceId') workspaceId: string,
    @Body() dto: CreateStackDto,
  ) {
    return this.service.create({ ...dto, workspaceId });
  }

  @Put('stacks/:id/yaml')
  @ApiOperation({ summary: 'Update stack YAML content' })
  updateYaml(@Param('id') id: string, @Body('yaml') yaml: string) {
    return this.service.updateYaml(id, yaml);
  }

  @Delete('stacks/:id')
  @ApiOperation({ summary: 'Delete stack' })
  @ApiQuery({ name: 'deleteFolder', required: false })
  remove(
    @Param('id') id: string,
    @Query('deleteFolder') deleteFolder?: string,
  ) {
    return this.service.remove(id, deleteFolder === 'true');
  }

  @Post('stacks/from-yaml')
  @ApiOperation({ summary: 'docker compose up from raw YAML path' })
  composeFromYaml(
    @Body('yamlPath') yamlPath: string,
    @Body('yamlContent') yamlContent: string,
    @Body('workspaceId') workspaceId?: string,
  ) {
    return this.service.composeFromYaml(yamlPath, yamlContent, workspaceId);
  }

  @Post('stacks/:id/up')
  @ApiOperation({ summary: 'docker compose up -d' })
  composeUp(@Param('id') id: string) {
    return this.service.composeUp(id);
  }

  @Post('stacks/:id/down')
  @ApiOperation({ summary: 'docker compose down' })
  composeDown(@Param('id') id: string) {
    return this.service.composeDown(id);
  }

  @Post('stacks/:id/restart')
  @ApiOperation({ summary: 'docker compose restart' })
  composeRestart(@Param('id') id: string) {
    return this.service.composeRestart(id);
  }

  @Get('stacks/:id/logs')
  @ApiOperation({ summary: 'Get stack logs' })
  @ApiQuery({ name: 'tail', required: false })
  getLogs(@Param('id') id: string, @Query('tail') tail?: string) {
    return this.service.getLogs(id, tail ? parseInt(tail) : 200);
  }

  @Get('stack-templates')
  @ApiOperation({ summary: 'List built-in stack templates' })
  getTemplates() {
    return this.service.getTemplates();
  }

  @Post('stack-templates/:templateId/generate')
  @ApiOperation({ summary: 'Generate YAML from template with overrides' })
  generateFromTemplate(
    @Param('templateId') templateId: string,
    @Body() overrides: Record<string, string>,
  ) {
    return this.service.generateFromTemplate(templateId, overrides);
  }
}
