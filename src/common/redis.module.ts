import { Global, Module } from '@nestjs/common';
import Redis from 'ioredis';

@Global()
@Module({
  providers: [
    {
      provide: 'REDIS',
      useFactory: async () => {
        const url = process.env.REDIS_URL || 'redis://localhost:6379';
        const client = new Redis(url, { maxRetriesPerRequest: null, enableReadyCheck: true });
        return client;
      },
    },
  ],
  exports: ['REDIS'],
})
export class RedisModule {}
