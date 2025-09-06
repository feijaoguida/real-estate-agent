import { Body, Controller, Post, Inject, Logger } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { EvolutionWebhookService } from './evolution-webhook.service';

import Redis from 'ioredis';
import { EvolutionService } from '../evolution/evolution.service';
import { AgentService } from '../core/agent/agent.service';
import { Queue } from 'bullmq';

@ApiTags('webhook')
@Controller('webhook')
export class EvolutionWebhookController {
  private readonly logger = new Logger(EvolutionWebhookController.name);
  private bufferCheckQueue: Queue;
  private outboundQueue: Queue;

  constructor(
    private readonly webhookService: EvolutionWebhookService,
    @Inject('REDIS') private readonly redis: Redis,
    private readonly evo: EvolutionService,
    private readonly agent: AgentService,
  ) {
    // Cria filas ad-hoc (útil para add jobs direto daqui também)
    const IORedis = require('ioredis');
    const conn = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379');
    const { Queue } = require('bullmq');
    this.bufferCheckQueue = new Queue('buffer-check', { connection: conn });
    this.outboundQueue = new Queue('outbound', { connection: conn });
  }

  // Mensagens recebidas
  // @Post()
  // @ApiBearerAuth()
  // @UsePipes(new ValidationPipe({ whitelist: true }))
  // async receiveWebhook(
  //   @Headers('authorization') authHeader: string,
  //   @Body() body: any,
  // ) {
  //   if (!authHeader) throw new UnauthorizedException('Token ausente');

  //   const token = authHeader.replace('Bearer ', '');
  //   return this.webhookService.handleIncomingMessage(body, token);
  // }

  // novo

  @Post('evolution')
  async handler(@Body() body: any) {
    return this.webhookService.handleEvolutionWebhook(body);
  }

  // Eventos genéricos
  // @Post()
  // @ApiBearerAuth()
  // @ApiBody({ type: WebhookEventDto })
  // @UsePipes(new ValidationPipe({ whitelist: true }))
  // async handleWebhook(
  //   @Body() body: WebhookEventDto,
  //   @Headers('authorization') token: string,
  // ) {
  //   if (!token) throw new UnauthorizedException('Token ausente');
  //   await this.webhookService.handleEvent(body, token.replace('Bearer ', ''));
  //   return { success: true };
  // }

  // @Post()
  // @HttpCode(200) // sempre responde 200 para confirmar recebimento
  // async handleWebhook(
  //   @Body() body: any,
  //   @Headers('x-evolution-event') event: string, // cabeçalho enviado pela Evolution
  // ) {
  //   console.log('Evento recebido:', event);
  //   console.log('Payload:', JSON.stringify(body, null, 2));

  //   if (event === 'MESSAGES_UPSERT') {
  //     // Mensagem recebida
  //     const messages = body.data;
  //     for (const msg of messages) {
  //       const from = msg.key.remoteJid; // número do cliente
  //       const text =
  //         msg.message?.conversation || msg.message?.extendedTextMessage?.text;

  //       console.log(`Mensagem de ${from}: ${text}`);

  //       // aqui você pode salvar no banco ou acionar lógica de resposta automática
  //     }
  //   }

  //   return { success: true };
  // }

  // @Post('evolution/messages-upsert')
  // @HttpCode(200) // sempre responde 200 para confirmar recebimento
  // async handleWebhookUpsert(
  //   @Body() body: any,
  //   @Headers('x-evolution-event') event: string, // cabeçalho enviado pela Evolution
  // ) {
  //   console.log('Evento recebido:', event);
  //   console.log('Payload:', JSON.stringify(body, null, 2));

  //   if (event === 'MESSAGES_UPSERT') {
  //     // Mensagem recebida
  //     const messages = body.data;
  //     for (const msg of messages) {
  //       const from = msg.key.remoteJid; // número do cliente
  //       const text =
  //         msg.message?.conversation || msg.message?.extendedTextMessage?.text;

  //       console.log(`Mensagem de ${from}: ${text}`);

  //       // aqui você pode salvar no banco ou acionar lógica de resposta automática
  //     }
  //   }

  //   return { success: true };
  // }
}
