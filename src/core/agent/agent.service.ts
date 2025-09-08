import { Inject, Injectable } from '@nestjs/common';
import OpenAI from 'openai';
import axios from 'axios';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { tryCatch } from 'bullmq';
import { SupabaseService } from 'src/supabase/supabase.service';
import Redis from 'ioredis';

type ToolResult = any;

@Injectable()
export class AgentService {
  [x: string]: any;
  private clientOPenAI: OpenAI;

  constructor(
    private readonly supabaseService: SupabaseService,
    @Inject('REDIS') private readonly redis: Redis,
  ) {
    const IORedis = require('ioredis');
    const conn = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379');

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error('OPENAI_API_KEY é obrigatório');
    this.clientOPenAI = new OpenAI({ apiKey });
  }

  private async systemPrompt(pushName: string, userId: string) {
    const now = new Date();
    // Formatadores para pt-BR (timezone São Paulo)
    const fmtWeekday = new Intl.DateTimeFormat('pt-BR', {
      weekday: 'long',
      timeZone: 'America/Sao_Paulo',
    });
    const fmtDate = new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      timeZone: 'America/Sao_Paulo',
    });
    const fmtHour = new Intl.DateTimeFormat('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone: 'America/Sao_Paulo',
    });

    const dataAgent = await this.getAgents(userId);

    console.log('data agent.service', dataAgent);

    const weekday = fmtWeekday.format(now);
    const date = fmtDate.format(now);
    const hour = fmtHour.format(now);

    // Adaptado 1:1 do template (regra +3h no agendamento).
    let requirePrompt = `-------------------------------------------------------------------------------------------------

        ## REGRAS OBRIGATÓRIAS:

        #data atual: "${weekday}, ${date}",hora atual": "${hour}"

        #Quando for utilizar a tool agendaVisita, deve sempre agendar no horário do fuso de são paulo + 3 horas, exemplo: "quero agendar amanhã as 14 da tarde", o agendamento deve ser feito as as 17 da tarde.

        #FERRAMENTAS DISPONÍVEIS:  
        • obterImoveis → lista todos os imóveis disponíveis  
        • agendaVisita → agendamento da visita presencial (usar somente após confirmação de dia e hora, com todos os dados coletados)  
        • criaLead → cria o lead no sistema  
        • listarLeads → verifica se o lead já existe

        #REGRAS DO AGENTE:  
        • Nunca invente informações  
        • Nunca forneça preços ou disponibilidade sem confirmação  
        • Sempre use frases curtas
        • Sempre pergunte nome, depois necessidade, depois horário para visita
        • Sempre colete os seguintes dados para agendar: *nome, e-mail, telefone, dia e hora preferidos, bairro/empreendimento de interesse*  
        • Se o cliente ainda não decidiu, ofereça listar imóveis com base nas preferências  
        • Se pedir imagens, envie apenas o link ou descreva que pode enviar mais detalhes por visita

        #TOM: direto, educado, profissional, objetivo, sem floreios. Você está falando com ${pushName || 'cliente'} no WhatsApp.

        Responda sempre em português do Brasil.
        -------------------------------------------------------------------------------------------------`;

    const userPrompt = dataAgent[0]?.instruction;

    // juntar requirePrompt e userPrompt
    requirePrompt += userPrompt;

    console.log('requirePrompt', requirePrompt);

    return requirePrompt;
  }

  // === Tools ===

  private async tool_obterImoveis(userEmail: string): Promise<ToolResult> {
    const base = process.env.SUPABASE_BASE_URL;
    const key = process.env.SUPABASE_ANON_OR_SERVICE_KEY;

    const path =
      process.env.SUPABASE_FN_OBTER_IMOVEIS || '/functions/v1/listar-imoveis';
    const url = `${base}${path}`;
    console.log('obterImoveis url', url);
    const { data } = await axios.get(url, {
      headers: { Authorization: `Bearer ${key}` },
      params: { user_email: userEmail },
    });

    console.log('obterImoveis', data);
    return data;
  }

  // private add3h(timeStr: string) {
  //   // espera "HH:mm"
  //   const [h, m] = timeStr.split(':').map((x) => parseInt(x, 10));
  //   const date = dayjs().hour(h).minute(m).second(0);
  //   return date.add(3, 'hour').format('HH:mm');
  // }

  private add3h(timeStr: string) {
    // espera "HH:mm"
    const [h, m] = timeStr.split(':').map((x) => parseInt(x, 10));

    // cria um Date com a hora e minuto atuais ajustados
    const now = new Date();
    now.setHours(h);
    now.setMinutes(m);
    now.setSeconds(0);
    now.setMilliseconds(0);

    // adiciona 3 horas
    now.setHours(now.getHours() + 3);

    // formata de volta para "HH:mm"
    const hh = now.getHours().toString().padStart(2, '0');
    const mm = now.getMinutes().toString().padStart(2, '0');
    return `${hh}:${mm}`;
  }

  private async tool_agendaVisita(
    input: {
      lead_id: string;
      schedule_date: string;
      schedule_time: string;
      notes?: string;
      property_interest_id?: string;
    },
    userEmail: string,
  ): Promise<ToolResult> {
    const base = process.env.SUPABASE_BASE_URL;
    const key = process.env.SUPABASE_ANON_OR_SERVICE_KEY;
    const path =
      process.env.SUPABASE_FN_AGENDAR_VISITA || '/functions/v1/agendar-visita';
    const url = `${base}${path}`;

    // aplica regra +3h no horário
    const schedule_time = this.add3h(input.schedule_time);

    const payload = { ...input, schedule_time, user_email: userEmail };
    const { data } = await axios.post(url, payload, {
      headers: { Authorization: `Bearer ${key}` },
    });
    return data;
  }

  private async tool_criaLead(
    input: {
      name: string;
      email: string;
      phone: string;
    },
    userEmail: string,
  ): Promise<ToolResult> {
    const base = process.env.SUPABASE_BASE_URL;
    const key = process.env.SUPABASE_ANON_OR_SERVICE_KEY;
    const path =
      process.env.SUPABASE_FN_CRIAR_LEAD || '/functions/v1/n8n-criar-lead';
    const url = `${base}${path}`;
    const payload = { ...input, user_email: userEmail };
    const { data } = await axios.post(url, payload, {
      headers: { Authorization: `Bearer ${key}` },
    });
    return data;
  }

  private async tool_listarLeads(userEmail: string): Promise<ToolResult> {
    const base = process.env.SUPABASE_BASE_URL;
    const key = process.env.SUPABASE_ANON_OR_SERVICE_KEY;
    const path =
      process.env.SUPABASE_FN_LISTAR_LEADS || '/functions/v1/listar-leads';
    const url = `${base}${path}`;
    const { data } = await axios.get(url, {
      headers: { Authorization: `Bearer ${key}` },
      params: { user_email: userEmail },
    });
    return data;
  }

  private functions = [
    {
      name: 'obterImoveis',
      description: 'Lista os imóveis disponíveis. Use para sugerir opções.',
      parameters: {
        type: 'object',
        properties: {},
      },
    },
    {
      name: 'agendaVisita',
      description:
        'Agenda visita presencial. Exige lead_id, schedule_date (DD/MM/YYYY) e schedule_time (HH:mm).',
      parameters: {
        type: 'object',
        properties: {
          lead_id: { type: 'string' },
          schedule_date: { type: 'string', description: 'Formato DD/MM/YYYY' },
          schedule_time: {
            type: 'string',
            description: 'HH:mm (será ajustado para +3h)',
          },
          notes: { type: 'string' },
          property_interest_id: { type: 'string' },
        },
        required: ['lead_id', 'schedule_date', 'schedule_time'],
      },
    },
    {
      name: 'criaLead',
      description: 'Cria lead caso não exista. Requer name, email, phone.',
      parameters: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          email: { type: 'string' },
          phone: { type: 'string' },
        },
        required: ['name', 'email', 'phone'],
      },
    },
    {
      name: 'listarLeads',
      description: 'Lista leads existentes para evitar duplicidade.',
      parameters: { type: 'object', properties: {} },
    },
  ] as const;

  private async getAgents(userId: string) {
    console.log('userId getAgents before', userId);

    const newCachedKey = `agents_id:${userId}`;

    console.log(`Buscando agents para userId ${userId}`, newCachedKey);

    // 1️⃣ Tenta pegar do Redis
    let cached: any;
    try {
      cached = await this.redis.get(newCachedKey);
    } catch (error) {
      console.log(
        `Erro ao buscar agents para userId ${userId}: ${error.message}`,
      );
    }

    if (cached) {
      console.log(`Cache HIT para userId ${userId}`);
      return JSON.parse(cached);
    }

    console.log('cached getAgents', cached);

    console.log(`Cache MISS para userId ${userId}, consultando Supabase...`);

    // 2️⃣ Consulta no Supabase
    const data = await this.supabaseService.getAgentsByUserId(userId);
    console.log('Data getAgentsByUserId', data);
    // const url = `${this.baseUrl}/agents?user_id=eq.${encodeURIComponent(userId)}&select=*`;
    // const { data } = await firstValueFrom(
    //   this.http.get(url, { headers: this.headers }),
    // );

    if (!data || data.length === 0) {
      console.log(`Nenhum agent encontrado para userId ${userId}`);
      return [];
    }

    // 3️⃣ Salva no Redis com TTL (ex: 1 hora)
    await this.redis.setex(newCachedKey, 3600, JSON.stringify(data));

    console.log('Data getAgentsByUserId', data);

    return data;
  }

  async runAgent(
    pushName: string,
    conversation: string,
    historyWindow: string[],
    userId: string,
  ) {
    console.log('runAgent', pushName, conversation, historyWindow, userId);

    const agents = await this.getAgents(userId);
    console.log('agentes', agents);
    let USER_EMAIL = agents[0].user_email;
    // Monta histórico simples: últimas mensagens como contexto
    const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
      { role: 'system', content: await this.systemPrompt(pushName, userId) },
      ...historyWindow.map((m) => ({ role: 'user', content: m }) as const),
      { role: 'user', content: conversation },
    ];

    const toolChoices = this.functions.map((f) => ({
      type: 'function',
      function: {
        name: f.name,
        description: f.description,
        parameters: f.parameters as any,
      },
    }));

    // Loop de tool-calling
    let toolUseCount = 0;
    let lastResponse: any = null;
    let currentMessages = messages;

    while (toolUseCount < 4) {
      const resp = await this.clientOPenAI.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: currentMessages,
        tools: toolChoices as any,
        tool_choice: 'auto',
        temperature: 0.3,
      });

      const choice = resp.choices[0];
      lastResponse = choice.message;

      if (choice.message.tool_calls && choice.message.tool_calls.length) {
        // pega a primeira tool call
        const call = choice.message.tool_calls[0] as any;
        const name = call.function.name as any;
        const args = call.function.arguments
          ? JSON.parse(call.function.arguments)
          : {};

        let result: any = null;
        try {
          if (name === 'obterImoveis')
            result = await this.tool_obterImoveis(USER_EMAIL);
          if (name === 'agendaVisita')
            result = await this.tool_agendaVisita(args, USER_EMAIL);
          if (name === 'criaLead')
            result = await this.tool_criaLead(args, USER_EMAIL);
          if (name === 'listarLeads')
            result = await this.tool_listarLeads(USER_EMAIL);
        } catch (e: any) {
          result = { error: true, message: e?.message || String(e) };
        }

        console.log('result tools', result);

        currentMessages = [
          ...currentMessages,
          choice.message,
          {
            role: 'tool',
            tool_call_id: call.id,
            content: JSON.stringify(result),
          } as any,
        ];
        toolUseCount += 1;
        continue;
      }

      // se não pediu ferramenta, finaliza
      break;
    }

    const content =
      typeof lastResponse?.content === 'string'
        ? lastResponse.content
        : Array.isArray(lastResponse?.content)
          ? lastResponse.content.map((p: any) => p.text || '').join('\n')
          : '';

    console.log('content runAgent', content);

    return content || '';
  }

  async analyzeImageToText(base64: string): Promise<string> {
    const prompt = `Você receberá uma imagem de um cliente interessando em imóveis.
Extraia intent e preferências (bairro, quartos, preço aproximado se possível, estilo).
Responda com um texto curto, pronto para o agente usar como mensagem do cliente.`;

    const resp = await this.clientOPenAI.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content:
            'Você é um extrator de intenção a partir de imagens. Responda em português do Brasil.',
        },
        {
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            {
              type: 'input_image',
              image_url: { url: 'data:image/jpeg;base64,{base64}' } as any,
            },
          ] as any,
        },
      ],
      temperature: 0.2,
    });

    return (
      resp.choices[0]?.message?.content ||
      'Imagem recebida. Pode me contar o que achou interessante?'
    );
  }

  async transcribeAudioBase64(base64: string): Promise<string> {
    // Whisper precisa de arquivo; aceitamos base64 e mandamos como input bytes.
    const buffer = Buffer.from(base64, 'base64');
    const file = new File([buffer], 'audio.ogg');
    const tr = await this.clientOPenAI.audio.transcriptions.create({
      model: 'whisper-1',
      file,
    } as any);
    return tr.text || '(sem áudio)';
  }
}
