import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';

// GET /api/orientador/students
// Retorna todos os alunos vinculados ao orientador autenticado (via sala ou diretamente)
export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
    }

    // Verificar que o usuário é orientador
    const { data: myProfile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!myProfile || myProfile.role !== 'orientador') {
      return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 });
    }

    const admin = createAdminClient();

    // 1. Buscar salas gerenciadas pelo orientador
    const { data: myRooms } = await admin
      .from('classrooms')
      .select('id, name')
      .eq('orientador_id', user.id);

    const roomIds = myRooms?.map(r => r.id) ?? [];
    const roomsMap = new Map(myRooms?.map(r => [r.id, r.name]) ?? []);

    // 2. Buscar alunos — dois caminhos simultâneos (legado + novo)
    let studentsMap = new Map<string, any>();

    // Caminho A: alunos com orientador_id direto no perfil
    const { data: directStudents } = await admin
      .from('profiles')
      .select('id, full_name, classroom_id, guardian_name, guardian_phone, created_at')
      .eq('role', 'aluno')
      .eq('orientador_id', user.id);

    directStudents?.forEach(s => studentsMap.set(s.id, s));

    // Caminho B: alunos nas salas do orientador
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

    if (studentIds.length === 0) {
      return NextResponse.json({ students: [], checkins: [], biometrics: [] });
    }

    // 3. Buscar check-ins emocionais dos alunos
    const { data: checkins } = await admin
      .from('emotional_checkins')
      .select('user_id, valence_value, created_at')
      .in('user_id', studentIds)
      .order('created_at', { ascending: false });

    // 4. Buscar biometrics dos alunos
    const { data: biometrics } = await admin
      .from('biometrics')
      .select('user_id, energy_level, created_at')
      .in('user_id', studentIds)
      .order('created_at', { ascending: false });

    // 5. Buscar intervenções do orientador
    const { data: interventions } = await admin
      .from('interventions')
      .select('*')
      .eq('orientador_id', user.id)
      .order('created_at', { ascending: false });

    // 6. Contar pedidos de sessão
    const { count: sessionCount } = await admin
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .eq('receiver_id', user.id)
      .eq('type', 'session_request');

    // 7. Enriquecer alunos com dados calculados
    const enrichedStudents = students.map(student => {
      const userCheckins = checkins?.filter(c => c.user_id === student.id) ?? [];
      const userBiometrics = biometrics?.filter(b => b.user_id === student.id) ?? [];

      let riskLevel = 'Baixo';
      let trend: 'decline' | 'stable' | 'improve' = 'stable';
      let lastCheckin = 'Sem registros';
      let moodAvg = 0;
      let energyAvg = 0;

      if (userCheckins.length > 0) {
        const lastDate = new Date(userCheckins[0].created_at);
        lastCheckin = `${lastDate.toLocaleDateString('pt-BR')} ${lastDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
        moodAvg = Math.round(userCheckins.reduce((acc, c) => acc + c.valence_value, 0) / userCheckins.length);

        if (moodAvg < 30 && userCheckins.length >= 3) riskLevel = 'Crítico';
        else if (moodAvg < 50) riskLevel = 'Moderado';
        else if (moodAvg < 70) riskLevel = 'Observação';

        if (userCheckins.length > 1) {
          const diff = userCheckins[0].valence_value - userCheckins[1].valence_value;
          if (diff < -10) trend = 'decline';
          else if (diff > 10) trend = 'improve';
        }
      }

      if (userBiometrics.length > 0) {
        energyAvg = Math.round(
          userBiometrics.reduce((acc, b) => acc + (b.energy_level ?? 50), 0) / userBiometrics.length
        );
      }

      const nameParts = (student.full_name ?? 'Aluno').split(' ');
      const initials = nameParts.length > 1
        ? `${nameParts[0][0]}${nameParts[1][0]}`
        : nameParts[0].substring(0, 2);

      return {
        id: student.id,
        initials: initials.toUpperCase(),
        name: student.full_name ?? 'Aluno Sem Nome',
        course: roomsMap.get(student.classroom_id) ?? 'Sala Não Informada',
        riskLevel,
        trend,
        lastCheckin,
        moodAvg,
        energyAvg,
        checkinCount: userCheckins.length + userBiometrics.length,
        guardianName: student.guardian_name ?? 'Não informado',
        guardianPhone: student.guardian_phone ?? 'Não informado',
      };
    });

    return NextResponse.json({
      students: enrichedStudents,
      interventions: interventions ?? [],
      sessionCount: sessionCount ?? 0,
    });

  } catch (err: any) {
    console.error('[/api/orientador/students]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
