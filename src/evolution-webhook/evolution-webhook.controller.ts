import {
  Body,
  Controller,
  Headers,
  HttpCode,
  Post,
  UnauthorizedException,
  UsePipes,
  ValidationPipe,
  Inject,
  Logger,
} from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiTags } from '@nestjs/swagger';
import { EvolutionWebhookService } from './evolution-webhook.service';
import { WebhookEventDto } from './dto/webhook-event.dto';
import { EvolutionWebhookDto } from './dto/evolution-webhook.dto';

import Redis from 'ioredis';
import { EvolutionWebhookNewDTO } from './dto/evolution-webhook-new.dto';
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

  @Post('evolution/messages-upsert')
  @HttpCode(200) // sempre responde 200 para confirmar recebimento
  async handleWebhookUpsert(
    @Body() body: any,
    @Headers('x-evolution-event') event: string, // cabeçalho enviado pela Evolution
  ) {
    console.log('Evento recebido:', event);
    console.log('Payload:', JSON.stringify(body, null, 2));

    if (event === 'MESSAGES_UPSERT') {
      // Mensagem recebida
      const messages = body.data;
      for (const msg of messages) {
        const from = msg.key.remoteJid; // número do cliente
        const text =
          msg.message?.conversation || msg.message?.extendedTextMessage?.text;

        console.log(`Mensagem de ${from}: ${text}`);

        // aqui você pode salvar no banco ou acionar lógica de resposta automática
      }
    }

    return { success: true };
  }

  // Mensagens recebidas
  @Post()
  @ApiBearerAuth()
  @UsePipes(new ValidationPipe({ whitelist: true }))
  async receiveWebhook(
    @Headers('authorization') authHeader: string,
    @Body() body: any,
  ) {
    if (!authHeader) throw new UnauthorizedException('Token ausente');

    const token = authHeader.replace('Bearer ', '');
    return this.webhookService.handleIncomingMessage(body, token);
  }

  // novo

  @Post('evolution')
  async handler(@Body() body: any) {
    const event = body.event;
    const data = (body as any).data || {};
    const apikey = (body as any).apikey || '';
    const instance =
      (body as any).instance || process.env.EVOLUTION_INSTANCE_ID || '';
    const key = data?.key || {};
    const remoteJid: string = key?.remoteJid || data?.remoteJid || '';
    const fromMe: boolean = !!key?.fromMe;
    const number = remoteJid?.replace(/[^0-9]/g, '');

    console.log('Evento recebido:', event);
    // console.log('Payload:', JSON.stringify(body, null, 2));

    // Regra: só processa messages.upsert
    if (event !== 'messages.upsert') {
      return { ok: true, ignored: true };
    }

    // Quando é do próprio atendente/humano: seta PAUSA (TTL 300s) e não responde.
    if (fromMe) {
      await this.redis.set(
        `Pausar:${remoteJid}`,
        data?.pushName || 'human',
        'EX',
        300,
      );
      return { ok: true, paused: true };
    }

    // Se estiver pausado, ignore
    const paused = await this.redis.get(`Pausar:${remoteJid}`);
    if (paused) return { ok: true, paused: true };

    // Deduz tipo de mensagem
    const msg = data?.message || {};
    let text: string | null = null;

    // Texto
    text = msg?.conversation || msg?.extendedTextMessage?.text || null;

    console.log('text', text);

    // Imagem (gera texto a partir da imagem)
    if (!text && msg?.imageMessage) {
      const keyId = key?.id;
      const b64 = await this.evo.getBase64FromMediaMessage(
        apikey,
        instance,
        keyId,
        false,
      );
      text = await this.agent.analyzeImageToText(b64);
    }

    // Áudio (transcreve)
    if (!text && (msg?.audioMessage || msg?.ptt)) {
      const keyId = key?.id;
      const b64 = await this.evo.getBase64FromMediaMessage(
        apikey,
        instance,
        keyId,
        false,
      );
      try {
        text = await this.agent.transcribeAudioBase64(b64);
      } catch {
        text = '(não consegui transcrever o áudio)';
      }
    }

    if (!text) {
      return { ok: true, ignored: true, reason: 'unsupported message type' };
    }

    // Guarda no buffer (RPUSH) e agenda verificação em 12s
    const listKey = `chat-buffer:${remoteJid}`;
    await this.redis.rpush(listKey, text);
    const lastMessage = text;
    await this.bufferCheckQueue.add(
      'check',
      {
        remoteJid,
        apikey,
        instance,
        pushName: data?.pushName || '',
        lastMessage,
        number,
      },
      { delay: 12000 },
    );

    console.log('Enviando para o buffer:', text);

    return { ok: true, queued: true };
  }
}
