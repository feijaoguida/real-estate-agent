import { Injectable, Logger } from '@nestjs/common';
import Redis from 'ioredis';
import { EvolutionWebhookDTO } from './dto/evolution-webhook-new.dto';
import { EvolutionService } from '../evolution/evolution.service';
import { AgentService } from '../core/agent/agent.service';
import { Queue } from 'bullmq';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

@Injectable()
export class WebhookService {
  private readonly logger = new Logger(WebhookService.name);
  private readonly supabase: SupabaseClient;
  private bufferCheckQueue: Queue;
  private outboundQueue: Queue;

  constructor(
    private readonly redis: Redis,
    private readonly evo: EvolutionService,
    private readonly agent: AgentService,
  ) {
    const IORedis = require('ioredis');
    const conn = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379');
    const { Queue } = require('bullmq');
    this.bufferCheckQueue = new Queue('buffer-check', { connection: conn });
    this.outboundQueue = new Queue('outbound', { connection: conn });

    this.supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );
  }

  async getUserIdByInstance(instanceName: string): Promise<string | null> {
    const cacheKey = `whatsapp_config:${instanceName}`;

    // 1 - tenta pegar do Redis
    const cached = await this.redis.get(cacheKey);
    if (cached) {
      this.logger.debug(`Cache HIT para ${instanceName}`);
      return cached;
    }

    this.logger.debug(
      `Cache MISS para ${instanceName}, consultando Supabase...`,
    );

    // 2 - consulta no Supabase
    const { data, error } = await this.supabase
      .from('whatsapp_configs')
      .select('user_id')
      .eq('instance_name', instanceName)
      .single();

    if (error) {
      this.logger.error(
        `Erro ao buscar userId para ${instanceName}: ${error.message}`,
      );
      return null;
    }

    if (!data?.user_id) {
      this.logger.warn(`Nenhum user_id encontrado para ${instanceName}`);
      return null;
    }

    const userId = data.user_id;

    // 3 - salva no Redis com TTL (ex: 1h)
    await this.redis.setex(cacheKey, 3600, userId);

    return userId;
  }

  async handleEvolutionWebhook(body: EvolutionWebhookDTO) {
    const event = body.event;
    const data = (body as any).data || {};
    const apikey = (body as any).apikey || '';
    const instance =
      (body as any).instance || process.env.EVOLUTION_INSTANCE_ID || '';
    const key = data?.key || {};
    const remoteJid: string = key?.remoteJid || data?.remoteJid || '';
    const fromMe: boolean = !!key?.fromMe;
    const number = remoteJid?.replace(/[^0-9]/g, '');

    if (event !== 'messages.upsert') {
      return { ok: true, ignored: true };
    }

    if (fromMe) {
      await this.redis.set(
        `Pausar:${remoteJid}`,
        data?.pushName || 'human',
        'EX',
        300,
      );
      return { ok: true, paused: true };
    }

    const paused = await this.redis.get(`Pausar:${remoteJid}`);
    if (paused) return { ok: true, paused: true };

    let text: string | null = null;
    const msg = data?.message || {};

    // Texto
    text = msg?.conversation || msg?.extendedTextMessage?.text || null;

    // Imagem
    if (!text && msg?.imageMessage) {
      const b64 = await this.evo.getBase64FromMediaMessage(
        apikey,
        instance,
        key?.id,
        false,
      );
      text = await this.agent.analyzeImageToText(b64);
    }

    // Áudio
    if (!text && (msg?.audioMessage || msg?.ptt)) {
      const b64 = await this.evo.getBase64FromMediaMessage(
        apikey,
        instance,
        key?.id,
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

    const userId = await this.getUserIdByInstance(instance);
    if (!userId) {
      return { ok: true, ignored: true, reason: 'no user id found' };
    }

    // Enfileira para processamento
    const listKey = `chat-buffer:${remoteJid}`;
    await this.redis.rpush(listKey, text);
    await this.bufferCheckQueue.add(
      'check',
      {
        remoteJid,
        apikey,
        instance,
        pushName: data?.pushName || '',
        lastMessage: text,
        number,
        userId,
      },
      { delay: 12000 },
    );

    return { ok: true, queued: true };
  }
}
