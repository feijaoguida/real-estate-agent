import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { SupabaseService } from './supabase.service';
import { SupabaseController } from './supabase.controller';

@Module({
  imports: [HttpModule],
  providers: [SupabaseService],
  controllers: [SupabaseController],
  exports: [SupabaseService],
})
export class SupabaseModule {}
