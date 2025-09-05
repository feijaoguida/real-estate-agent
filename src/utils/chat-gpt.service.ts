import { Injectable } from '@nestjs/common';
import axios from 'axios';

@Injectable()
export class ChatGptService {
  private async getClient() {
    const OpenAI = (await import('openai')).default;
    return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }

  async sendMessage(message: string, agentStyle?: string): Promise<string> {
    const openai = await this.getClient();

    const styleText = agentStyle
      ? `Siga este estilo de venda: ${agentStyle}.`
      : '';

    //     const prompt = `
    // Você é um vendedor de imóveis. Converse com o cliente de forma cordial, persuasiva e amigável.
    // ${styleText}
    // Mensagem do cliente: "${message}"
    //     `;

    const prompt = `Você é um agente de IA generalista que conversa de forma natural, amigável e próxima, como se fosse uma pessoa acessível e prestativa.  
Seu objetivo é manter um diálogo leve, acolhedor e útil, respondendo dúvidas sobre qualquer assunto (tecnologia, curiosidades, dicas do dia a dia, estudo, negócios, etc).  

Regras:  
1. Sempre mantenha o tom de voz simpático, empático e acessível.  
2. Evite respostas robóticas ou muito formais; prefira uma linguagem clara e natural.  
3. Se o usuário fizer uma pergunta ampla, tente entender melhor antes de responder.  
4. Se não souber algo, admita de forma tranquila e sugira um caminho para encontrar a resposta.  
5. Incentive a continuidade da conversa com pequenas perguntas ou comentários relevantes.  
6. Mantenha sempre uma postura respeitosa e positiva.  

Exemplo de estilo:  
Usuário: "Oi, tudo bem?"  
IA: "Oi! Tudo sim, e você? O que manda por aí hoje?"  

Usuário: "Quero aprender a tocar violão."  
IA: "Boa! O violão é um ótimo instrumento. Você já tem um em casa ou está pensando em comprar primeiro?"`;

    const structured = await openai.responses.create({
      model: 'gpt-4o-mini',
      input: JSON.stringify(message),
      instructions: prompt,
    });

    console.log('response.data', structured.output_text);

    return structured.output_text || 'Desculpe, não entendi.';
  }
}
