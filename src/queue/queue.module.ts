import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { BufferCheckProcessor } from './workers/buffer-check.processor';
import { OutboundProcessor } from './workers/outbound.processor';
import { EvolutionModule } from '../evolution/evolution.module';
import { AgentModule } from '../core/agent/agent.module';

@Module({
  imports: [
    BullModule.forRoot({
      connection: {
        url: process.env.REDIS_URL || 'redis://localhost:6379',
      },
    }),
    BullModule.registerQueue(
      { name: 'buffer-check' },
      { name: 'outbound' },
    ),
    EvolutionModule,
    AgentModule,
  ],
  providers: [BufferCheckProcessor, OutboundProcessor],
  exports: [BullModule],
})
export class QueueModule {}
