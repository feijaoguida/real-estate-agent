import { Module } from '@nestjs/common';
import { EvolutionWebhookService } from './evolution-webhook.service';
import { EvolutionWebhookController } from './evolution-webhook.controller';
import { PrismaService } from 'src/prisma/prisma.service';
import { ChatGptService } from 'src/utils/chat-gpt.service';
import { EvolutionModule } from 'src/evolution/evolution.module';
import { QueueModule } from 'src/queue/queue.module';
import { AgentModule } from 'src/core/agent/agent.module';
import { RedisModule } from 'src/common/redis.module';

@Module({
  providers: [EvolutionWebhookService, PrismaService, ChatGptService],
  controllers: [EvolutionWebhookController],
  exports: [EvolutionWebhookService],
  imports: [EvolutionModule, QueueModule, AgentModule, RedisModule],
})
export class EvolutionWebhookModule {}
