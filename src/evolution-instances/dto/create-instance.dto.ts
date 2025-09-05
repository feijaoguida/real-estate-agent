import { IsString, IsBoolean, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateInstanceDTO {
  @ApiProperty({ description: 'ID da empresa (tenant)' })
  @IsString()
  companyId: string;

  @ApiProperty({ description: 'Nome da instância' })
  @IsString()
  instanceName: string;

  @ApiProperty({
    description: 'Número do WhatsApp da instância',
    example: '5541999999999',
  })
  @IsString()
  number: string;

  @ApiProperty({
    description: 'Integração desejada',
    example: 'WHATSAPP-BAILEYS',
  })
  @IsString()
  integration: string;

  @ApiProperty({ description: 'Gerar QR Code automaticamente', default: true })
  @IsBoolean()
  @IsOptional()
  qrcode?: boolean = true;

  @ApiProperty({ description: 'Rejeitar chamadas', default: true })
  @IsBoolean()
  @IsOptional()
  rejectCall?: boolean = true;

  @ApiProperty({
    description: 'Mensagem para chamadas rejeitadas',
    default: 'Chamadas não atendidas',
  })
  @IsString()
  @IsOptional()
  msgCall?: string = 'Chamadas não atendidas';

  @ApiProperty({ description: 'Ignorar grupos', default: true })
  @IsBoolean()
  @IsOptional()
  groupsIgnore?: boolean = true;

  @ApiProperty({ description: 'Sempre online', default: true })
  @IsBoolean()
  @IsOptional()
  alwaysOnline?: boolean = true;

  @ApiProperty({
    description: 'Marcar mensagens como lidas automaticamente',
    default: true,
  })
  @IsBoolean()
  @IsOptional()
  readMessages?: boolean = true;

  @ApiProperty({ description: 'Atualizar status das mensagens', default: true })
  @IsBoolean()
  @IsOptional()
  readStatus?: boolean = true;

  @ApiProperty({ description: 'Sincronizar histórico completo', default: true })
  @IsBoolean()
  @IsOptional()
  syncFullHistory?: boolean = true;
}
