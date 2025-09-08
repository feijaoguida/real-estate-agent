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

  @Post('evolution')
  async handler(@Body() body: any) {
    return this.webhookService.handleEvolutionWebhook(body);
  }
}
