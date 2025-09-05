import { IsNotEmpty, IsString, IsOptional, IsUUID } from 'class-validator';

export class WebhookMessageDto {
  @IsUUID()
  @IsNotEmpty()
  companyId: string; // Tenant da mensagem

  @IsString()
  @IsNotEmpty()
  instanceId: string; // ID da instância Evolution

  @IsString()
  @IsNotEmpty()
  from: string; // Número que enviou a mensagem

  @IsString()
  @IsOptional()
  to?: string; // Número que recebeu a mensagem (nosso bot)

  @IsString()
  @IsOptional()
  message?: string; // Conteúdo textual

  @IsString()
  @IsOptional()
  type?: string; // Tipo da mensagem (text, image, audio, etc.)

  @IsString()
  @IsOptional()
  rawPayload?: string; // JSON original vindo da Evolution
}
