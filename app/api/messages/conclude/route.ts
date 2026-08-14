import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

// PATCH /api/messages/conclude
// Marca uma solicitação de sessão como concluída.
// Apenas o receiver (orientador/gestor destinatário) pode concluir.
export async function PATCH(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
    }

    // Verificar que o usuário é orientador, gestor ou administrador
    const { data: myProfile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError || !myProfile) {
      return NextResponse.json({ error: 'Perfil não encontrado.' }, { status: 403 });
    }

    if (!['orientador', 'gestor', 'administrador'].includes(myProfile.role ?? '')) {
      return NextResponse.json(
        { error: 'Acesso negado. Apenas orientadores e gestores podem concluir sessões.' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { message_id } = body;

    if (!message_id) {
      return NextResponse.json({ error: 'message_id é obrigatório.' }, { status: 400 });
    }

    // Verificar que a mensagem existe, é do tipo session_request
    // e que o usuário autenticado é o receiver (validação de vínculo real)
    const { data: message, error: fetchError } = await supabase
      .from('messages')
      .select('id, type, session_status, receiver_id')
      .eq('id', message_id)
      .eq('type', 'session_request')
      .eq('receiver_id', user.id)
      .maybeSingle();

    if (fetchError) {
      console.error('[API messages/conclude] Erro ao buscar mensagem:', fetchError);
      return NextResponse.json({ error: 'Erro ao verificar a solicitação.' }, { status: 500 });
    }

    if (!message) {
      return NextResponse.json(
        { error: 'Solicitação não encontrada ou você não tem permissão para concluí-la.' },
        { status: 404 }
      );
    }

    if (message.session_status === 'concluida') {
      return NextResponse.json(
        { error: 'Esta sessão já foi marcada como concluída.' },
        { status: 409 }
      );
    }

    // Atualizar o status para concluída
    const { data: updated, error: updateError } = await supabase
      .from('messages')
      .update({
        session_status: 'concluida',
        concluded_at: new Date().toISOString(),
        concluded_by: user.id,
      })
      .eq('id', message_id)
      .eq('receiver_id', user.id)
      .eq('type', 'session_request')
      .select()
      .single();

    if (updateError) {
      console.error('[API messages/conclude] Erro ao atualizar sessão:', updateError);
      return NextResponse.json({ error: 'Não foi possível concluir a sessão.' }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: updated });

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erro interno.';
    console.error('[API messages/conclude]', err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
