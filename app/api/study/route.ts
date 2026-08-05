import { NextResponse } from 'next/server';
import Groq from 'groq-sdk';

export async function POST(request: Request) {
  try {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'A chave GROQ_API_KEY não está configurada.' }, { status: 500 });
    }

    const groq = new Groq({ apiKey });
    const { action, content, context } = await request.json();

    if (!action || !content) {
      return NextResponse.json({ error: 'Ação ou conteúdo não fornecido.' }, { status: 400 });
    }

    let systemPrompt = '';
    
    switch(action) {
      case 'explain':
        systemPrompt = 'Você é um tutor avançado focado em didática e neurociência. Explique o conceito solicitado de forma clara, utilizando analogias precisas. Divida sua explicação em tópicos lógicos.';
        break;
      case 'summarize':
        systemPrompt = 'Você é um tutor avançado. Resuma o texto fornecido, destacando os pontos principais, palavras-chave e a ideia central. Seja objetivo e conciso.';
        break;
      case 'review':
        systemPrompt = 'Você é um tutor criando uma revisão para provas. Com base no conteúdo fornecido, gere 5 perguntas de revisão com diferentes níveis de dificuldade e, ao final, forneça um gabarito comentado.';
        break;
      case 'schedule':
        systemPrompt = 'Você é um organizador de estudos produtivo. Crie um cronograma de estudos detalhado e realista com base nas disciplinas/temas fornecidos, aplicando a técnica Pomodoro ou repetição espaçada se adequado. Responda em formato Markdown detalhado.';
        break;
      case 'qa':
        systemPrompt = 'Você é um assistente acadêmico pronto para responder perguntas específicas. Forneça uma resposta direta, clara e fundamentada para a pergunta do usuário.';
        break;
      default:
        systemPrompt = 'Você é o assistente educacional do EchoMind.';
    }

    systemPrompt += '\n\nIMPORTANTE: Responda APENAS com um objeto JSON válido neste formato: { "result": "sua resposta didática longa com formatação markdown aqui...", "youtubeQuery": "um termo de busca bem específico de até 4 palavras para encontrar uma videoaula excelente no youtube sobre este assunto (ou deixe null se não houver necessidade)" }';

    const userMessage = context ? `Contexto anterior: ${context}\n\nSolicitação/Conteúdo atual: ${content}` : `Solicitação/Conteúdo: ${content}`;

    const chatCompletion = await groq.chat.completions.create({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage }
      ],
      model: 'llama-3.3-70b-versatile',
      temperature: 0.4,
      response_format: { type: 'json_object' }
    });

    const responseContent = chatCompletion.choices[0]?.message?.content;
    
    if (!responseContent) {
      throw new Error("Resposta vazia da IA");
    }

    const parsed = JSON.parse(responseContent);

    return NextResponse.json({ result: parsed.result, youtubeQuery: parsed.youtubeQuery });

  } catch (error: any) {
    console.error('Erro no módulo de estudos:', error);
    return NextResponse.json({ error: 'Ocorreu um erro ao processar sua solicitação.' }, { status: 500 });
  }
}
