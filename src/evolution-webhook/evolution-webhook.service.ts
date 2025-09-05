import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { WebhookEventDto } from './dto/webhook-event.dto';
import { EvolutionWebhookDto } from './dto/evolution-webhook.dto';
import { ChatGptService } from 'src/utils/chat-gpt.service';
import axios from 'axios';

interface MessageBuffer {
  messages: string[];
  timeout?: NodeJS.Timeout;
}

@Injectable()
export class EvolutionWebhookService {
  private readonly logger = new Logger(EvolutionWebhookService.name);
  private serverUrl = process.env.EVOLUTION_API_URL;
  private apiKey = process.env.EVOLUTION_API_KEY;

  // Buffer em memória (chave: número do cliente)
  private messageBuffer: Map<string, MessageBuffer> = new Map();

  private readonly TIMEOUT_MS = 12000; // 12 segundos

  constructor(
    private readonly prisma: PrismaService,
    private readonly chatGptService: ChatGptService,
  ) {}

  /**
   * Mensagens recebidas da Evolution
   */
  async handleIncomingMessage(
    payload: any,
    token: string,
  ): Promise<{ success: boolean }> {
    this.logger.log('📩 handleIncomingMessage Mensagem recebida de', payload);
    this.logger.log(
      '📩 handleIncomingMessage Mensagem recebida de from',
      payload?.from,
    );

    // 1️⃣ Buscar a instância pelo token
    const instance = await this.prisma.evolutionInstance.findUnique({
      where: { token },
      include: { company: true },
    });

    console.log('handleIncomingMessage instance', instance);

    if (!instance) {
      this.logger.error(`❌ Token inválido: ${token}`);
      throw new UnauthorizedException('Instância não encontrada');
    }

    // 2️⃣ Buscar ou criar o cliente na empresa correta
    const from = payload.data.key.remoteJid.replace('@s.whatsapp.net', '');
    const text =
      payload.message?.conversation ||
      payload.message?.extendedTextMessage?.text ||
      '';

    let customer = await this.prisma.customer.findFirst({
      where: {
        phone: from,
        companyId: instance.companyId,
      },
    });

    console.log('handleIncomingMessage customer', customer);

    if (!customer) {
      customer = await this.prisma.customer.create({
        data: {
          phone: from,
          companyId: instance.companyId,
        },
      });
      this.logger.log(`🆕 Novo cliente criado: ${customer.phone}`);
    }

    // 3️⃣ Buscar ou criar o chat específico da instância e cliente
    let chat = await this.prisma.chat.findFirst({
      where: {
        instanceId: instance.id,
        customerId: customer.id,
      },
    });

    if (!chat) {
      chat = await this.prisma.chat.create({
        data: {
          instanceId: instance.id,
          customerId: customer.id,
        },
      });
      this.logger.log(
        `🆕 Novo chat criado | Instância: ${instance.name} | Cliente: ${customer.phone}`,
      );
    }

    // 4️⃣ Salvar mensagem
    await this.prisma.message.create({
      data: {
        chatId: chat.id,
        fromMe: false,
        text,
      },
    });

    this.logger.log(
      `✅ Mensagem salva | Empresa: ${instance.company.name} | Cliente: ${customer.phone} | Instância: ${instance.name}`,
    );

    // 5️⃣ Gerar resposta via ChatGPT
    const reply = await this.chatGptService.sendMessage(text);

    // 6️⃣ Enviar resposta pelo Evolution API
    try {
      await axios.post(
        `${this.serverUrl}/message/sendText/${instance.name}`,
        {
          number: from,
          text: reply,
        },
        { headers: { apikey: this.apiKey } },
      );

      this.logger.log(`📤 Resposta enviada para ${from}: ${reply}`);
    } catch (err) {
      this.logger.error('❌ Erro ao enviar mensagem pelo Evolution API', err);
    }

    // 7️⃣ Salvar resposta no banco
    await this.prisma.message.create({
      data: { chatId: chat.id, fromMe: true, text: reply },
    });

    return { success: true };
  }

  /**
   * Eventos genéricos (status, conexão, etc)
   */
  async handleEvent(eventDto: WebhookEventDto, token: string): Promise<void> {
    console.log('eventDto', eventDto);

    const instance = await this.prisma.evolutionInstance.findUnique({
      where: { token },
      include: { company: true },
    });

    if (!instance) {
      this.logger.error(`❌ Token inválido para evento: ${token}`);
      throw new UnauthorizedException('Instância não encontrada');
    }

    switch (eventDto.event) {
      case 'message':
        this.logger.debug(
          `📨 Evento message recebido: ${JSON.stringify(eventDto.data)} | Empresa: ${instance.company.name}`,
        );
        break;

      case 'status':
        this.logger.debug(
          `⚡ Evento status recebido: ${JSON.stringify(eventDto.data)} | Instância: ${instance.name}`,
        );
        break;

      default:
        this.logger.warn(
          `⚠ Evento não tratado: ${eventDto.event} | Empresa: ${instance.company.name}`,
        );
        break;
    }
  }
}
