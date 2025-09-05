import { Injectable } from '@nestjs/common';
import axios from 'axios';

@Injectable()
export class EvolutionService {
  async sendMessage(to: string, message: string) {
    return axios.post(
      `${process.env.EVOLUTION_API_URL}/sendMessage`,
      {
        to,
        message,
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.EVOLUTION_API_KEY}`,
        },
      },
    );
  }
}
