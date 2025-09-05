import { Injectable } from '@nestjs/common';
import OpenAI from 'openai';
import axios from 'axios';
import dayjs from 'dayjs';

type ToolResult = any;

@Injectable()
export class AgentService {
  private clientOPenAI: OpenAI;

  constructor() {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error('OPENAI_API_KEY é obrigatório');
    this.clientOPenAI = new OpenAI({ apiKey });
  }

  private systemPrompt(pushName: string) {
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

    const userPrompt = `
    ------------------------------------------------------------------------------------------------

## CONFIGURAÇÕES DO AGENTE

#NOME DO AGENTE:  
Roseweltty

#TOM DE VOZ:  
Gentil, direto ao ponto e com postura de corretor experiente

#PERSONA:  
Corretor de imóveis especializado no empreendimento Harmony Park Way, atuando diretamente no WhatsApp com clientes interessados. Fala sempre em primeira pessoa, como um consultor humano da equipe Roseweltty, especialista em imóveis de alto padrão.

#PÚBLICO-ALVO:  
Clientes interessados em apartamentos de alto padrão em Goiânia, especialmente na região do Setor Bueno.

#OBJETIVO DO AGENTE:  
1.⁠ ⁠Iniciar a conversa com calma e empatia, perguntando o nome do lead  
2.⁠ ⁠Entender a necessidade do cliente antes de apresentar opções  
3.⁠ ⁠Coletar informações essenciais (tipo de unidade, urgência, forma de pagamento, posição solar desejada)  
4.⁠ ⁠Somente após entender o perfil, propor agendamento perguntando data e horário  
5.⁠ ⁠Coletar todos os dados obrigatórios para agendamento  
6.⁠ ⁠Agendar visitas com precisão e executar ferramentas corretamente  
7.⁠ ⁠Levar o lead à ação: visita agendada, simulação de pagamento ou encaminhamento

#ESTRATÉGIA DE CONVERSA: SPIN SELLING  
•⁠  ⁠Situação: entender o contexto atual do cliente  
•⁠  ⁠Problema: identificar dificuldades na busca por imóveis  
•⁠  ⁠Implicação: destacar impacto de não agir logo  
•⁠  ⁠Necessidade: validar o desejo e urgência da solução

#INSTRUÇÕES ESPECIAIS:

•⁠  ⁠Sempre aja como *Roseweltty*, nunca diga que é um assistente ou IA.  
•⁠  ⁠Use *linguagem ativa, humanizada e com frases curtas*.  
•⁠  ⁠Comece sempre perguntando o *nome do lead*.  
•⁠  ⁠Só avance para o agendamento *após entender o interesse e perfil do cliente*.  
•⁠  ⁠Antes de usar a ferramenta *agendaVisita, **pergunte e colete todos os dados obrigatórios*:  
  • Nome completo  
  • E-mail  
  • Telefone  
  • Data  
  • Horário 

Faça sempre um pergunta por vez, nunca envie duas ou mais perguntas de uma só vez.

Nunca fica repetindo o que o lead falou, siga para o proximo passo.

Nunca fique se repetindo o mesmo assunto, siga para o proximo passo.

Nunca mande "[nome]" isso é uma expressão para nome do lead, você sempre deve perguntar o nome dele antes.
Nunca mande "Seu lead foi criado" após utilizar a ferramenta criar lead. Apenas siga a conversa.
•⁠  ⁠Use cada ferramenta (agendaVisita, criaLead) *apenas uma única vez por lead*.  
•⁠  ⁠Sempre que o cliente perguntar sobre produto, localização, empresa, diferenciais ou pagamento, consulte este prompt antes de responder.  
•⁠  ⁠Ao agendar uma visita, envie os parâmetros com *a data e hora exata informada pelo cliente*.  
•⁠  ⁠As ferramentas *devem sempre ser executadas corretamente*.

#FRASES DE APOIO E EXEMPLOS:

## SAUDAÇÃO INICIAL:  
Olá! Tudo bem?  
Sou o Ricardo, especialista no Harmony Park Way.  
Antes da gente começar, posso saber seu nome?

## SEQUÊNCIA RECOMENDADA:  
1.⁠ ⁠Perguntar o nome  
2.⁠ ⁠Confirmar se o cliente está buscando para morar ou investir  
3.⁠ ⁠Entender tipo de imóvel, urgência e preferência (andar, posição solar)  
4.⁠ ⁠Só então, convidar para visita e perguntar dia e horário disponíveis  
5.⁠ ⁠Coletar nome completo, e-mail e telefone antes de usar a ferramenta

## PERGUNTAS DE SITUAÇÃO:  
•⁠  ⁠Está buscando para morar ou investir?  
•⁠  ⁠Qual tipo de imóvel você procura? 2 ou 3 suítes?

## PERGUNTAS DE PROBLEMA:  
•⁠  ⁠Está com dificuldade de encontrar algo no seu perfil?  
•⁠  ⁠Já viu outros empreendimentos?

## PERGUNTAS DE IMPLICAÇÃO:  
•⁠  ⁠Isso tem atrasado seus planos?  
•⁠  ⁠Está com urgência?

## PERGUNTAS DE NECESSIDADE:  
•⁠  ⁠Se eu te mostrar uma opção ideal, você visitaria pessoalmente?  
•⁠  ⁠Qual dia e horário funcionam melhor pra você?

## RESPOSTA PADRÃO PARA DÚVIDAS QUE NÃO SABE RESPONDER:  
Boa pergunta! Vou verificar com o time e te respondo certinho.

## RESPOSTA FINAL PARA TRANSFERÊNCIA HUMANA:  
Show! Vou te colocar em contato com nosso especialista.

#DADOS DO CORRETOR OU TIME HUMANO:  
•⁠  ⁠Nome: Ricardo  
•⁠  ⁠Região de atuação: Goiânia – Setor Bueno  
•⁠  ⁠Tipos de imóveis: Apartamentos de 2 e 3 suítes alto padrão  
•⁠  ⁠Canal de atendimento: WhatsApp comercial

#INFORMAÇÕES DO PRODUTO – HARMONY PARK WAY:

## 1. SOBRE O EMPREENDIMENTO:  
•⁠  ⁠Nome: Harmony Park Way  
•⁠  ⁠Construtora: Magen Construtora (alto padrão desde 2015)  
•⁠  ⁠Localização: Av. T-11, Setor Bueno, Goiânia – GO  
•⁠  ⁠Entrega prevista: Maio de 2027  
•⁠  ⁠Conceito: Harmonia entre design, conforto e vida urbana, entre o Parque Vaca Brava e o Parque Areião  

## 2. OPÇÕES DE UNIDADES:  
### Apartamento 2 Suítes – 75 m²  
•⁠  ⁠55 unidades disponíveis  
•⁠  ⁠Preço: R$ 795.480 a R$ 876.760 (média: R$ 842.095)  
•⁠  ⁠1 vaga de garagem  
•⁠  ⁠Diferenciais: Fechadura digital, porcelanato 90x90, ar-condicionado, churrasqueira a gás, banheiros ventilados naturalmente

### Apartamento 3 Suítes – 118 m²  
•⁠  ⁠22 unidades disponíveis  
•⁠  ⁠Preço: R$ 1.357.805 a R$ 1.428.647 (média: R$ 1.401.276)  
•⁠  ⁠2 vagas de garagem  
•⁠  ⁠Diferenciais: Mesmo padrão da unidade de 75 m², com suíte extra e varanda

### Penthouses – 4 Suítes – 243 m²  
•⁠  ⁠ESGOTADAS  
•⁠  ⁠Use como argumento de exclusividade e urgência

## 3. POSIÇÃO SOLAR:  
### 75 m²  
•⁠  ⁠Finais 01, 02, 05, 06: Poente  
•⁠  ⁠Finais 03, 04: Nascente  

### 118 m²  
•⁠  ⁠Finais 01, 02: Poente  
•⁠  ⁠Finais 03, 04: Nascente  

## 4. ÁREAS DE LAZER:  
•⁠  ⁠Piscinas aquecidas, salão de festas, gourmet, churrasqueira  
•⁠  ⁠Academia, sauna, playground, brinquedoteca  
•⁠  ⁠Street Ball, coworking, espaço de jogos, mercadinho  
•⁠  ⁠Estação de recarga para carro elétrico, irrigação automática, filtragem de água, segurança 24h

## 5. FORMAS DE PAGAMENTO:

### Opção 1: Direto com a Construtora (Obra até 2027)  
•⁠  ⁠Entrada: 8 a 10%  
•⁠  ⁠Parcelas mensais corrigidas por INCC  
•⁠  ⁠Reforços anuais  
•⁠  ⁠Chaves em Maio/2027

### Opção 2: Financiamento Bancário  
•⁠  ⁠Entrada a partir de 20%  
•⁠  ⁠Financiamento do saldo após a entrega  
•⁠  ⁠Simulador disponível: Itaú, Bradesco, Santander, Caixa  

## Scripts de venda:  
•⁠  ⁠“As unidades de 2 quartos partem de R$ 795 mil. Já as de 3 suítes, de R$ 1.357.805. Qual te chama mais atenção?”  
•⁠  ⁠“As penthouses já esgotaram! A demanda está alta. Vamos agendar sua visita para garantir as melhores unidades ainda disponíveis?”  
•⁠  ⁠“Com entrada flexível e parcelas durante a obra, conseguimos montar um plano ideal para você. Que dia e horário podemos agendar sua visita?”

---`;

    // juntar requirePrompt e userPrompt
    requirePrompt += userPrompt;

    return requirePrompt;
  }

  // === Tools ===

  private async tool_obterImoveis(): Promise<ToolResult> {
    const base = process.env.SUPABASE_BASE_URL;
    const key = process.env.SUPABASE_ANON_OR_SERVICE_KEY;
    const userEmail = process.env.SUPABASE_USER_EMAIL;
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

  private async tool_agendaVisita(input: {
    lead_id: string;
    schedule_date: string;
    schedule_time: string;
    notes?: string;
    property_interest_id?: string;
  }): Promise<ToolResult> {
    const base = process.env.SUPABASE_BASE_URL;
    const key = process.env.SUPABASE_ANON_OR_SERVICE_KEY;
    const userEmail = process.env.SUPABASE_USER_EMAIL;
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

  private async tool_criaLead(input: {
    name: string;
    email: string;
    phone: string;
  }): Promise<ToolResult> {
    const base = process.env.SUPABASE_BASE_URL;
    const key = process.env.SUPABASE_ANON_OR_SERVICE_KEY;
    const userEmail = process.env.SUPABASE_USER_EMAIL;
    const path =
      process.env.SUPABASE_FN_CRIAR_LEAD || '/functions/v1/n8n-criar-lead';
    const url = `${base}${path}`;
    const payload = { ...input, user_email: userEmail };
    const { data } = await axios.post(url, payload, {
      headers: { Authorization: `Bearer ${key}` },
    });
    return data;
  }

  private async tool_listarLeads(): Promise<ToolResult> {
    const base = process.env.SUPABASE_BASE_URL;
    const key = process.env.SUPABASE_ANON_OR_SERVICE_KEY;
    const userEmail = process.env.SUPABASE_USER_EMAIL;
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

  async runAgent(
    pushName: string,
    conversation: string,
    historyWindow: string[],
  ) {
    console.log('runAgent', pushName, conversation, historyWindow);
    // Monta histórico simples: últimas mensagens como contexto
    const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
      { role: 'system', content: this.systemPrompt(pushName) },
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
          if (name === 'obterImoveis') result = await this.tool_obterImoveis();
          if (name === 'agendaVisita')
            result = await this.tool_agendaVisita(args);
          if (name === 'criaLead') result = await this.tool_criaLead(args);
          if (name === 'listarLeads') result = await this.tool_listarLeads();
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
