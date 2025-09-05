import { ApiProperty } from '@nestjs/swagger';

export class AgentResponseDto {
  @ApiProperty({ example: 1, description: 'ID do agente' })
  id: number;

  @ApiProperty({
    example: 'VendedorImobiliaria',
    description: 'Nome do agente',
  })
  name: string;

  @ApiProperty({
    example: 'Persuasivo, Educado, Rápido',
    description: 'Estilo de venda do agente',
  })
  style: string;

  @ApiProperty({
    example: '2025-08-28T21:00:00.000Z',
    description: 'Data de criação',
  })
  createdAt: Date;
}
