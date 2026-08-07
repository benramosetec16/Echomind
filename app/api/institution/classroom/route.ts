import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { createClient } from '@/utils/supabase/server'
import { sendSystemEmail } from '@/utils/email'

// POST /api/institution/classroom — criar sala (usa service role para contornar RLS)
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

    const { data: profile } = await supabase
      .from('profiles')
      .select('role, institution_id, full_name')
      .eq('id', user.id)
      .single()

    if (!['gestor', 'administrador'].includes(profile?.role || '')) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    const body = await req.json()
    const { name, code, professor_id, orientador_id, institution_id } = body

    const instId = institution_id || profile?.institution_id
    if (!instId || !name?.trim()) {
      return NextResponse.json({ error: 'institution_id e name são obrigatórios' }, { status: 400 })
    }

    const admin = createAdminClient()

    const { data: classroom, error } = await admin
      .from('classrooms')
      .insert({
        institution_id: instId,
        name: name.trim(),
        code: code?.trim().toUpperCase() || null,
        professor_id: professor_id || null,
        orientador_id: orientador_id || null,
      })
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ classroom })
  } catch (err: any) {
    console.error('API Classroom POST Error:', err)
    return NextResponse.json({ error: err.message || 'Erro interno' }, { status: 500 })
  }
}

// DELETE /api/institution/classroom — remover sala
export async function DELETE(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!['gestor', 'administrador'].includes(profile?.role || '')) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'id é obrigatório' }, { status: 400 })

    const admin = createAdminClient()
    const { error } = await admin.from('classrooms').delete().eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Erro interno' }, { status: 500 })
  }
}

// PUT /api/institution/classroom — atualizar sala
export async function PUT(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!['gestor', 'administrador'].includes(profile?.role || '')) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    const body = await req.json()
    const { id, professor_id, orientador_id } = body

    if (!id) return NextResponse.json({ error: 'id é obrigatório' }, { status: 400 })

    const admin = createAdminClient()
    const { error } = await admin
      .from('classrooms')
      .update({
        professor_id: professor_id || null,
        orientador_id: orientador_id || null,
      })
      .eq('id', id)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Erro interno' }, { status: 500 })
  }
}
