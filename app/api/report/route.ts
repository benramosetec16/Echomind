import { NextResponse } from 'next/server';
import { Groq } from 'groq-sdk';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function POST(req: Request) {
  try {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "A chave da API Groq não está configurada (.env)." }, { status: 500 });
    }

    const { institutionId } = await req.json();
    if (!institutionId) {
      return NextResponse.json({ error: "institutionId não fornecido." }, { status: 400 });
    }

    const groq = new Groq({ apiKey });
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
    if (authError || !userData?.user) {
      return NextResponse.json({ error: "Usuário não autenticado." }, { status: 401 });
    }

    // Busca dados agregados da instituição (últimos 30 dias para não estourar o limite de tokens)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: profiles } = await supabase
      .from('profiles')
      .select('id')
      .eq('institution_id', institutionId)
      .eq('role', 'aluno');

    if (!profiles || profiles.length === 0) {
      return NextResponse.json({ error: "Nenhum aluno encontrado na instituição para análise." }, { status: 400 });
    }

    const studentIds = profiles.map(p => p.id);

    const { data: checkins } = await supabase
      .from('emotional_checkins')
      .select('valence_value, texture, created_at')
      .in('user_id', studentIds)
      .gte('created_at', thirtyDaysAgo.toISOString())
      .limit(100);

    const { data: biometrics } = await supabase
      .from('biometrics')
      .select('energy_level, sleep_hours, heart_rate, created_at')
      .in('user_id', studentIds)
      .gte('created_at', thirtyDaysAgo.toISOString())
      .limit(100);

    const aggregatedData = {
      total_checkins: checkins?.length || 0,
      total_biometrics: biometrics?.length || 0,
      average_valence: checkins?.length ? Math.round(checkins.reduce((acc, c) => acc + c.valence_value, 0) / checkins.length) : 50,
      average_energy: biometrics?.length ? Math.round(biometrics.reduce((acc, b) => acc + (b.energy_level || 50), 0) / biometrics.length) : 50,
    };

    const systemPrompt = `Você é o EchoMind AI, responsável por Inteligência Institucional.
Com base no framework COPSOQ e na NR-1 (gestão de riscos psicossociais), analise a situação geral da instituição com base neste resumo de dados agregados dos últimos 30 dias:
${JSON.stringify(aggregatedData, null, 2)}

Não cite dados individuais. Retorne APENAS um objeto JSON válido, no seguinte formato exato:
{
  "pontos_positivos": ["Ponto 1", "Ponto 2"],
  "pontos_criticos": ["Crítico 1", "Crítico 2"],
  "areas_atencao": ["Área 1", "Área 2"],
  "recomendacoes_preventivas": ["Recomendação 1", "Recomendação 2"],
  "estrategias_institucionais": ["Estratégia 1", "Estratégia 2"],
  "resumo_executivo": "Um parágrafo resumindo o cenário atual da instituição.",
  "nivel_alerta_geral": "Baixo" // Pode ser Baixo, Moderado, Elevado, Crítico
}`;

    const chatCompletion = await groq.chat.completions.create({
      messages: [{ role: "system", content: systemPrompt }],
      model: "llama-3.3-70b-versatile",
      response_format: { type: 'json_object' },
      temperature: 0.2,
      max_tokens: 1500,
    });

    const responseContent = chatCompletion.choices[0]?.message?.content || "{}";
    const reportData = JSON.parse(responseContent);

    return NextResponse.json(reportData);
  } catch (error: any) {
    console.error("Institution Report API Error:", error);
    return NextResponse.json({ error: error.message || "Erro desconhecido ao gerar relatório." }, { status: 500 });
  }
}
