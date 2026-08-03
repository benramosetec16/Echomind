import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { createClient } from '@/utils/supabase/server'

// POST /api/admin/codes — gerar código institucional
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    if (profile?.role !== 'administrador') return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })

    const body = await req.json()
    const { institution_id, type, gestorEmail } = body

    if (!institution_id || !type) {
      return NextResponse.json({ error: 'institution_id e type são obrigatórios' }, { status: 400 })
    }

    const admin = createAdminClient()

    // Gerar código único alfanumérico de 8 caracteres
    const code = Math.random().toString(36).substring(2, 10).toUpperCase()

    const { data: codeData, error: codeError } = await admin
      .from('institutional_codes')
      .insert({
        institution_id,
        code,
        type,
        status: 'ativo',
        created_by: user.id,
      })
      .select()
      .single()

    if (codeError) return NextResponse.json({ error: codeError.message }, { status: 500 })

    // Se informou email do gestor, vincular automaticamente
    if (gestorEmail && type === 'gestor') {
      const { data: targetUserId } = await admin.rpc('get_user_id_by_email', { user_email: gestorEmail.trim().toLowerCase() })
      
      if (targetUserId) {
        await admin.from('profiles').update({
          institution_id,
          role: 'gestor',
          onboarding_completed: true,
        }).eq('id', targetUserId)

        await admin.from('institutional_codes').update({
          status: 'utilizado',
          used_by: targetUserId,
          used_at: new Date().toISOString(),
        }).eq('id', codeData.id)
      }
    }

    return NextResponse.json({ code: codeData.code, id: codeData.id })
  } catch (err: any) {
    console.error('API Codes POST Error:', err)
    return NextResponse.json({ error: err.message || 'Erro interno de configuração (Service Role).' }, { status: 500 })
  }
}

// GET /api/admin/codes — listar códigos
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
    const { data: codes, error } = await admin
      .from('institutional_codes')
      .select('*')
      .eq('institution_id', institution_id)
      .order('created_at', { ascending: false })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ codes })
  } catch (err: any) {
    console.error('API Codes GET Error:', err)
    return NextResponse.json({ error: err.message || 'Erro interno de configuração (Service Role).' }, { status: 500 })
  }
}
