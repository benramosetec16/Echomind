import { NextResponse } from 'next/server';
import { Groq } from 'groq-sdk';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { createAdminClient } from '@/utils/supabase/admin';

export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'A chave da API Groq não está configurada (.env).' }, { status: 500 });
    }

    const { classroomId } = await req.json();
    if (!classroomId) {
      return NextResponse.json({ error: 'classroomId não fornecido.' }, { status: 400 });
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
      return NextResponse.json({ error: 'Usuário não autenticado.' }, { status: 401 });
    }

    const admin = createAdminClient();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: profiles } = await admin
      .from('profiles')
      .select('id')
      .eq('classroom_id', classroomId)
      .eq('role', 'aluno');

    if (!profiles || profiles.length === 0) {
      return NextResponse.json({ error: 'Nenhum aluno encontrado nesta sala para análise.' }, { status: 400 });
    }

    const studentIds = profiles.map(p => p.id);

    const { data: checkins } = await admin
      .from('emotional_checkins')
      .select('valence_value, texture, created_at')
      .in('user_id', studentIds)
      .gte('created_at', thirtyDaysAgo.toISOString())
      .limit(200);

    const { data: biometrics } = await admin
      .from('biometrics')
      .select('energy_level, sleep_hours, heart_rate, created_at')
      .in('user_id', studentIds)
      .gte('created_at', thirtyDaysAgo.toISOString())
      .limit(200);

    const aggregatedData = {
      total_alunos: profiles.length,
      total_checkins: checkins?.length || 0,
      total_biometrics: biometrics?.length || 0,
      average_valence: checkins?.length ? Math.round(checkins.reduce((acc, c) => acc + c.valence_value, 0) / checkins.length) : 50,
      average_energy: biometrics?.length ? Math.round(biometrics.reduce((acc, b) => acc + (b.energy_level || 50), 0) / biometrics.length) : 50,
    };

    const systemPrompt = `Você é o EchoMind AI. Analise a atmosfera da SALA DE AULA com base nestes dados dos últimos 30 dias:
${JSON.stringify(aggregatedData, null, 2)}

Não cite dados individuais. Retorne APENAS um objeto JSON válido, no seguinte formato exato:
{
  "pontos_positivos": ["Ponto 1", "Ponto 2"],
  "pontos_criticos": ["Crítico 1", "Crítico 2"],
  "areas_atencao": ["Área 1", "Área 2"],
  "recomendacoes_preventivas": ["Recomendação 1", "Recomendação 2"],
  "estrategias_institucionais": ["Estratégia Pedagógica 1", "Estratégia Pedagógica 2"],
  "resumo_executivo": "Um parágrafo resumindo o cenário emocional e energético da turma.",
  "nivel_alerta_geral": "Baixo"
}`;

    const chatCompletion = await groq.chat.completions.create({
      messages: [{ role: 'system', content: systemPrompt }],
      model: 'llama-3.3-70b-versatile',
      response_format: { type: 'json_object' },
      temperature: 0.2,
      max_tokens: 1500,
    });

    const responseContent = chatCompletion.choices[0]?.message?.content || '{}';
    const parsed = JSON.parse(responseContent);

    const sanitizedReport = {
      resumo_executivo: parsed.resumo_executivo || 'Análise consolidada da atmosfera da turma.',
      nivel_alerta_geral: parsed.nivel_alerta_geral || 'Baixo',
      pontos_positivos: Array.isArray(parsed.pontos_positivos) ? parsed.pontos_positivos : ['Participação estável.'],
      pontos_criticos: Array.isArray(parsed.pontos_criticos) ? parsed.pontos_criticos : ['Nenhum ponto crítico identificado.'],
      areas_atencao: Array.isArray(parsed.areas_atencao) ? parsed.areas_atencao : ['Monitoramento regular.'],
      recomendacoes_preventivas: Array.isArray(parsed.recomendacoes_preventivas) ? parsed.recomendacoes_preventivas : ['Manter dinâmicas de engajamento.'],
      estrategias_institucionais: Array.isArray(parsed.estrategias_institucionais) ? parsed.estrategias_institucionais : ['Apoio psicopedagógico básico.'],
    };

    return NextResponse.json(sanitizedReport);
  } catch (error: any) {
    console.error('Professor Report IA API Error:', error);
    return NextResponse.json({ error: error.message || 'Erro desconhecido ao gerar relatório IA.' }, { status: 500 });
  }
}
