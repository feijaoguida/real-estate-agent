import { IsString, IsBoolean, IsOptional, IsArray } from 'class-validator';

export class WebhookDTO {
  @IsString()
  url: string;

  @IsBoolean()
  byEvents: boolean;

  @IsBoolean()
  base64: boolean;

  @IsOptional()
  headers?: Record<string, string>;

  @IsArray()
  events: string[];
}
