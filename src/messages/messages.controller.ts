import { Controller, Post, Body, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

import { ChatGptService } from 'src/utils/chat-gpt.service';
import { EvolutionService } from 'src/utils/evolution.service';
import { AgentsService } from '../agents/agents.service';
import { MessageDto } from './dto/message.dto';
import { MessageResponseDto } from './dto/message-response.dto';

@ApiTags('Messages')
@Controller('messages')
export class MessagesController {
  constructor(
    private readonly chatGptService: ChatGptService,
    private readonly evolutionService: EvolutionService,
    private readonly agentsService: AgentsService,
  ) {}

  // @Post()
  // @ApiOperation({
  //   summary: 'Recebe mensagem do WhatsApp e responde via agente IA',
  // })
  // @ApiResponse({
  //   status: 201,
  //   description: 'Mensagem processada e resposta enviada.',
  //   type: MessageResponseDto,
  // })
  // async receiveMessage(
  //   @Body() body: MessageDto,
  //   @Query('agentId') agentId?: string, // Opcional, pode escolher agente
  // ) {
  //   const { from, message } = body;

  //   let agentStyle: string | undefined;

  //   if (agentId) {
  //     const agent = await this.agentsService.getAgentById(agentId);
  //     if (agent) agentStyle = agent.style;
  //   }

  //   console.log('agentStyle', agentStyle);

  //   // Envia para o ChatGPT com estilo do agente
  //   const reply = await this.chatGptService.sendMessage(message, agentStyle);

  //   console.log('reply', reply);

  //   // Responde via Evolution
  //   await this.evolutionService.sendMessage(from, reply);

  //   return { status: 'ok', reply };
  // }
}
