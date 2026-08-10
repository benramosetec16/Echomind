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
Sua base científica é o Copenhagen Psychosocial Questionnaire (COPSOQ) e as diretrizes da NR-1 (Gerenciamento de Riscos Ocupacionais, incluindo riscos psicossociais).
NUNCA realize diagnóstico clínico, médico ou psicológico. Sua função é analisar padrões e gerar indicadores preventivos.

O usuário relatou o seguinte agora: "${texto}"
${historyContext}

Analise os padrões (humor, energia, frequência, evolução ao longo do tempo).
Calcule o nível de risco (Baixo, Moderado, Elevado, Crítico) considerando o histórico, frequência, intensidade e persistência (nunca classifique como Crítico baseado num único check-in se o histórico for bom).

Retorne APENAS um objeto JSON válido, sem texto extra, no seguinte formato exato:
{
  "emocao_principal": "emoção principal",
  "emocoes_secundarias": ["emoção1", "emoção2"],
  "nivel_estresse": 5,
  "nivel_energia": 7,
  "nivel_motivacao": 6,
  "resumo": "Descrição objetiva da situação atual do usuário.",
  "tendencias": "Ex: melhora gradual, estabilidade, redução de energia, etc.",
  "fatores_atencao": ["Possível aumento do estresse", "Sinais compatíveis com necessidade de pausas"],
  "recomendacoes": ["Organização da rotina", "Pausas curtas", "Atividades de autocuidado"],
  "nivel_risco": "Baixo" // Pode ser: Baixo, Moderado, Elevado ou Crítico
}
Os níveis (estresse, energia, motivação) devem ser inteiros de 0 a 10.`;

    const chatCompletion = await groq.chat.completions.create({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: 'Gere a análise em JSON com base nos dados fornecidos.' },
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
