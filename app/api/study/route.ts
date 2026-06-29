import { NextResponse } from 'next/server';
import Groq from 'groq-sdk';

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

export async function POST(request: Request) {
  try {
    const { action, content, context } = await request.json();

    if (!action || !content) {
      return NextResponse.json({ error: 'A├º├úo ou conte├║do n├úo fornecido.' }, { status: 400 });
    }

    let systemPrompt = '';
    
    switch(action) {
      case 'explain':
        systemPrompt = 'Voc├¬ ├® um tutor avan├ºado focado em did├ítica e neuroci├¬ncia. Explique o conceito solicitado de forma clara, utilizando analogias precisas. Divida sua explica├º├úo em t├│picos l├│gicos.';
        break;
      case 'summarize':
        systemPrompt = 'Voc├¬ ├® um tutor avan├ºado. Resuma o texto fornecido, destacando os pontos principais, palavras-chave e a ideia central. Seja objetivo e conciso.';
        break;
      case 'review':
        systemPrompt = 'Voc├¬ ├® um tutor criando uma revis├úo para provas. Com base no conte├║do fornecido, gere 5 perguntas de revis├úo com diferentes n├¡veis de dificuldade e, ao final, forne├ºa um gabarito comentado.';
        break;
      case 'schedule':
        systemPrompt = 'Voc├¬ ├® um organizador de estudos produtivo. Crie um cronograma de estudos detalhado e realista com base nas disciplinas/temas fornecidos, aplicando a t├®cnica Pomodoro ou repeti├º├úo espa├ºada se adequado. Responda em formato Markdown detalhado.';
        break;
      case 'qa':
        systemPrompt = 'Voc├¬ ├® um assistente acad├¬mico pronto para responder perguntas espec├¡ficas. Forne├ºa uma resposta direta, clara e fundamentada para a pergunta do usu├írio.';
        break;
      default:
        systemPrompt = 'Voc├¬ ├® o assistente educacional do EchoMind.';
    }

    const userMessage = context ? `Contexto anterior: ${context}\n\nSolicita├º├úo/Conte├║do atual: ${content}` : `Solicita├º├úo/Conte├║do: ${content}`;

    const chatCompletion = await groq.chat.completions.create({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage }
      ],
      model: 'llama-3.3-70b-versatile',
      temperature: 0.4,
    });

    const result = chatCompletion.choices[0]?.message?.content;
    
    if (!result) {
      throw new Error("Resposta vazia da IA");
    }

    return NextResponse.json({ result });

  } catch (error: any) {
    console.error('Erro no m├│dulo de estudos:', error);
    return NextResponse.json({ error: 'Ocorreu um erro ao processar sua solicita├º├úo.' }, { status: 500 });
  }
}
