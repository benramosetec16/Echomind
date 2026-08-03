import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { createClient } from '@/utils/supabase/server'

// POST /api/onboarding/join — usuário legado informa código para se vincular a uma instituição
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const body = await req.json()
  const { code } = body
  if (!code?.trim()) return NextResponse.json({ error: 'Código obrigatório' }, { status: 400 })

  const admin = createAdminClient()

  // 1. Buscar o código ativo
  const { data: codeData, error: codeError } = await admin
    .from('institutional_codes')
    .select('*')
    .eq('code', code.trim().toUpperCase())
    .eq('status', 'ativo')
    .maybeSingle()

  if (codeError || !codeData) {
    return NextResponse.json({ error: 'Código inválido, já utilizado ou não encontrado.' }, { status: 400 })
  }

  // 2. Determinar o role pelo tipo do código
  let newRole = 'aluno'
  if (codeData.type !== 'sala') newRole = codeData.type

  // 3. Atualizar perfil do usuário — vincular à instituição e sala (se houver)
  const updatePayload: Record<string, any> = {
    institution_id: codeData.institution_id,
    onboarding_completed: true,
    role: newRole,
  }
  if (codeData.classroom_id) {
    updatePayload.classroom_id = codeData.classroom_id
  }

  const { error: profileError } = await admin
    .from('profiles')
    .update(updatePayload)
    .eq('id', user.id)

  if (profileError) return NextResponse.json({ error: profileError.message }, { status: 500 })

  // 4. Marcar código como utilizado
  await admin.from('institutional_codes').update({
    status: 'utilizado',
    used_by: user.id,
    used_at: new Date().toISOString(),
  }).eq('id', codeData.id)

  return NextResponse.json({ 
    success: true, 
    role: newRole, 
    institution_id: codeData.institution_id 
  })
}
