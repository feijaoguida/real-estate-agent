import { Module } from '@nestjs/common';
import { EvolutionService } from './evolution.service';
import { HttpModule } from '@nestjs/axios';

@Module({
  imports: [HttpModule],
  providers: [EvolutionService],
  exports: [EvolutionService],
})
export class EvolutionModule {}
