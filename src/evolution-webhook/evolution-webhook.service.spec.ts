import { Test, TestingModule } from '@nestjs/testing';
import { EvolutionWebhookService } from './evolution-webhook.service';

describe('EvolutionWebhookService', () => {
  let service: EvolutionWebhookService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [EvolutionWebhookService],
    }).compile();

    service = module.get<EvolutionWebhookService>(EvolutionWebhookService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
