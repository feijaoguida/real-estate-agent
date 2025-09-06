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

@Processor('buffer-check')
export class BufferCheckProcessor extends WorkerHost {
  private readonly logger = new Logger(BufferCheckProcessor.name);

  constructor(
    @Inject('REDIS') private readonly redis: Redis,
    private readonly agent: AgentService,
    @InjectQueue('outbound') private readonly outboundQueue: Queue, // 👈 injetamos a fila outbound
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
    const messages = await this.redis.lrange(listKey, 0, -1);
    const currentLast = messages.length ? messages[messages.length - 1] : '';

    if (currentLast !== lastMessage) {
      this.logger.log(`skip (new message arrived) ${remoteJid}`);
      return;
    }

    // pega janela de contexto (últimas 15)
    const historyWindow = messages.slice(-15);
    const conversation = messages.join('\n');
    const text = await this.agent.runAgent(
      pushName || '',
      conversation,
      historyWindow,
      userId,
    );

    // split por linhas / filtra vazias / ignora .webp (espelhando switch do N8N)
    const lines = text
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l && !l.endsWith('.webp'));

    let delay = 0;
    for (const line of lines) {
      await this.outboundQueue.add(
        'send',
        { apikey, instance, number, text: line },
        { delay },
      );
      delay += 7000; // 7s
    }

    // await outbound.close();
    // await conn.quit();

    this.logger.log(`Enviando ${lines.length} mensagens para ${number}`);
    return { sent: lines.length };
  }
}
