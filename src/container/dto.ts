import { IsString, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ContainerActionDto {
  @ApiProperty() @IsString() id: string;
}

export class ContainerLogsDto {
  @ApiProperty() @IsString() id: string;
  @ApiPropertyOptional() @IsOptional() tail?: number;
}
