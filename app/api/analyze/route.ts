import { NextResponse } from 'next/server';
import Groq from 'groq-sdk';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { texto } = body;

    if (!texto || typeof texto !== 'string' || texto.trim().length === 0) {
      return NextResponse.json(
        { error: 'Texto inválido ou ausente. Forneça um relato válido.' },
        { status: 400 }
      );
    }

    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'GROQ_API_KEY não está configurada no servidor.' },
        { status: 500 }
      );
    }

    const groq = new Groq({ apiKey });

    const systemPrompt = `Você é o EchoMind AI. Analise emoções e comportamentos descritos pelo usuário.
Retorne APENAS um objeto JSON válido, sem texto extra, no seguinte formato:
{
  "emocao_principal": "nome da emoção principal em português",
  "emocoes_secundarias": ["emoção1", "emoção2"],
  "nivel_estresse": 5,
  "nivel_energia": 7,
  "nivel_motivacao": 6,
  "resumo": "Resumo objetivo do estado emocional em 2 frases.",
  "recomendacao": "Recomendação prática e breve em 2 frases."
}
Os níveis devem ser inteiros de 0 a 10.`;

    const chatCompletion = await groq.chat.completions.create({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: texto },
      ],
      model: 'llama-3.3-70b-versatile',
      response_format: { type: 'json_object' },
      temperature: 0.2,
    });

    const responseContent = chatCompletion.choices[0]?.message?.content;

    if (!responseContent) {
      throw new Error('Resposta vazia recebida do Groq.');
    }

    const analise = JSON.parse(responseContent);
    return NextResponse.json(analise, { status: 200 });

  } catch (error: any) {
    console.error('Erro na rota /api/analyze:', error);
    return NextResponse.json(
      { error: error.message || 'Erro interno no servidor' },
      { status: 500 }
    );
  }
}
