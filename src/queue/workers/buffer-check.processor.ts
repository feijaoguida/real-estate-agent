import { InjectQueue, Processor, WorkerHost } from '@nestjs/bullmq';
import { Inject, Logger } from '@nestjs/common';
import Redis from 'ioredis';
import { AgentService } from '../../core/agent/agent.service';
import { Queue } from 'bullmq';

type BufferCheckPayload = {
  remoteJid: string;
  apikey: string;
  instance: string;
  pushName?: string;
  lastMessage: string;
  number: string;
  userId: string;
};

@Processor('buffer-check', {
  lockDuration: 120000, // 2 minutos
  concurrency: 5, // até 5 jobs em paralelo
  stalledInterval: 30000, // checa jobs travados a cada 30s
  maxStalledCount: 3, // reprocessa job travado até 3 vezes
})
export class BufferCheckProcessor extends WorkerHost {
  private readonly logger = new Logger(BufferCheckProcessor.name);

  constructor(
    @Inject('REDIS') private readonly redis: Redis,
    private readonly agent: AgentService,
    @InjectQueue('outbound') private readonly outboundQueue: Queue,
  ) {
    super();
  }

  async process(job: any): Promise<any> {
    console.log('processando buffer-check');
    const {
      remoteJid,
      apikey,
      instance,
      pushName,
      lastMessage,
      number,
      userId,
    } = job.data as BufferCheckPayload;

    // revalida se entrou pausa nesse meio tempo
    const paused = await this.redis.get(`Pausar:${remoteJid}`);
    if (paused) {
      this.logger.log(`skip (paused) ${remoteJid}`);
      return;
    }

    const listKey = `chat-buffer:${remoteJid}`;
    let messages = await this.redis.lrange(listKey, 0, -1);

    // reset buffer do redis do remoteJid se lastMessage for igual a resetMensagens
    if (lastMessage === 'resetMensagens') {
      await this.redis.del(listKey);
      messages = [];
    }

    const currentLast = messages.length ? messages[messages.length - 1] : '';

    if (currentLast !== lastMessage) {
      this.logger.log(`skip (new message arrived) ${remoteJid}`);
      return;
    }

    // pega janela de contexto (últimas 15)
    let historyWindow = messages.slice(-15);
    let conversation = messages.join('\n');

    // reset buffer do redis do remoteJid se lastMessage for igual a resetMensagens
    if (lastMessage === 'resetMensagens') {
      await this.redis.del(listKey);
      messages = [];
      conversation = '';
      historyWindow = [];
    }

    const text = await this.agent.runAgent(
      pushName || '',
      conversation,
      historyWindow,
      userId,
    );

    // split por linhas / filtra vazias / ignora .webp
    const lines = text
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l && !l.endsWith('.webp'));

    // dispara os jobs em paralelo, respeitando delay incremental
    const jobs = lines.map((line, idx) =>
      this.outboundQueue.add(
        'send',
        { apikey, instance, number, text: line },
        { delay: idx * 6000 }, // delay incremental
      ),
    );

    await Promise.all(jobs);

    this.logger.log(`Enviando ${lines.length} mensagens para ${number}`);
    return { sent: lines.length };
  }
}
