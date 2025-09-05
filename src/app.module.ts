import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AgentsModule } from './agents/agents.module';
import { MessagesController } from './messages/messages.controller';
import { ChatGptService } from './utils/chat-gpt.service';
import { EvolutionService } from './utils/evolution.service';
import { EvolutionInstancesModule } from './evolution-instances/evolution-instances.module';
import { PrismaService } from './prisma/prisma.service';
import { EvolutionWebhookModule } from './evolution-webhook/evolution-webhook.module';
import { RedisModule } from './common/redis.module';
import { QueueModule } from './queue/queue.module';

@Module({
  imports: [
    AgentsModule,
    EvolutionInstancesModule,
    EvolutionWebhookModule,
    RedisModule,
    QueueModule,
  ],
  controllers: [AppController, MessagesController],
  providers: [AppService, ChatGptService, EvolutionService, PrismaService],
})
export class AppModule {}
