import { IsString, IsBoolean, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class BrowseFolderDto {
  @ApiProperty() @IsString() basePath: string;
  @ApiPropertyOptional() @IsOptional() @IsString() subPath?: string;
}

export class ReadFileDto {
  @ApiProperty() @IsString() filePath: string;
}

export class WriteFileDto {
  @ApiProperty() @IsString() filePath: string;
  @ApiProperty() @IsString() content: string;
}

export class CreateFolderDto {
  @ApiProperty() @IsString() parentPath: string;
  @ApiProperty() @IsString() name: string;
}

export class RenameNodeDto {
  @ApiProperty() @IsString() path: string;
  @ApiProperty() @IsString() newName: string;
}

export class DeleteNodeDto {
  @ApiProperty() @IsString() path: string;
}

export class DuplicateFileDto {
  @ApiProperty() @IsString() path: string;
}