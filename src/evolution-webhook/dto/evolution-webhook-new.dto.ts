import { ApiProperty } from '@nestjs/swagger';

export class EvolutionWebhookNewDTO {
  @ApiProperty({ required: true })
  event!: string;

  @ApiProperty({ required: false })
  instance?: string;

  @ApiProperty({ required: false })
  apikey?: string;

  @ApiProperty({ required: true, type: () => Object })
  data!: any;
}
