import { NextResponse } from 'next/server';
import { Groq } from 'groq-sdk';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export const maxDuration = 60;

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
    
    // Obter histórico do usuário usando Supabase
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
        },
      }
    );

    const { data: userData, error: authError } = await supabase.auth.getUser();
    let historyContext = 'Nenhum histórico anterior disponível.';
    
    if (!authError && userData?.user) {
      const { data: history } = await supabase
        .from('emotional_checkins')
        .select('valence_value, texture, thoughts, created_at')
        .eq('user_id', userData.user.id)
        .order('created_at', { ascending: false })
        .limit(10);
        
      if (history && history.length > 0) {
        historyContext = `Histórico dos últimos ${history.length} check-ins do usuário:\n${JSON.stringify(history, null, 2)}`;
      }
    }

    const systemPrompt = `Você é o EchoMind AI, um sistema de análise, prevenção e apoio institucional.
Sua base científica é o Copenhagen Psychosocial Questionnaire (COPSOQ) e as diretrizes da NR-1.

IMPORTANTE SOBRE A ANÁLISE:
- NUNCA realize diagnóstico clínico, médico ou psicológico. Nunca afirme que o usuário possui um transtorno. Utilize linguagem proporcional (ex: "Alguns pontos relatados podem merecer atenção", e não "Você está com depressão").
- Sua função é compreender, acolher e recomendar ações baseadas no contexto.

SITUAÇÕES E RECOMENDAÇÕES CONTEXTUAIS:
- SITUAÇÃO A (Cotidiano: cansaço, tédio comum): Reconheça o sentimento, ofereça orientação simples. Evite alarmismos. (recommendation_type: 'general_support' ou 'self_care')
- SITUAÇÃO B (Indicadores Recorrentes ou Preocupantes): Se houver sinais de dificuldade que mereçam acompanhamento, recomende procurar apoio. (recommendation_type: 'request_session')
- SITUAÇÃO C (Conteúdo Grave/Atenção Imediata): Não minimize. Não diagnostique. Oriente a busca de ajuda humana apropriada. (recommendation_type: 'urgent_human_support' ou 'request_session')

O usuário relatou o seguinte agora: "${texto}"
${historyContext}

Retorne APENAS um objeto JSON válido no formato exato:
{
  "emocao_principal": "emoção principal",
  "emocoes_secundarias": ["emoção1", "emoção2"],
  "nivel_estresse": 5,
  "nivel_energia": 7,
  "nivel_motivacao": 6,
  "response": "Resposta acolhedora e empática que fala diretamente com o usuário.",
  "summary": "Resumo objetivo da situação atual (para uso interno/histórico).",
  "indicators": ["Fatores ou sinais de atenção identificados na análise"],
  "recommendation": "Recomendação contextualizada e proporcional.",
  "recommendation_type": "general_support", // Tipos válidos: general_support, self_care, talk_to_someone, request_session, urgent_human_support
  "action": "request_session", // Enviar "request_session" caso a recommendation_type seja request_session ou urgent_human_support, senão null
  "action_label": "Solicitar uma sessão", // Rótulo do botão, se houver action, senão null
  "severity": "Baixo", // Pode ser: Baixo, Moderado, Elevado ou Crítico
  "needs_attention": false // true se severity for Elevado ou Crítico
}
Os níveis (estresse, energia, motivacao) devem ser de 0 a 10.`;

    const chatCompletion = await groq.chat.completions.create({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: 'Gere a análise em JSON com base nos dados fornecidos.' },
      ],
      model: 'llama-3.1-8b-instant',
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
