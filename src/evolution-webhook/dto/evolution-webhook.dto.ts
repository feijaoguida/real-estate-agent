import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsBoolean, IsOptional } from 'class-validator';

export class EvolutionWebhookDto {
  @ApiProperty({ example: 'message' })
  @IsString()
  event: string;

  @ApiProperty({ example: '5541999999999' })
  @IsString()
  from: string;

  @ApiProperty({ example: false, default: false })
  @IsBoolean()
  fromMe: boolean;

  @ApiProperty({ example: '5541988888888' })
  @IsString()
  to: string;

  @ApiProperty({ example: 'text' })
  @IsString()
  type: string;

  @ApiProperty({ example: 'Olá, tudo bem?' })
  @IsString()
  body: string;

  @ApiProperty({ example: '2025-08-29T00:00:00.000Z' })
  @IsString()
  timestamp: string;

  @ApiProperty({ example: true })
  @IsOptional()
  @IsBoolean()
  ack?: boolean;
}
