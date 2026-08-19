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

    const { orientadorId } = await req.json();
    if (!orientadorId) {
      return NextResponse.json({ error: 'orientadorId não fornecido.' }, { status: 400 });
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
    if (authError || !userData?.user || userData.user.id !== orientadorId) {
      return NextResponse.json({ error: 'Usuário não autenticado ou inválido.' }, { status: 401 });
    }

    const admin = createAdminClient();
    
    // 1. Get all classrooms for this orientador
    const { data: myRooms } = await admin
      .from('classrooms')
      .select('id')
      .eq('orientador_id', orientadorId);
      
    const roomIds = myRooms?.map(r => r.id) || [];
    
    // 2. Get direct students and students in these rooms
    const studentsMap = new Set<string>();
    
    const { data: directStudents } = await admin
      .from('profiles')
      .select('id')
      .eq('role', 'aluno')
      .eq('orientador_id', orientadorId);
      
    directStudents?.forEach(s => studentsMap.add(s.id));
    
    if (roomIds.length > 0) {
      const { data: roomStudents } = await admin
        .from('profiles')
        .select('id')
        .eq('role', 'aluno')
        .in('classroom_id', roomIds);
      roomStudents?.forEach(s => studentsMap.add(s.id));
    }
    
    const studentIds = Array.from(studentsMap);

    if (studentIds.length === 0) {
      return NextResponse.json({ error: 'Nenhum aluno sob sua orientação para análise.' }, { status: 400 });
    }

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: checkins } = await admin
      .from('emotional_checkins')
      .select('valence_value, texture, created_at')
      .in('user_id', studentIds)
      .gte('created_at', thirtyDaysAgo.toISOString())
      .limit(300);

    const { data: biometrics } = await admin
      .from('biometrics')
      .select('energy_level, sleep_hours, heart_rate, created_at')
      .in('user_id', studentIds)
      .gte('created_at', thirtyDaysAgo.toISOString())
      .limit(300);

    const aggregatedData = {
      total_alunos_sob_orientacao: studentIds.length,
      total_checkins: checkins?.length || 0,
      total_biometrics: biometrics?.length || 0,
      average_valence: checkins?.length ? Math.round(checkins.reduce((acc, c) => acc + c.valence_value, 0) / checkins.length) : 50,
      average_energy: biometrics?.length ? Math.round(biometrics.reduce((acc, b) => acc + (b.energy_level || 50), 0) / biometrics.length) : 50,
    };

    const systemPrompt = `Você é o EchoMind AI. Analise a atmosfera psico-emocional dos alunos sob a tutela deste Orientador Educacional nos últimos 30 dias.
Dados agregados:
${JSON.stringify(aggregatedData, null, 2)}

Não cite dados individuais. Retorne APENAS um objeto JSON válido, no seguinte formato exato:
{
  "pontos_positivos": ["Ponto 1", "Ponto 2"],
  "pontos_criticos": ["Crítico 1", "Crítico 2"],
  "areas_atencao": ["Área 1", "Área 2"],
  "recomendacoes_preventivas": ["Recomendação 1", "Recomendação 2"],
  "estrategias_institucionais": ["Estratégia de Intervenção 1", "Estratégia de Intervenção 2"],
  "resumo_executivo": "Um parágrafo resumindo o cenário atual dos alunos monitorados.",
  "nivel_alerta_geral": "Baixo"
}`;

    const chatCompletion = await groq.chat.completions.create({
      messages: [{ role: 'system', content: systemPrompt }],
      model: 'openai/gpt-oss-20b',
      response_format: { type: 'json_object' },
      temperature: 0.2,
      max_tokens: 1500,
    });

    const responseContent = chatCompletion.choices[0]?.message?.content || '{}';
    const parsed = JSON.parse(responseContent);

    const sanitizedReport = {
      resumo_executivo: parsed.resumo_executivo || 'Análise consolidada da atmosfera dos alunos supervisionados.',
      nivel_alerta_geral: parsed.nivel_alerta_geral || 'Baixo',
      pontos_positivos: Array.isArray(parsed.pontos_positivos) ? parsed.pontos_positivos : ['Engajamento satisfatório.'],
      pontos_criticos: Array.isArray(parsed.pontos_criticos) ? parsed.pontos_criticos : ['Sem pontos críticos urgentes.'],
      areas_atencao: Array.isArray(parsed.areas_atencao) ? parsed.areas_atencao : ['Monitoramento de mudanças bruscas de humor.'],
      recomendacoes_preventivas: Array.isArray(parsed.recomendacoes_preventivas) ? parsed.recomendacoes_preventivas : ['Manter canal aberto de comunicação.'],
      estrategias_institucionais: Array.isArray(parsed.estrategias_institucionais) ? parsed.estrategias_institucionais : ['Reforço no acompanhamento próximo.'],
    };

    return NextResponse.json(sanitizedReport);
  } catch (error: any) {
    console.error('Orientador Report IA API Error:', error);
    return NextResponse.json({ error: error.message || 'Erro desconhecido ao gerar relatório IA.' }, { status: 500 });
  }
}
