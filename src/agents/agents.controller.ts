import { Controller, Post, Get, Body, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AgentsService } from './agents.service';
import { CreateAgentDto } from './dto/create-agent.dto';
import { AgentResponseDto } from './dto/agent-response.dto';

@ApiTags('Agents')
@Controller('agents')
export class AgentsController {
  constructor(private readonly agentsService: AgentsService) {}

  // @Post()
  // @ApiOperation({ summary: 'Cria um novo agente' })
  // @ApiResponse({
  //   status: 201,
  //   description: 'Agente criado com sucesso.',
  //   type: AgentResponseDto,
  // })
  // async create(@Body() body: CreateAgentDto) {
  //   return this.agentsService.createAgent(
  //     body.name,
  //     body.style,
  //     body.companyId,
  //   );
  // }

  // @Get()
  // @ApiOperation({ summary: 'Lista todos os agentes' })
  // @ApiResponse({
  //   status: 200,
  //   description: 'Lista de agentes',
  //   type: [AgentResponseDto],
  // })
  // async findAll() {
  //   return this.agentsService.getAllAgents();
  // }

  // @Get(':id')
  // @ApiOperation({ summary: 'Busca um agente pelo ID' })
  // @ApiResponse({
  //   status: 200,
  //   description: 'Agente encontrado',
  //   type: AgentResponseDto,
  // })
  // async findOne(@Param('id') id: string) {
  //   return this.agentsService.getAgentById(id);
  // }
}
