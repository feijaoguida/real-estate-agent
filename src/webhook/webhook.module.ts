import { Module } from '@nestjs/common';
import { WebhookController } from './webhook.controller';
import { EvolutionModule } from '../evolution/evolution.module';
import { QueueModule } from '../queue/queue.module';

@Module({
  imports: [EvolutionModule, QueueModule],
  controllers: [WebhookController],
})
export class WebhookModule {}
