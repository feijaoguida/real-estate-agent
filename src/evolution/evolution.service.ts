import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class EvolutionService {
  constructor(private readonly http: HttpService) {}

  async sendText(
    apikey: string,
    number: string,
    text: string,
    instance: string,
  ) {
    const base = process.env.EVOLUTION_API_URL;
    //const instance = process.env.EVOLUTION_INSTANCE_ID || 'feijaoTeste';
    const path = process.env.EVOLUTION_SENDTEXT_PATH || '/message/sendText';
    if (!base || !instance) {
      throw new Error(
        'EVOLUTION_API_URL e EVOLUTION_INSTANCE_ID são obrigatórios.',
      );
    }
    const url = `${base}${path}/${instance}`;
    const res$ = this.http.post(url, { number, text }, { headers: { apikey } });
    const { data } = await firstValueFrom(res$);
    return data;
  }

  async getBase64FromMediaMessage(
    apikey: string,
    instance: string,
    messageKeyId: string,
    convertToMp4 = false,
  ) {
    const base = process.env.EVOLUTION_API_URL;
    if (!base) throw new Error('EVOLUTION_API_URL é obrigatório.');
    const url = `${base}/chat/getBase64FromMediaMessage/${instance}`;
    const body = { message: { key: { id: messageKeyId } }, convertToMp4 };
    const res$ = this.http.post(url, body, { headers: { apikey } });
    const { data } = await firstValueFrom(res$);
    // A Evolution retorna objeto com base64 em data?.result?.data ou algo similar — consolidamos:
    const base64 = data?.base64 || data?.result?.data || data?.data;
    return base64;
  }
}
