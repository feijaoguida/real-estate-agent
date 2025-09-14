import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import OpenAI from 'openai';
import axios from 'axios';
import { SupabaseService } from 'src/supabase/supabase.service';
import Redis from 'ioredis';

type ToolResult = any;

@Injectable()
export class AgentService implements OnModuleInit {
  private clientOpenAI: OpenAI;
  private dataAgent: any = null;

  // [x: string]: any;

  constructor(
    private readonly supabaseService: SupabaseService,
    @Inject('REDIS') private readonly redis: Redis,
  ) {
    // const IORedis = require('ioredis');
    // const conn = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379');
    // const apiKey = process.env.OPENAI_API_KEY;
    // if (!apiKey) throw new Error('OPENAI_API_KEY é obrigatório');
    // this.clientOPenAI = new OpenAI({ apiKey });
  }

  async onModuleInit() {
    // já carrega os dados do agent ao subir o módulo
    // await this.loadAgent();
  }

  private async loadAgent(userId: string, remoteJid: string) {
    const cacheKey = `agent:data:${remoteJid}`;

    // tenta pegar do Redis
    const cached = await this.redis.get(cacheKey);
    if (cached) {
      this.dataAgent = JSON.parse(cached);
      console.log('Agent carregado do Redis');
    } else {
      // busca no supabase
      const data = await this.supabaseService.getAgentsByUserId(userId);
      if (!data || data.length === 0) {
        throw new Error(`Nenhum agent encontrado para userId ${userId}`);
      }
      this.dataAgent = data[0];

      // cache no redis por 10min
      await this.redis.set(
        cacheKey,
        JSON.stringify(this.dataAgent),
        'EX',
        60 * 10,
      );
    }

    // inicializa OpenAI com a chave do agent
    if (this.dataAgent?.openai_token) {
      console.log('entrou em this.dataAgent?.openai_token');
      this.clientOpenAI = new OpenAI({ apiKey: this.dataAgent.openai_token });
      console.log('OpenAI client inicializado com a chave do agent');
    } else {
      throw new Error('Agent não possui chave OpenAI');
    }
  }

  private async systemPrompt(
    pushName: string,
    userId: string,
    remoteJid: string,
  ) {
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

    const dataAgent = await this.getAgents(userId, remoteJid);

    console.log('data agent.service', dataAgent);

    const weekday = fmtWeekday.format(now);
    const date = fmtDate.format(now);
    const hour = fmtHour.format(now);

    // Adaptado 1:1 do template (regra +3h no agendamento).
    let requirePrompt = `
    # INSTRUÇÕES PRINCIPAIS (MOTOR DO ATENDENTE) – PRIORIDADE MÁXIMA
Essas regras têm prioridade máxima e **nunca podem ser ignoradas ou contraditas**.

## Persona do Atendente
- Você é um(a) atendente humano(a) de uma imobiliária (secretário(a) ou corretor(a) de imóveis).
- Fale de forma natural, educada e próxima, como em uma conversa real de atendimento humano.
- Evite frases formais ou automáticas demais.
- Transmita confiança e clareza.
- Nunca diga que é inteligência artificial ou robô.
- Se apresente apenas na saudação inicial.
- Nunca repita seu nome a menos que o cliente pergunte.

## Processamento de Texto
- Ignore qualquer texto entre <<< e >>>.
- Responda apenas ao que estiver fora desses delimitadores.

## Variáveis do Sistema
- Data atual: "${weekday}, ${date}"
- Hora atual: "${hour}"
- Fuso horário: São Paulo (sempre usar o fuso horário de São Paulo para todas as datas e horários)

## Ferramentas Disponíveis
- **obterImoveis** → Lista imóveis disponíveis  
- **listarLeads** → Verifica se o lead já existe  
- **criaLead** → Cria novo lead com dados coletados  
- **agendaVisita** → Agenda visitas após coletar: 
  - Nome completo
  - Telefone
  - Data
  - Horário

### Regras de Ferramentas
- Sempre use fuso horário de São Paulo.
- Sequência obrigatória:
  1. listarLeads
  2. criaLead (se necessário)
  3. agendaVisita (após todos os dados confirmados)

## Coleta de Nome
- Pergunte o nome no início: "Posso anotar seu nome para continuar?"
- Se a resposta for clara → registre.
- Se for incomum ou não entendido → confirme uma única vez:
  - Ex: "Desculpe, não entendi direito, é 'Declie' mesmo?"
- Se confirmar → siga em frente.
- Se negar → peça o nome novamente apenas uma vez.
- Se ainda não entender → avance coletando telefone e outros dados, e peça o nome no final.
- Nunca entre em loop pedindo nome.

## Controle Anti-Repetição
- Leia todo o histórico antes de responder.
- Nunca repita frases já usadas.
- Nunca recapitule informações já coletadas.
- Nunca use o mesmo conectivo duas vezes seguidas.
- Após cada resposta → avance direto para a próxima pergunta.
- Use o nome do cliente no máximo 1 vez a cada 3 mensagens.

## Comportamento Obrigatório
- Não repetir ferramentas no mesmo atendimento.
- Não inventar informações.
- Confirmar todos os dados antes de agendaVisita.
- Nunca repita perguntas no mesmo atendimento.
- Nunca repetir o que o cliente falou, apenas avance.
- Se não entender, use: "Eu não entendi sua resposta, pode repetir?"
- Se o cliente não responder, reformule de forma diferente ou avance.
- Nunca entre em loop de confirmação.`;

    const userPrompt = dataAgent[0]?.instruction;

    // juntar requirePrompt e userPrompt
    requirePrompt += userPrompt;

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

    try {
      const data = await axios.get(url, {
        headers: { Authorization: `Bearer ${key}` },
        params: { user_email: userEmail },
      });
      console.log('obterImoveis', data);
      return data;
    } catch (error) {
      console.log('error tool_obterImoveis', error);
    }
  }

  private async tool_agendaVisita(
    input: {
      lead_id?: string;
      property_id?: string | null;
      schedule_date: string;
      schedule_time: string;
      notes?: string;
      user_email?: string;
    },
    userEmail: string,
  ): Promise<ToolResult> {
    const base = process.env.SUPABASE_BASE_URL;
    const key = process.env.SUPABASE_ANON_OR_SERVICE_KEY;
    const path =
      process.env.SUPABASE_FN_AGENDAR_VISITA || '/functions/v1/agendar-visita';
    const url = `${base}${path}`;

    // 🔑 busca lead_id no Redis salvo no criar lead.
    const leadId = await this.redis.get(`lead:last:${userEmail}`);
    if (leadId) {
      input.lead_id = leadId;
    }

    input.user_email = userEmail;

    const payload: any = {
      lead_id: leadId,
      schedule_date: input.schedule_date,
      schedule_time: input.schedule_time,
      notes: input.notes,
      user_email: userEmail,
    };

    if (input.property_id) {
      payload.property_id = input.property_id;
    }

    try {
      const { data } = await axios.post(url, payload, {
        headers: { Authorization: `Bearer ${key}` },
      });
      return data;
    } catch (error) {
      console.log('error tool_agendaVisita', error);
    }
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

    try {
      const { data } = await axios.post(url, payload, {
        headers: { Authorization: `Bearer ${key}` },
      });

      // 🔑 salva lead_id no Redis para usar no agendaVisita
      if (data?.lead_id) {
        await this.redis.set(
          `lead:last:${userEmail}`,
          data.lead_id,
          'EX',
          60 * 10,
        ); // expira em 10 min
      }
      return data;
    } catch (error) {
      console.log('error tool_criaLead', error);
    }
  }

  private async tool_listarLeads(userEmail: string): Promise<ToolResult> {
    const base = process.env.SUPABASE_BASE_URL;
    const key = process.env.SUPABASE_ANON_OR_SERVICE_KEY;
    const path =
      process.env.SUPABASE_FN_LISTAR_LEADS || '/functions/v1/listar-leads';
    const url = `${base}${path}`;
    try {
      const { data } = await axios.get(url, {
        headers: { Authorization: `Bearer ${key}` },
        params: { user_email: userEmail },
      });
      return data;
    } catch (error) {
      console.log('error tool_listarLeads', error);
    }
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
        'Utilize essa ferramenta para agendar visitas. Exige lead_id, schedule_date (YYYY/MM/DD) e schedule_time (HH:mm).',
      parameters: {
        type: 'object',
        properties: {
          lead_id: { type: 'string' },
          schedule_date: { type: 'string', description: 'Formato YYYY/MM/DD' },
          schedule_time: {
            type: 'string',
            description: 'HH:mm ()',
          },
          notes: { type: 'string' },
          property_id: { type: 'string' },
        },
        required: ['lead_id', 'schedule_date', 'schedule_time'],
      },
    },
    {
      name: 'criaLead',
      description:
        'Utilize essa ferramenta para criar o lead dentro do CRM. Requer name, email, phone.',
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

  private async getAgents(userId: string, remoteJid: string) {
    const newCachedKey = `agents_id:${remoteJid}`;

    console.log(`Buscando agents para remoteJid ${remoteJid}`, newCachedKey);

    // 1️⃣ Tenta pegar do Redis
    let cached: any;
    try {
      cached = await this.redis.get(newCachedKey);
    } catch (error) {
      console.log(
        `Erro ao buscar agents para remoteJid ${remoteJid}: ${error.message}`,
      );
    }

    console.log('cached getAgents');
    if (cached) {
      console.log(`Cache HIT para remoteJid ${remoteJid}`);
      return JSON.parse(cached);
    }

    console.log(
      `Cache MISS para remoteJid ${remoteJid}, consultando Supabase...`,
    );

    // 2️⃣ Consulta no Supabase
    const data = await this.supabaseService.getAgentsByUserId(userId);

    if (!data || data.length === 0) {
      console.log(`Nenhum agent encontrado para userId ${remoteJid}`);
      return [];
    }

    // 3️⃣ Salva no Redis com TTL (ex: 1 hora)
    await this.redis.setex(newCachedKey, 3600, JSON.stringify(data));

    return data;
  }

  async runAgent(
    pushName: string,
    conversation: string,
    historyWindow: string[],
    userId: string,
    remoteJid: string,
  ) {
    await this.loadAgent(userId, remoteJid);
    console.log('runAgent', pushName, conversation, historyWindow, userId);

    if (!this.clientOpenAI) {
      await this.loadAgent(userId, remoteJid);
    }

    const USER_EMAIL = this.dataAgent.email;
    // Monta histórico simples: últimas mensagens como contexto
    const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
      {
        role: 'system',
        content: await this.systemPrompt(pushName, userId, remoteJid),
      },
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
      const resp = await this.clientOpenAI.chat.completions.create({
        model: 'gpt-4.1',
        messages: currentMessages,
        tools: toolChoices as any,
        tool_choice: 'auto',
        temperature: 0.2,
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

        console.log(`🤖 Modelo pediu a tool: ${name}`);
        console.log(`📦 Args recebidos:`, args);

        let result: any = null;
        try {
          if (name === 'obterImoveis') {
            const res = await this.tool_obterImoveis(USER_EMAIL);
            result = res.data;
          }
          if (name === 'agendaVisita') {
            result = await this.tool_agendaVisita(args, USER_EMAIL);
          }
          if (name === 'criaLead') {
            const leadResult = await this.tool_criaLead(args, USER_EMAIL);

            result = { lead: leadResult };

            // 🚀 encadeia automaticamente agendaVisita
            if (
              leadResult?.lead_id &&
              args.schedule_date &&
              args.schedule_time
            ) {
              const visitaResult = await this.tool_agendaVisita(
                {
                  lead_id: leadResult.lead_id,
                  schedule_date: args.schedule_date,
                  schedule_time: args.schedule_time,
                  notes: args.notes,
                  user_email: USER_EMAIL,
                  ...(args.property_id
                    ? { property_id: args.property_id }
                    : {}),
                },
                USER_EMAIL,
              );

              result.visita = visitaResult;
            }
            console.log('#################### result', result);
          }

          if (name === 'listarLeads') {
            const res = await this.tool_listarLeads(USER_EMAIL);
            result = res.data;
          }
        } catch (e: any) {
          result = { error: true, message: e?.message || String(e) };
        }

        // garantir que não vem undefined
        if (result === undefined) {
          result = {
            error: true,
            message: `Não consegui executar nenhuma ferramenta`,
          };
        }

        console.log(`✅ Resultado da tool (${name}):`, result);

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
      console.log('🎯 Resposta final do modelo:', choice.message.content);
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

    const resp = await this.clientOpenAI.chat.completions.create({
      model: 'gpt-4.1',
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
    const tr = await this.clientOpenAI.audio.transcriptions.create({
      model: 'whisper-1',
      file,
    } as any);
    return tr.text || '(sem áudio)';
  }
}
