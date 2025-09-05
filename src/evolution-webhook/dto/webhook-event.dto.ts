import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class WebhookEventDto {
  @ApiProperty({
    description:
      'Tipo do evento enviado pela Evolution (message, status, etc.)',
  })
  @IsString()
  event: string;

  @ApiProperty({
    description: 'Payload enviado pela Evolution contendo os dados do evento',
  })
  data: any;
}
