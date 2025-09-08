import { Module } from '@nestjs/common';
import { AgentService } from './agent.service';
import { HttpModule } from '@nestjs/axios';
import { SupabaseModule } from 'src/supabase/supabase.module';

@Module({
  imports: [HttpModule, SupabaseModule],
  providers: [AgentService],
  exports: [AgentService],
})
export class AgentModule {}
