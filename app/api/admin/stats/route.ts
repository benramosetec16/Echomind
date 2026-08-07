import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function GET() {
  try {
    const cookieStore = await cookies();
    
    // Auth client
    const authClient = createServerClient(
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

    const { data: userData, error: authError } = await authClient.auth.getUser();
    if (authError || !userData?.user) {
      return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
    }

    // Admin/Gestor check via profile
    const { data: userProfile } = await authClient
      .from('profiles')
      .select('role')
      .eq('id', userData.user.id)
      .single();

    if (!userProfile || !['administrador', 'gestor'].includes(userProfile.role)) {
      return NextResponse.json({ error: "Acesso negado." }, { status: 403 });
    }

    // Service Role Client for unrestricted counts
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!serviceRoleKey) {
      return NextResponse.json({ error: "SUPABASE_SERVICE_ROLE_KEY não configurado." }, { status: 500 });
    }

    const adminClient = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      serviceRoleKey,
      {
        cookies: {
          getAll() { return []; },
          setAll() {},
        },
      }
    );

    // Fetch exact counts
    const { data: profiles } = await adminClient.from('profiles').select('id, role, created_at');
    const { count: classroomsCount } = await adminClient.from('classrooms').select('*', { count: 'exact', head: true });
    const { count: institutionsCount } = await adminClient.from('institutions').select('*', { count: 'exact', head: true });
    const { count: journalCount } = await adminClient.from('aetheric_journal').select('*', { count: 'exact', head: true });
    const { count: bioCount } = await adminClient.from('biometric_logs').select('*', { count: 'exact', head: true });
    
    const { data: recentProfiles } = await adminClient.from('profiles').select('id, role, created_at').order('created_at', { ascending: false }).limit(5);
    const { data: recentBio } = await adminClient.from('biometric_logs').select('id, type, created_at').order('created_at', { ascending: false }).limit(5);

    let stats = {
      activeUsers: 0,
      activeUsersNew: 0,
      institutions: institutionsCount || 0,
      classrooms: classroomsCount || 0,
      alunos: 0,
      professores: 0,
      orientadores: 0,
      gestores: 0,
      aiProcessings: (journalCount || 0) + (bioCount || 0),
      recentProfiles: recentProfiles || [],
      recentBio: recentBio || [],
    };

    if (profiles) {
      stats.activeUsers = profiles.length;
      const lastWeek = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      stats.activeUsersNew = profiles.filter(p => new Date(p.created_at) > lastWeek).length;

      const rolesCount: Record<string, number> = { aluno: 0, professor: 0, orientador: 0, gestor: 0, administrador: 0 };
      profiles.forEach(p => { if (rolesCount[p.role] !== undefined) rolesCount[p.role]++; });

      stats.alunos = rolesCount.aluno;
      stats.professores = rolesCount.professor;
      stats.orientadores = rolesCount.orientador;
      stats.gestores = rolesCount.gestor;
    }

    return NextResponse.json({ stats });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
