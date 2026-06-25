import { NextResponse } from 'next/server';
import Groq from 'groq-sdk';

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

export async function POST(request: Request) {
  try {
    const { texto } = await request.json();

    if (!texto) {
      return NextResponse.json({ error: 'Texto não fornecido' }, { status: 400 });
    }

    const prompt = `Analise o seguinte relato emocional de um usuário: "${texto}".

Sua resposta DEVE ser um JSON válido, e APENAS o JSON, obedecendo ESTRITAMENTE a seguinte estrutura (sem markdown, sem backticks):
{
  "emocao_principal": "Uma única palavra ou termo curto",
  "emocoes_secundarias": ["emoção 1", "emoção 2"],
  "nivel_estresse": número de 0 a 10,
  "nivel_energia": número de 0 a 10,
  "nivel_motivacao": número de 0 a 10,
  "resumo": "Um breve parágrafo interpretando o relato",
  "recomendacao": "Um conselho prático ou acolhedor"
}`;

    const chatCompletion = await groq.chat.completions.create({
      messages: [{ role: 'user', content: prompt }],
      model: 'llama-3.3-70b-versatile',
      temperature: 0.3,
      response_format: { type: "json_object" }
    });

    const content = chatCompletion.choices[0]?.message?.content;
    
    if (!content) {
      throw new Error("Resposta vazia da IA");
    }

    // Como pedimos json_object, a Groq nos devolve o JSON em string
    const analysis = JSON.parse(content);

    return NextResponse.json(analysis);

  } catch (error: any) {
    console.error('Erro na análise de emoções:', error);
    return NextResponse.json({ error: 'Ocorreu um erro ao processar sua análise.' }, { status: 500 });
  }
}
