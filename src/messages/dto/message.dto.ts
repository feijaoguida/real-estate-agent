import { ApiProperty } from '@nestjs/swagger';

export class MessageDto {
  @ApiProperty({ example: '5511999999999', description: 'Número do cliente' })
  from: string;

  @ApiProperty({
    example: 'Qual o valor do apartamento no centro?',
    description: 'Mensagem do cliente',
  })
  message: string;
}
