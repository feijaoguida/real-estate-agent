import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AgentsModule } from './agents/agents.module';
import { MessagesController } from './messages/messages.controller';
import { ChatGptService } from './utils/chat-gpt.service';
import { EvolutionService } from './utils/evolution.service';
import { EvolutionInstancesModule } from './evolution-instances/evolution-instances.module';
// import { PrismaService } from './prisma.old/prisma.service';
import { EvolutionWebhookModule } from './evolution-webhook/evolution-webhook.module';
import { RedisModule } from './common/redis.module';
import { QueueModule } from './queue/queue.module';
import { SupabaseModule } from './supabase/supabase.module';
import { ConfigModule } from '@nestjs/config';
import { SupabaseController } from './supabase/supabase.controller';

@Module({
  imports: [
    AgentsModule,
    EvolutionInstancesModule,
    EvolutionWebhookModule,
    RedisModule,
    QueueModule,
    SupabaseModule,
    ConfigModule.forRoot({
      isGlobal: true,
    }),
  ],
  controllers: [AppController, MessagesController, SupabaseController],
  providers: [AppService, ChatGptService, EvolutionService],
})
export class AppModule {}
