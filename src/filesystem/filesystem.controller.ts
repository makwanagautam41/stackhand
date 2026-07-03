import { Controller, Post, Get, Body, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { FilesystemService } from './filesystem.service';
import { BrowseFolderDto, ReadFileDto, WriteFileDto, CreateFolderDto, RenameNodeDto, DeleteNodeDto, DuplicateFileDto } from './dto';

@ApiTags('Filesystem')
@ApiBearerAuth()
@Controller('filesystem')
export class FilesystemController {
  constructor(private service: FilesystemService) {}

  @Post('browse')
  @ApiOperation({ summary: 'Browse folder contents' })
  browse(@Body() dto: BrowseFolderDto) {
    return this.service.browse(dto.basePath, dto.subPath);
  }

  @Post('tree')
  @ApiOperation({ summary: 'Get full recursive file tree' })
  getTree(@Body() dto: BrowseFolderDto) {
    return this.service.getTree(dto.basePath, dto.subPath);
  }

  @Post('read')
  @ApiOperation({ summary: 'Read file content' })
  readFile(@Body() dto: ReadFileDto) {
    return this.service.readFile(dto.filePath);
  }

  @Post('write')
  @ApiOperation({ summary: 'Write file content (with YAML validation)' })
  writeFile(@Body() dto: WriteFileDto) {
    return this.service.writeFile(dto.filePath, dto.content);
  }

  @Post('create-folder')
  @ApiOperation({ summary: 'Create a folder' })
  createFolder(@Body() dto: CreateFolderDto) {
    return this.service.createFolder(dto.parentPath, dto.name);
  }

  @Post('rename')
  @ApiOperation({ summary: 'Rename a file or folder' })
  rename(@Body() dto: RenameNodeDto) {
    return this.service.rename(dto.path, dto.newName);
  }

  @Post('delete')
  @ApiOperation({ summary: 'Delete a file or folder' })
  delete(@Body() dto: DeleteNodeDto) {
    return this.service.delete(dto.path);
  }

  @Post('duplicate')
  @ApiOperation({ summary: 'Duplicate a file' })
  duplicate(@Body() dto: DuplicateFileDto) {
    return this.service.duplicate(dto.path);
  }
}
