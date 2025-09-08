import { Controller, Post, Get, Param, Body, Query } from '@nestjs/common';
import { EvolutionInstancesService } from './evolution-instances.service';
import { CreateInstanceDTO } from './dto/create-instance.dto';
import { ApiBody, ApiOperation, ApiTags, ApiQuery } from '@nestjs/swagger';

@ApiTags('Evolution Instances')
@Controller('evolution-instances')
export class EvolutionInstancesController {
  constructor(private readonly service: EvolutionInstancesService) {}

  // @Post()
  // @ApiOperation({ summary: 'Cria uma nova instância e retorna QR Code' })
  // @ApiBody({ type: CreateInstanceDTO })
  // async create(@Body() dto: CreateInstanceDTO) {
  //   return this.service.createInstance(dto);
  // }

  // @Get()
  // @ApiOperation({ summary: 'Lista todas as instâncias' })
  // @ApiQuery({
  //   name: 'companyId',
  //   required: false,
  //   description: 'Filtrar por empresa (opcional)',
  // })
  // async listAll(@Query('companyId') companyId?: string) {
  //   return this.service.getAllInstances(companyId);
  // }

  // @Get(':sessionId')
  // @ApiOperation({ summary: 'Gera QR Code para uma instância existente' })
  // async getInstance(@Param('sessionId') sessionId: string) {
  //   const company = 'company-a';
  //   const sessionName = 'session-a';
  //   return this.service.getQRCode(sessionId, company, sessionName);
  // }
}
