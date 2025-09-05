import { Module } from '@nestjs/common';
import { EvolutionInstancesService } from './evolution-instances.service';
import { EvolutionInstancesController } from './evolution-instances.controller';
import { PrismaService } from 'src/prisma/prisma.service';

@Module({
  providers: [EvolutionInstancesService, PrismaService],
  controllers: [EvolutionInstancesController],
})
export class EvolutionInstancesModule {}
