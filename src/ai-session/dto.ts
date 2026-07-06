import { IsString, IsOptional, IsArray, IsObject } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateAiSessionDto {
  @ApiProperty() @IsString() workspaceId: string;
  @ApiProperty() @IsString() name: string;
  @ApiPropertyOptional() @IsOptional() @IsString() model?: string;
  @ApiPropertyOptional() @IsOptional() @IsObject() options?: Record<string, any>;
}

export class UpdateAiSessionDto {
  @ApiPropertyOptional() @IsOptional() @IsString() name?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() model?: string;
  @ApiPropertyOptional() @IsOptional() @IsObject() options?: Record<string, any>;
}

export class CreateAiMessageDto {
  @ApiProperty() @IsString() role: string;
  @ApiProperty() @IsString() content: string;
}

export class UpdateAiMessageDto {
  @ApiProperty() @IsString() content: string;
}
