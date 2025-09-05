import { Test, TestingModule } from '@nestjs/testing';
import { EvolutionInstancesService } from './evolution-instances.service';

describe('EvolutionInstancesService', () => {
  let service: EvolutionInstancesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [EvolutionInstancesService],
    }).compile();

    service = module.get<EvolutionInstancesService>(EvolutionInstancesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
