import { Test, TestingModule } from '@nestjs/testing';
import { EvolutionInstancesController } from './evolution-instances.controller';

describe('EvolutionInstancesController', () => {
  let controller: EvolutionInstancesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [EvolutionInstancesController],
    }).compile();

    controller = module.get<EvolutionInstancesController>(EvolutionInstancesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
