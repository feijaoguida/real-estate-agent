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

  private async loadAgent(userId: string) {
    const cacheKey = `agent:data:${userId}`;

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
        Instruções para o modelo:
          - Ignore qualquer texto que estiver entre <<< e >>>.
          - Responda apenas ao que estiver fora desses delimitadores.

        ## REGRAS OBRIGATÓRIAS:

        #data atual: "${weekday}, ${date}",hora atual": "${hour}"

        #Quando for utilizar a tool agendaVisita, deve sempre agendar no horário do fuso de são paulo + 3 horas, exemplo: "quero agendar amanhã as 14 da tarde", o agendamento deve ser feito as as 17 da tarde.

        #FERRAMENTAS DISPONÍVEIS:  
        • obterImoveis → lista todos os imóveis disponíveis  
        • agendaVisita → Utilize essa ferramenta para agendar visitas (usar somente após confirmação de dia e hora, com todos os dados coletados)  
        • criaLead → Utilize essa ferramenta para criar o lead dentro do CRM  
        • listarLeads → verifica se o lead já existe

        #INSTRUÇÕES ESPECIAIS:

        •⁠  ⁠Sempre aja como *(seu nome)*, nunca diga que é um assistente ou IA.  
        •⁠  ⁠Use *linguagem ativa, humanizada e com frases curtas*.  
        •⁠  ⁠*.Não fique repetindo*. o nome do lead, *.somente quando for necessário*. 
        •⁠  ⁠Só avance para o agendamento *após entender o interesse e perfil do cliente*. 
        •⁠  Nunca digite o telefone ou o nome do lead, apenas pergunte e colete os dados.
        •⁠  Depois de Criar o lead, *agende a visita*. 
        •⁠  Nunca repita a ferramenta criaLead no mesmo atendimento.
        •⁠  ⁠Antes de usar a ferramenta *agendaVisita, **pergunte e colete todos os dados obrigatórios*:  
          • Nome completo  
          • Telefone  
          • Data  
          • Horário
          # Exemplo1: AgendaVisita.
              Usuário: "Quero agendar amanhã as 14 da tarde"
              IA: "Qual o nome completo?"
              Usuário: "João da Silva"
              IA: "Qual o telefone?"
              Usuário: "11999999999"
              IA: "Qual a data?"
              Usuário: "amanha as 14 da tarde" ou "20/09/2025 as 2 da tarde"
              IA: "Confirmando dos dados aqui para efetuar o agendamento, Amanha as 14 da tarde, João da Silva, 11999999999"
              Usuário: "Confirme"
              IA: "O agendamento foi feito com sucesso"
          # Exemplo2: AgendaVisita.
              Usuário: "Quero agendar amanhã as 14 da tarde"
              IA: "Ok, vamos agendar amanhã as 14 da tarde, mais antes de informe alguns dados seus."
              IA: "Nome completo"
              Usuário: "João da Silva"
              IA: "Telefone"  
              Usuário: "11999999999"
              IA: "Data"
              Usuário: "20/09/2025 as 2 da tarde" ou "amanha as 14 da tarde" ou "20 de setembro as 2 da tarde"
              IA: "Confirmando dos dados aqui para efetuar o agendamento, para o dia de setembro as 14 da tarde, Para o João da Silva, 11999999999"
              Usuário: "Confirme"
              IA: "O agendamento foi feito com sucesso"
          
        •  Faça sempre uma pergunta por vez, *nunca envie duas ou mais perguntas de uma só vez*.  
        •  Nunca diga que é um assistente ou IA.
        •  Nunca fica repetindo o que o lead falou, siga para o próximo passo.
        •⁠  Ao Criar o Lead prossiga para o agendaVisita.
        •⁠  Ao Criar o agendamento informe que o agendamento foi feito com sucesso.

        #REGRAS DO AGENTE:  
        •⁠  ⁠Nunca invente informações  
        •⁠  ⁠Sempre use frases curtas  
        •⁠  ⁠Sempre pergunte nome, depois necessidade, depois horário para visita  
        •⁠  ⁠Sempre colete os seguintes dados para agendar: *nome, telefone, data e horário*  
        •⁠  ⁠Sempre execute corretamente as ferramentas  
        •⁠  ⁠Nunca repita agendaVisita ou criaLead no mesmo atendimento  
        •⁠  ⁠Utilize os dados deste prompt sempre como referência
        •⁠  Se apresente apenas na saudação inicial
        •⁠  Evite ficar repentindo mensagens do lead
          `;

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

    const payload = { ...input, user_email: userEmail };

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
        'Utilize essa ferramenta para agendar visitas. Exige lead_id, schedule_date (DD/MM/YYYY) e schedule_time (HH:mm).',
      parameters: {
        type: 'object',
        properties: {
          lead_id: { type: 'string' },
          schedule_date: { type: 'string', description: 'Formato DD/MM/YYYY' },
          schedule_time: {
            type: 'string',
            description: 'HH:mm ()',
          },
          notes: { type: 'string' },
          property_interest_id: { type: 'string' },
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

    console.log('cached getAgents');
    if (cached) {
      console.log(`Cache HIT para userId ${userId}`);
      return JSON.parse(cached);
    }

    console.log(`Cache MISS para userId ${userId}, consultando Supabase...`);

    // 2️⃣ Consulta no Supabase
    const data = await this.supabaseService.getAgentsByUserId(userId);
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

    return data;
  }

  async runAgent(
    pushName: string,
    conversation: string,
    historyWindow: string[],
    userId: string,
  ) {
    await this.loadAgent(userId);
    console.log('runAgent', pushName, conversation, historyWindow, userId);

    if (!this.clientOpenAI) {
      await this.loadAgent(userId);
    }

    const USER_EMAIL = this.dataAgent.email;
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
      const resp = await this.clientOpenAI.chat.completions.create({
        model: 'gpt-4.1',
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
            result = await this.tool_criaLead(args, USER_EMAIL);
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
