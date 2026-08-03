import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { createClient } from '@/utils/supabase/server'

// GET /api/admin/users — listar membros de uma instituição
export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    if (profile?.role !== 'administrador') return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })

    const { searchParams } = new URL(req.url)
    const institution_id = searchParams.get('institution_id')
    if (!institution_id) return NextResponse.json({ error: 'institution_id obrigatório' }, { status: 400 })

    const admin = createAdminClient()
    const { data: users, error } = await admin
      .from('profiles')
      .select('id, full_name, role, created_at, last_login')
      .eq('institution_id', institution_id)
      .order('role', { ascending: true }) // Group by role roughly
      .order('full_name', { ascending: true })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ users })
  } catch (err: any) {
    console.error('API Users GET Error:', err)
    return NextResponse.json({ error: err.message || 'Erro interno.' }, { status: 500 })
  }
}
