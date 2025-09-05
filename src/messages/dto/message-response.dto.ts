import { ApiProperty } from '@nestjs/swagger';

export class MessageResponseDto {
  @ApiProperty({
    example:
      'O apartamento no centro está por R$ 350.000, possui 2 quartos e 1 vaga de garagem.',
    description: 'Resposta do agente IA',
  })
  reply: string;

  @ApiProperty({ example: 'ok', description: 'Status da operação' })
  status: string;
}
