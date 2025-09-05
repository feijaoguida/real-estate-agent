import { ApiProperty } from '@nestjs/swagger';

export class CreateAgentDto {
  @ApiProperty({
    example: 'VendedorImobiliaria',
    description: 'Nome do agente',
  })
  name: string;

  @ApiProperty({
    example: 'Id da Empresa',
    description: 'Id da empresa',
  })
  companyId: string;

  @ApiProperty({
    example: 'Persuasivo, Educado, Rápido',
    description: 'Estilo de venda do agente',
  })
  style: string;
}
