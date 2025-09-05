import { Test, TestingModule } from '@nestjs/testing';
import { EvolutionWebhookController } from './evolution-webhook.controller';

describe('EvolutionWebhookController', () => {
  let controller: EvolutionWebhookController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [EvolutionWebhookController],
    }).compile();

    controller = module.get<EvolutionWebhookController>(EvolutionWebhookController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
