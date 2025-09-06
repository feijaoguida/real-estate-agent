import { Body, Controller, Inject, Logger, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import Redis from 'ioredis';
import { EvolutionWebhookDTO } from './dto/evolution-webhook-new.dto';
import { EvolutionService } from '../evolution/evolution.service';
import { AgentService } from '../core/agent/agent.service';
import { Queue } from 'bullmq';
import { WebhookService } from './webhook.service';

@ApiTags('webhook')
@Controller('webhook')
export class WebhookController {
  private readonly logger = new Logger(WebhookController.name);

  constructor(private readonly webhookService: WebhookService) {}

  @Post('evolution-old')
  async handler(@Body() body: any) {
    return this.webhookService.handleEvolutionWebhook(body);
  }
}
