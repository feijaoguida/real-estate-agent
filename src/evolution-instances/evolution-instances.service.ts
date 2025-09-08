import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
// import { PrismaService } from '../prisma.old/prisma.service';
import { CreateInstanceDTO } from './dto/create-instance.dto';
import { randomUUID } from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import * as qrcode from 'qrcode-terminal';

@Injectable()
export class EvolutionInstancesService {
  private readonly logger = new Logger(EvolutionInstancesService.name);

  // constructor(private readonly prisma: PrismaService) {}

  private serverUrl = process.env.EVOLUTION_API_URL; // Evolution API
  private appUrl = process.env.APP_URL; // URL da sua API (webhook)
  private apiKey = process.env.EVOLUTION_API_KEY; // API Key global

  // async createInstance(dto: CreateInstanceDTO) {
  //   // 1️⃣ Gerar token único para esta instância
  //   const token = randomUUID();

  //   // 2️⃣ Payload para Evolution
  //   const payload = {
  //     instanceName: dto.instanceName,
  //     token,
  //     qrcode: true,
  //     number: dto.number || null,
  //     integration: dto.integration || 'WHATSAPP-BAILEYS',
  //     rejectCall: dto.rejectCall ?? false,
  //     msgCall: dto.msgCall ?? 'Chamadas não atendidas',
  //     groupsIgnore: dto.groupsIgnore ?? false,
  //     alwaysOnline: dto.alwaysOnline ?? false,
  //     readMessages: dto.readMessages ?? false,
  //     readStatus: dto.readStatus ?? false,
  //     syncFullHistory: dto.syncFullHistory ?? false,
  //     webhook: {
  //       url: `${this.appUrl}/webhook`,
  //       byEvents: false,
  //       base64: false,
  //       headers: {
  //         authorization: `Bearer ${token}`,
  //         'Content-Type': 'application/json',
  //       },
  //       events: ['MESSAGES_UPSERT'],
  //     },
  //   };

  //   // 3️⃣ Criar instância via Evolution API
  //   let response: any;
  //   try {
  //     response = await axios.post(
  //       `${this.serverUrl}/instance/create`,
  //       payload,
  //       {
  //         headers: {
  //           'Content-Type': 'application/json',
  //           apikey: this.apiKey,
  //         },
  //       },
  //     );
  //   } catch (error) {
  //     this.logger.error('Erro ao criar instância no Evolution', error);
  //     throw error;
  //   }

  //   const instanceData = response.data.instance;

  //   this.logger.log(
  //     `Instância criada: ${instanceData.instanceId} | Token: ${token}`,
  //   );

  //   // 4️⃣ Salvar no banco (multi-tenant)
  //   const instance = await this.prisma.evolutionInstance.create({
  //     data: {
  //       name: dto.instanceName,
  //       sessionId: instanceData.instanceId,
  //       token, // Token único da instância
  //       qrCode: '',
  //       connected: false,
  //       companyId: dto.companyId,
  //     },
  //   });

  //   this.logger.log(`Instância criada: ${instance}`);

  //   // Pegar QRcode
  //   await this.getQRCode(instance.sessionId, dto.companyId, dto.instanceName);

  //   // 5️⃣ Retornar token
  //   return { instance, qrCode: instance.qrCode };
  // }

  // async getQRCode(sessionId: string, companyId: string, sessionName: string) {
  //   console.log('sessionId', sessionId);

  //   const url = `${this.serverUrl}/instance/connect/${sessionName}`;

  //   let response: any;
  //   try {
  //     response = await axios.get(url, {
  //       headers: { apikey: this.apiKey },
  //     });
  //   } catch (error) {
  //     this.logger.error('Erro ao obter QR Code:');
  //     throw 'error';
  //   }

  //   console.log('response', response);

  //   const { code } = response.data;

  //   // Atualiza no banco
  //   await this.prisma.evolutionInstance.update({
  //     where: { sessionId },
  //     data: { qrCode: code },
  //   });

  //   // Gera imagem PNG
  //   const buffer = Buffer.from(code, 'base64');
  //   const filePath = path.join(__dirname, `${sessionName}.png`);
  //   fs.writeFileSync(filePath, buffer);
  //   this.logger.log(`QR Code salvo em: ${filePath}`);

  //   // Exibe QR Code no console em ASCII
  //   qrcode.generate(code, { small: true }, (qr) => {
  //     this.logger.log(`QR Code ASCII:\n${qr}`);
  //   });

  //   // Retorna Base64 + caminho da imagem + buffer
  //   return {
  //     ...response.data,
  //     qrCodeBase64: code,
  //     qrCodePath: filePath,
  //     qrCodeBuffer: buffer,
  //   };
  // }

  // async getAllInstances(companyId?: string) {
  //   return this.prisma.evolutionInstance.findMany({
  //     where: companyId ? { companyId } : undefined,
  //   });
  // }
}
