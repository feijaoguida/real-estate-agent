import { Module } from '@nestjs/common';
import { AgentService } from './agent.service';
import { HttpModule } from '@nestjs/axios';

@Module({
  imports: [HttpModule],
  providers: [AgentService],
  exports: [AgentService],
})
export class AgentModule {}
