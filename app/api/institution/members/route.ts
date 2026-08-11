import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';

export async function DELETE(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const memberId = searchParams.get('id');

    if (!memberId) {
      return NextResponse.json({ error: 'ID do membro é obrigatório.' }, { status: 400 });
    }

    // Verificar se o usuário que fez a requisição é gestor ou administrador
    const { data: callerProfile } = await supabase
      .from('profiles')
      .select('role, institution_id')
      .eq('id', user.id)
      .single();

    if (!callerProfile || !['gestor', 'administrador'].includes(callerProfile.role)) {
      return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 });
    }

    const admin = createAdminClient();

    // Buscar o membro alvo para garantir que pertence à mesma instituição (se for gestor)
    const { data: targetMember } = await admin
      .from('profiles')
      .select('institution_id')
      .eq('id', memberId)
      .single();

    if (!targetMember) {
      return NextResponse.json({ error: 'Membro não encontrado.' }, { status: 404 });
    }

    if (callerProfile.role === 'gestor' && targetMember.institution_id !== callerProfile.institution_id) {
      return NextResponse.json({ error: 'Você só pode revogar membros da sua própria instituição.' }, { status: 403 });
    }

    // 1. Limpar campos no perfil do usuário
    const { error: profileError } = await admin
      .from('profiles')
      .update({
        institution_id: null,
        classroom_id: null,
        professor_id: null,
        orientador_id: null,
      })
      .eq('id', memberId);

    if (profileError) {
      throw new Error('Falha ao atualizar o perfil do membro: ' + profileError.message);
    }

    // 2. Limpar o usuário das salas de aula onde ele for professor
    await admin
      .from('classrooms')
      .update({ professor_id: null })
      .eq('professor_id', memberId);

    // 3. Limpar o usuário das salas de aula onde ele for orientador
    await admin
      .from('classrooms')
      .update({ orientador_id: null })
      .eq('orientador_id', memberId);

    // 4. Revogar os códigos institucionais usados por ele ou criados por ele
    await admin
      .from('institutional_codes')
      .update({ status: 'revogado' })
      .eq('used_by', memberId);

    return NextResponse.json({ success: true, message: 'Vínculo revogado com sucesso.' });

  } catch (err: any) {
    console.error('[API Institution Members DELETE Catch]', err);
    return NextResponse.json({ error: err.message || 'Erro interno ao revogar vínculo.' }, { status: 500 });
  }
}
