import { IsString, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateStackDto {
  @ApiProperty() @IsString() name: string;
  // workspaceId is injected from the URL path param by the controller, not from the request body
  @ApiPropertyOptional() @IsOptional() @IsString() workspaceId?: string;
  @ApiProperty() @IsString() yaml: string;
  @ApiPropertyOptional() @IsOptional() @IsString() folderName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() envContent?: string;
}

export class UpdateStackYamlDto {
  @ApiProperty() @IsString() yaml: string;
}
