import { NextResponse } from 'next/server';
import { Groq } from 'groq-sdk';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export const maxDuration = 60;

// GET /api/report — Relatório de Bem-Estar Individual do ALUNO
export async function GET() {
  try {
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

    const userId = userData.user.id;

    // Fetch user profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', userId)
      .single();

    const userName = profile?.full_name || userData.user.email?.split('@')[0] || 'Aluno';
    const dateStr = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });

    // Fetch 30-day data for student
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [journalRes, checkinsRes, biometricsRes, logsRes] = await Promise.all([
      supabase
        .from('aetheric_journal')
        .select('*')
        .eq('user_id', userId)
        .gte('created_at', thirtyDaysAgo.toISOString())
        .order('created_at', { ascending: false }),
      supabase
        .from('emotional_checkins')
        .select('*')
        .eq('user_id', userId)
        .gte('created_at', thirtyDaysAgo.toISOString())
        .order('created_at', { ascending: true }),
      supabase
        .from('biometrics')
        .select('*')
        .eq('user_id', userId)
        .gte('created_at', thirtyDaysAgo.toISOString())
        .order('created_at', { ascending: true }),
      supabase
        .from('biometric_logs')
        .select('*')
        .eq('user_id', userId)
        .gte('created_at', thirtyDaysAgo.toISOString())
        .order('created_at', { ascending: false })
    ]);

    const journalEntries = journalRes.data || [];
    const checkins = checkinsRes.data || [];
    const biometrics = biometricsRes.data || [];
    const biometricLogs = logsRes.data || [];

    // Calculate dynamic summary
    const checkinsCount = checkins.length + journalEntries.length;
    const moodHistory = checkins.map(c => c.valence_value);
    const sleepHistory = biometrics.map(b => Number(b.sleep_hours) || 7);
    const energyHistory = biometrics.map(b => b.energy_level || 50);
    const bpmHistory = biometrics.map(b => b.heart_rate || 72);

    const avgValence = moodHistory.length > 0
      ? Math.round(moodHistory.reduce((a, b) => a + b, 0) / moodHistory.length)
      : 75;

    let predominantMood = 'Serenidade';
    if (avgValence < 40) predominantMood = 'Turbulência';
    else if (avgValence < 60) predominantMood = 'Equilíbrio';
    else if (avgValence >= 80) predominantMood = 'Plenitude';

    const avgSleepNum = sleepHistory.length > 0
      ? (sleepHistory.reduce((a, b) => a + b, 0) / sleepHistory.length).toFixed(1)
      : '7.5';

    const avgHeartRate = bpmHistory.length > 0
      ? Math.round(bpmHistory.reduce((a, b) => a + b, 0) / bpmHistory.length)
      : 72;

    const avgEnergy = energyHistory.length > 0
      ? Math.round(energyHistory.reduce((a, b) => a + b, 0) / energyHistory.length)
      : 70;

    // AI Insights via Groq (with default fallback)
    let aiInsights = {
      summaryText: 'Com base no histórico dos últimos 30 dias, o usuário apresenta estabilidade emocional contínua e boa ressonância cognitiva.',
      patterns: ['Padrão de estabilidade emocional preservado', 'Ciclo de foco regular nas atividades diárias'],
      recommendations: ['Manter a rotina de check-ins diários', 'Reservar momentos de pausa consciente para manutenção da energia'],
      alerts: [] as string[],
    };

    const apiKey = process.env.GROQ_API_KEY;
    if (apiKey && (checkins.length > 0 || journalEntries.length > 0)) {
      try {
        const groq = new Groq({ apiKey });
        const prompt = `Analise os dados emocionais e biométricos do aluno ${userName}:
- Média de Valência Emocional: ${avgValence}/100
- Emoção Dominante: ${predominantMood}
- Horas Média de Sono: ${avgSleepNum}h
- Frequência Cardíaca Média: ${avgHeartRate} BPM
- Nível Médio de Energia: ${avgEnergy}/100
- Total de Registros: ${checkinsCount}

Gere um JSON estrito no formato:
{
  "summaryText": "resumo descritivo da estabilidade do aluno",
  "patterns": ["padrão 1", "padrão 2"],
  "recommendations": ["recomendação 1", "recomendação 2"],
  "alerts": ["alerta se houver risco, caso contrário array vazio"]
}`;

        const chatCompletion = await groq.chat.completions.create({
          messages: [{ role: 'system', content: prompt }],
          model: 'llama-3.1-70b-versatile',
          response_format: { type: 'json_object' },
          temperature: 0.3,
          max_tokens: 800,
        });

        const raw = chatCompletion.choices[0]?.message?.content;
        if (raw) {
          const parsed = JSON.parse(raw);
          aiInsights = {
            summaryText: parsed.summaryText || aiInsights.summaryText,
            patterns: Array.isArray(parsed.patterns) ? parsed.patterns : aiInsights.patterns,
            recommendations: Array.isArray(parsed.recommendations) ? parsed.recommendations : aiInsights.recommendations,
            alerts: Array.isArray(parsed.alerts) ? parsed.alerts : [],
          };
        }
      } catch (e) {
        console.error('[API Report GET] Groq AI fallback used:', e);
      }
    }

    return NextResponse.json({
      userName,
      dateStr,
      version: '2.4',
      summary: {
        checkinsCount,
        predominantMood,
        avgSleep: `${avgSleepNum}h`,
        avgHeartRate,
        avgEnergy,
        periodStr: 'Últimos 30 dias',
      },
      journalEntries,
      biometricLogs,
      aiInsights,
      chartsData: {
        moodHistory: moodHistory.length > 0 ? moodHistory : [70, 75, 80, 78, 82],
        sleepHistory: sleepHistory.length > 0 ? sleepHistory : [7.0, 7.5, 8.0, 7.2, 7.8],
        energyHistory: energyHistory.length > 0 ? energyHistory : [60, 65, 70, 75, 80],
        bpmHistory: bpmHistory.length > 0 ? bpmHistory : [72, 74, 70, 68, 71],
      },
    });

  } catch (error: any) {
    console.error('API Report GET Error:', error);
    return NextResponse.json({ error: error.message || 'Erro ao gerar relatório do aluno.' }, { status: 500 });
  }
}

// POST /api/report — Relatório de Inteligência Institucional do GESTOR
export async function POST(req: Request) {
  try {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'A chave da API Groq não está configurada (.env).' }, { status: 500 });
    }

    const { institutionId } = await req.json();
    if (!institutionId) {
      return NextResponse.json({ error: 'institutionId não fornecido.' }, { status: 400 });
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

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: profiles } = await supabase
      .from('profiles')
      .select('id')
      .eq('institution_id', institutionId)
      .eq('role', 'aluno');

    if (!profiles || profiles.length === 0) {
      return NextResponse.json({ error: 'Nenhum aluno encontrado na instituição para análise.' }, { status: 400 });
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
      total_alunos: profiles.length,
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
  "nivel_alerta_geral": "Baixo"
}`;

    const chatCompletion = await groq.chat.completions.create({
      messages: [{ role: 'system', content: systemPrompt }],
      model: 'llama-3.1-70b-versatile',
      response_format: { type: 'json_object' },
      temperature: 0.2,
      max_tokens: 1500,
    });

    const responseContent = chatCompletion.choices[0]?.message?.content || '{}';
    const parsed = JSON.parse(responseContent);

    // Defensive parsing to prevent client-side .map() crashes
    const sanitizedReport = {
      resumo_executivo: parsed.resumo_executivo || 'Análise consolidada da atmosfera institucional dos alunos.',
      nivel_alerta_geral: parsed.nivel_alerta_geral || 'Baixo',
      pontos_positivos: Array.isArray(parsed.pontos_positivos) ? parsed.pontos_positivos : ['Engajamento contínuo nos registros diários.'],
      pontos_criticos: Array.isArray(parsed.pontos_criticos) ? parsed.pontos_criticos : ['Nenhum ponto crítico crítico identificado.'],
      areas_atencao: Array.isArray(parsed.areas_atencao) ? parsed.areas_atencao : ['Acompanhamento de oscilações pontuais de estresse.'],
      recomendacoes_preventivas: Array.isArray(parsed.recomendacoes_preventivas) ? parsed.recomendacoes_preventivas : ['Promover oficinas de gestão de tempo e acolhimento.'],
      estrategias_institucionais: Array.isArray(parsed.estrategias_institucionais) ? parsed.estrategias_institucionais : ['Reforçar canais diretos de orientação psicopedagógica.'],
    };

    return NextResponse.json(sanitizedReport);
  } catch (error: any) {
    console.error('Institution Report API Error:', error);
    return NextResponse.json({ error: error.message || 'Erro desconhecido ao gerar relatório.' }, { status: 500 });
  }
}
