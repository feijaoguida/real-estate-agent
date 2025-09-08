import {
  Inject,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
// import { PrismaService } from '../prisma.old/prisma.service';
import { WebhookEventDto } from './dto/webhook-event.dto';
import { EvolutionWebhookDto } from './dto/evolution-webhook.dto';
import { ChatGptService } from 'src/utils/chat-gpt.service';
import axios from 'axios';
import { Queue } from 'bullmq';
import Redis from 'ioredis';
import { EvolutionService } from 'src/evolution/evolution.service';
import { AgentService } from 'src/core/agent/agent.service';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { SupabaseService } from 'src/supabase/supabase.service';

interface MessageBuffer {
  messages: string[];
  timeout?: NodeJS.Timeout;
}

@Injectable()
export class EvolutionWebhookService {
  private readonly logger = new Logger(EvolutionWebhookService.name);
  private serverUrl = process.env.EVOLUTION_API_URL;
  private apiKey = process.env.EVOLUTION_API_KEY;
  private readonly supabase: SupabaseClient;

  // Buffer em memória (chave: número do cliente)
  private messageBuffer: Map<string, MessageBuffer> = new Map();

  private readonly TIMEOUT_MS = 12000; // 12 segundos

  private bufferCheckQueue: Queue;
  private outboundQueue: Queue;

  constructor(
    // private readonly prisma: PrismaService,
    private readonly chatGptService: ChatGptService,
    @Inject('REDIS') private readonly redis: Redis,
    private readonly evo: EvolutionService,
    private readonly agent: AgentService,
    private readonly supabaseService: SupabaseService,
  ) {
    // Cria filas ad-hoc (útil para add jobs direto daqui também)
    const IORedis = require('ioredis');
    const conn = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379');
    const { Queue } = require('bullmq');
    this.bufferCheckQueue = new Queue('buffer-check', { connection: conn });
    this.outboundQueue = new Queue('outbound', { connection: conn });

    this.supabase = createClient(
      process.env.SUPABASE_BASE_URL!,
      process.env.SUPABASE_ANON_OR_SERVICE_KEY!,
    );
  }

  async handleEvolutionWebhook(body: any) {
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

    const userGet = await this.getUserIdByInstance(instance);

    console.log(
      '########### userGet getUserIdByInstance ##############',
      userGet,
    );

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
        userId: userGet,
      },
      { delay: 12000 },
    );

    console.log('Enviando para o buffer:', text);

    return { ok: true, queued: true };
  }

  async getUserIdByInstance(instanceName: string): Promise<string | null> {
    const cacheKey = `whatsapp_config:${instanceName}`;

    console.log('cacheKey getUserIdByInstance', cacheKey);

    // 1 - tenta pegar do Redis
    const cached = await this.redis.get(cacheKey);
    if (cached) {
      this.logger.debug(`Cache HIT para ${instanceName}`);
      return cached;
    }

    this.logger.debug(
      `Cache MISS para ${instanceName}, consultando Supabase...`,
    );

    // 2 - consulta no service getUserByInstanceName
    const data = await this.supabaseService.getUserByInstanceName(instanceName);

    // if (error) {
    //   this.logger.error(
    //     `Erro ao buscar userId para ${instanceName}: ${error.message}`,
    //   );
    //   return null;
    // }

    if (!data) {
      this.logger.warn(`Nenhum user_id encontrado para ${instanceName}`);
      return null;
    }

    const userId = data[0]?.user_id;

    // 3 - salva no Redis com TTL (ex: 1h)
    await this.redis.setex(cacheKey, 3600, userId);

    this.logger.debug(`Cache SET para ${instanceName} com userId ${userId}`);

    return userId;
  }

  // /**
  //  * Mensagens recebidas da Evolution
  //  */
  // async handleIncomingMessage(
  //   payload: any,
  //   token: string,
  // ): Promise<{ success: boolean }> {
  //   this.logger.log('📩 handleIncomingMessage Mensagem recebida de', payload);
  //   this.logger.log(
  //     '📩 handleIncomingMessage Mensagem recebida de from',
  //     payload?.from,
  //   );

  //   // 1️⃣ Buscar a instância pelo token
  //   const instance = await this.prisma.evolutionInstance.findUnique({
  //     where: { token },
  //     include: { company: true },
  //   });

  //   console.log('handleIncomingMessage instance', instance);

  //   if (!instance) {
  //     this.logger.error(`❌ Token inválido: ${token}`);
  //     throw new UnauthorizedException('Instância não encontrada');
  //   }

  //   // 2️⃣ Buscar ou criar o cliente na empresa correta
  //   const from = payload.data.key.remoteJid.replace('@s.whatsapp.net', '');
  //   const text =
  //     payload.message?.conversation ||
  //     payload.message?.extendedTextMessage?.text ||
  //     '';

  //   let customer = await this.prisma.customer.findFirst({
  //     where: {
  //       phone: from,
  //       companyId: instance.companyId,
  //     },
  //   });

  //   console.log('handleIncomingMessage customer', customer);

  //   if (!customer) {
  //     customer = await this.prisma.customer.create({
  //       data: {
  //         phone: from,
  //         companyId: instance.companyId,
  //       },
  //     });
  //     this.logger.log(`🆕 Novo cliente criado: ${customer.phone}`);
  //   }

  //   // 3️⃣ Buscar ou criar o chat específico da instância e cliente
  //   let chat = await this.prisma.chat.findFirst({
  //     where: {
  //       instanceId: instance.id,
  //       customerId: customer.id,
  //     },
  //   });

  //   if (!chat) {
  //     chat = await this.prisma.chat.create({
  //       data: {
  //         instanceId: instance.id,
  //         customerId: customer.id,
  //       },
  //     });
  //     this.logger.log(
  //       `🆕 Novo chat criado | Instância: ${instance.name} | Cliente: ${customer.phone}`,
  //     );
  //   }

  //   // 4️⃣ Salvar mensagem
  //   await this.prisma.message.create({
  //     data: {
  //       chatId: chat.id,
  //       fromMe: false,
  //       text,
  //     },
  //   });

  //   this.logger.log(
  //     `✅ Mensagem salva | Empresa: ${instance.company.name} | Cliente: ${customer.phone} | Instância: ${instance.name}`,
  //   );

  //   // 5️⃣ Gerar resposta via ChatGPT
  //   const reply = await this.chatGptService.sendMessage(text);

  //   // 6️⃣ Enviar resposta pelo Evolution API
  //   try {
  //     await axios.post(
  //       `${this.serverUrl}/message/sendText/${instance.name}`,
  //       {
  //         number: from,
  //         text: reply,
  //       },
  //       { headers: { apikey: this.apiKey } },
  //     );

  //     this.logger.log(`📤 Resposta enviada para ${from}: ${reply}`);
  //   } catch (err) {
  //     this.logger.error('❌ Erro ao enviar mensagem pelo Evolution API', err);
  //   }

  //   // 7️⃣ Salvar resposta no banco
  //   await this.prisma.message.create({
  //     data: { chatId: chat.id, fromMe: true, text: reply },
  //   });

  //   return { success: true };
  // }

  /**
   * Eventos genéricos (status, conexão, etc)
   */
  //   async handleEvent(eventDto: WebhookEventDto, token: string): Promise<void> {
  //     console.log('eventDto', eventDto);

  //     const instance = await this.prisma.evolutionInstance.findUnique({
  //       where: { token },
  //       include: { company: true },
  //     });

  //     if (!instance) {
  //       this.logger.error(`❌ Token inválido para evento: ${token}`);
  //       throw new UnauthorizedException('Instância não encontrada');
  //     }

  //     switch (eventDto.event) {
  //       case 'message':
  //         this.logger.debug(
  //           `📨 Evento message recebido: ${JSON.stringify(eventDto.data)} | Empresa: ${instance.company.name}`,
  //         );
  //         break;

  //       case 'status':
  //         this.logger.debug(
  //           `⚡ Evento status recebido: ${JSON.stringify(eventDto.data)} | Instância: ${instance.name}`,
  //         );
  //         break;

  //       default:
  //         this.logger.warn(
  //           `⚠ Evento não tratado: ${eventDto.event} | Empresa: ${instance.company.name}`,
  //         );
  //         break;
  //     }
  //   }
  //
}
