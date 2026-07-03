import { Controller, Get, Post, Delete, Param } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { BackupService } from './backup.service';

@ApiTags('Backup')
@Controller()
export class BackupController {
  constructor(private service: BackupService) {}

  @Post('workspaces/:workspaceId/backup')
  @ApiOperation({ summary: 'Backup all workspace files' })
  backup(@Param('workspaceId') workspaceId: string) {
    return this.service.backupWorkspaceFiles(workspaceId);
  }

  @Get('workspaces/:workspaceId/backups')
  @ApiOperation({ summary: 'List all backups for a workspace' })
  listBackups(@Param('workspaceId') workspaceId: string) {
    return this.service.listBackups(workspaceId);
  }

  @Post('workspaces/:workspaceId/backups/:snapshotName/restore')
  @ApiOperation({ summary: 'Restore workspace from a backup snapshot' })
  restore(@Param('workspaceId') workspaceId: string, @Param('snapshotName') snapshotName: string) {
    return this.service.restoreBackup(workspaceId, snapshotName);
  }

  @Delete('workspaces/:workspaceId/backups/:snapshotName')
  @ApiOperation({ summary: 'Delete a backup snapshot' })
  deleteBackup(@Param('workspaceId') workspaceId: string, @Param('snapshotName') snapshotName: string) {
    return this.service.deleteBackup(workspaceId, snapshotName);
  }
}
