import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { Groq } from 'groq-sdk';

export const maxDuration = 60;

// GET /api/report/orientador — Relatório de Orientação & Acompanhamento Emocional
export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
    }

    const { data: myProfile } = await supabase
      .from('profiles')
      .select('full_name, role')
      .eq('id', user.id)
      .single();

    if (!myProfile || !['orientador', 'gestor', 'administrador'].includes(myProfile.role ?? '')) {
      return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 });
    }

    const admin = createAdminClient();
    const orientadorName = myProfile.full_name || 'Orientador';
    const dateStr = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });

    // 1. Fetch classrooms of orientador
    const { data: myRooms } = await admin
      .from('classrooms')
      .select('id, name')
      .eq('orientador_id', user.id);

    const roomIds = myRooms?.map(r => r.id) ?? [];
    const roomsMap = new Map(myRooms?.map(r => [r.id, r.name]) ?? []);

    // 2. Fetch students (direct or via room)
    let studentsMap = new Map<string, any>();

    const { data: directStudents } = await admin
      .from('profiles')
      .select('id, full_name, classroom_id, guardian_name, guardian_phone, created_at')
      .eq('role', 'aluno')
      .eq('orientador_id', user.id);

    directStudents?.forEach(s => studentsMap.set(s.id, s));

    if (roomIds.length > 0) {
      const { data: roomStudents } = await admin
        .from('profiles')
        .select('id, full_name, classroom_id, guardian_name, guardian_phone, created_at')
        .eq('role', 'aluno')
        .in('classroom_id', roomIds);

      roomStudents?.forEach(s => studentsMap.set(s.id, s));
    }

    const students = Array.from(studentsMap.values());
    const studentIds = students.map(s => s.id);

    // 3. Fetch checkins & biometrics
    const { data: checkins } = studentIds.length > 0
      ? await admin.from('emotional_checkins').select('user_id, valence_value, created_at').in('user_id', studentIds)
      : { data: [] };

    const { data: biometrics } = studentIds.length > 0
      ? await admin.from('biometrics').select('user_id, energy_level, created_at').in('user_id', studentIds)
      : { data: [] };

    // 4. Fetch interventions
    const { data: interventions } = await admin
      .from('interventions')
      .select('*')
      .eq('orientador_id', user.id)
      .order('created_at', { ascending: false });

    // 5. Enrich student watchlist
    let criticosCount = 0;
    let moderadosCount = 0;
    let observacaoCount = 0;

    const studentWatchlist = students.map(student => {
      const userCheckins = checkins?.filter(c => c.user_id === student.id) ?? [];
      const userBiometrics = biometrics?.filter(b => b.user_id === student.id) ?? [];

      let riskLevel = 'Baixo';
      let moodAvg = 50;

      if (userCheckins.length > 0) {
        moodAvg = Math.round(userCheckins.reduce((acc, c) => acc + c.valence_value, 0) / userCheckins.length);
        if (moodAvg < 30) { riskLevel = 'Crítico'; criticosCount++; }
        else if (moodAvg < 50) { riskLevel = 'Moderado'; moderadosCount++; }
        else if (moodAvg < 70) { riskLevel = 'Observação'; observacaoCount++; }
      }

      return {
        name: student.full_name || 'Aluno',
        room: roomsMap.get(student.classroom_id) || 'Sem Turma Atribuída',
        riskLevel,
        moodAvg,
        checkinCount: userCheckins.length + userBiometrics.length,
        guardianName: student.guardian_name || 'Não informado',
        guardianPhone: student.guardian_phone || 'Não informado',
      };
    });

    // AI Summary via Groq
    let aiSummary = {
      executiveSummary: `Relatório de Acompanhamento do Orientador ${orientadorName}. Atualmente há ${students.length} alunos monitorados, com ${interventions?.length || 0} intervenções registradas.`,
      recommendations: [
        'Realizar sessões individuais de acolhimento para alunos em nível Crítico/Moderado.',
        'Manter canal direto com responsáveis de alunos sinalizados com queda de energia.',
      ],
    };

    const apiKey = process.env.GROQ_API_KEY;
    if (apiKey && students.length > 0) {
      try {
        const groq = new Groq({ apiKey });
        const prompt = `Você é o EchoMind AI auxiliando o Orientador Escolar ${orientadorName}.
Resumo da Turma:
- Total Alunos Monitorados: ${students.length}
- Alunos em Risco Crítico: ${criticosCount}
- Alunos em Risco Moderado: ${moderadosCount}
- Intervenções Ativas: ${interventions?.length || 0}

Gere um JSON estrito:
{
  "executiveSummary": "parágrafo descritivo com síntese e orientação psicopedagógica",
  "recommendations": ["recomendação 1", "recomendação 2"]
}`;

        const chatCompletion = await groq.chat.completions.create({
          messages: [{ role: 'system', content: prompt }],
          model: 'openai/gpt-oss-20b',
          response_format: { type: 'json_object' },
          temperature: 0.3,
          max_tokens: 600,
        });

        const raw = chatCompletion.choices[0]?.message?.content;
        if (raw) {
          const parsed = JSON.parse(raw);
          aiSummary = {
            executiveSummary: parsed.executiveSummary || aiSummary.executiveSummary,
            recommendations: Array.isArray(parsed.recommendations) ? parsed.recommendations : aiSummary.recommendations,
          };
        }
      } catch (e) {
        console.error('[API Report Orientador] Groq fallback:', e);
      }
    }

    return NextResponse.json({
      orientadorName,
      dateStr,
      version: '2.4',
      stats: {
        totalStudents: students.length,
        criticosCount,
        moderadosCount,
        observacaoCount,
        interventionsCount: interventions?.length || 0,
      },
      studentWatchlist,
      interventions: (interventions || []).map(i => ({
        title: i.title,
        description: i.description,
        status: i.status,
        date: new Date(i.created_at).toLocaleDateString('pt-BR'),
      })),
      aiSummary,
    });

  } catch (err: any) {
    console.error('API Report Orientador Error:', err);
    return NextResponse.json({ error: err.message || 'Erro ao gerar relatório do orientador.' }, { status: 500 });
  }
}
