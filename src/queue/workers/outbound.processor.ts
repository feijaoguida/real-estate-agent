import { Processor, WorkerHost } from '@nestjs/bullmq';
import { EvolutionService } from '../../evolution/evolution.service';
import { Logger } from '@nestjs/common';

type OutboundJob = {
  apikey: string;
  instance: string;
  number: string;
  text: string;
};

type JobData = {
  data: OutboundJob;
};

@Processor('outbound')
export class OutboundProcessor extends WorkerHost {
  private readonly logger = new Logger(OutboundProcessor.name);

  constructor(private readonly evo: EvolutionService) {
    super();
  }

  async process(job: JobData): Promise<any> {
    const { apikey, number, text, instance } = job.data;

    this.logger.log(`Enviando mensagem para ${number}: ${text}`);
    try {
      const res = await this.evo.sendText(apikey, number, text, instance);
      return res;
    } catch (e: any) {
      this.logger.error(`Erro ao enviar mensagem: ${e?.message}`);
      throw e;
    }
  }
}
