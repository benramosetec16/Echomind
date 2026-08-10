import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';

// POST /api/orientador/interventions
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
    }

    const { data: myProfile } = await supabase
      .from('profiles')
      .select('role, institution_id')
      .eq('id', user.id)
      .single();

    if (!myProfile || !['orientador', 'gestor', 'administrador'].includes(myProfile.role ?? '')) {
      return NextResponse.json({ error: 'Acesso negado. Apenas orientadores e gestores podem registrar intervenções.' }, { status: 403 });
    }

    const body = await req.json();
    const { student_id, title, description, status, institution_id, classroom_id } = body;

    if (!student_id || !title?.trim() || !description?.trim()) {
      return NextResponse.json({ error: 'student_id, title e description são obrigatórios.' }, { status: 400 });
    }

    const admin = createAdminClient();

    // Fetch student profile to get institution_id and classroom_id if not provided
    let finalInstId = institution_id || myProfile.institution_id || null;
    let finalClassroomId = classroom_id || null;

    if (!finalInstId || !finalClassroomId) {
      const { data: studentProfile } = await admin
        .from('profiles')
        .select('institution_id, classroom_id')
        .eq('id', student_id)
        .single();

      if (studentProfile) {
        if (!finalInstId) finalInstId = studentProfile.institution_id;
        if (!finalClassroomId) finalClassroomId = studentProfile.classroom_id;
      }
    }

    const { data: intervention, error: insertError } = await admin
      .from('interventions')
      .insert({
        orientador_id: user.id,
        student_id,
        institution_id: finalInstId,
        classroom_id: finalClassroomId,
        title: title.trim(),
        description: description.trim(),
        status: status || 'pendente',
      })
      .select()
      .single();

    if (insertError) {
      console.error('[API Orientador Interventions] Insert Error:', insertError);
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, intervention });

  } catch (err: any) {
    console.error('[API Orientador Interventions Catch]', err);
    return NextResponse.json({ error: err.message || 'Erro interno ao salvar intervenção.' }, { status: 500 });
  }
}
