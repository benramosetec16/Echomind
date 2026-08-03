import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { createClient } from '@/utils/supabase/server'
import { sendSystemEmail } from '@/utils/email'

// POST /api/institution/codes — gerar código e enviar por e-mail
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
    const { type, classroom_id, custom_code, recipientEmail, institution_id } = body

    const instId = institution_id || profile?.institution_id
    if (!instId || !type) {
      return NextResponse.json({ error: 'institution_id e type são obrigatórios' }, { status: 400 })
    }

    const admin = createAdminClient()

    const generatedCode = custom_code?.trim()
      ? custom_code.trim().toUpperCase()
      : `${type.substring(0, 4).toUpperCase()}${Math.floor(1000 + Math.random() * 9000)}`

    const { data: codeData, error: codeError } = await admin
      .from('institutional_codes')
      .insert({
        institution_id: instId,
        code: generatedCode,
        type,
        status: 'ativo',
        created_by: user.id,
        classroom_id: classroom_id || null,
      })
      .select()
      .single()

    if (codeError) return NextResponse.json({ error: codeError.message }, { status: 500 })

    // Buscar nome da instituição
    const { data: institution } = await admin
      .from('institutions')
      .select('name')
      .eq('id', instId)
      .single()

    const institutionName = institution?.name || 'sua instituição'

    const roleLabels: Record<string, string> = {
      gestor: 'Gestor',
      professor: 'Professor',
      orientador: 'Orientador',
      aluno: 'Aluno',
      sala: 'Sala de Aula',
    }

    // Enviar e-mail se informado
    let emailSent = false
    if (recipientEmail) {
      try {
        await sendSystemEmail({
          to_email: recipientEmail,
          title: `Seu código de acesso para ${institutionName}`,
          badge: `CÓDIGO ${roleLabels[type]?.toUpperCase() || type.toUpperCase()}`,
          user_name: '',
          message: `Você foi convidado para ingressar na instituição ${institutionName} na plataforma EchoMind. Use o código abaixo para se vincular à instituição ao acessar sua conta.`,
          code_label: 'SEU CÓDIGO DE ACESSO',
          code: generatedCode,
          code_description: `Este código é válido para o cargo de ${roleLabels[type] || type}. Use-o na tela de perfil da plataforma EchoMind.`,
          button_text: 'ACESSAR ECHOMIND',
          button_link: `${process.env.NEXT_PUBLIC_APP_URL || 'https://echomind-rho.vercel.app'}/login`,
          security_message: 'Se você não esperava este convite, desconsidere este e-mail.',
          footer_message: 'EchoMind — Plataforma de Saúde Mental Estudantil',
        })
        emailSent = true
      } catch (emailErr: any) {
        console.error('Falha ao enviar e-mail do código:', emailErr.message)
      }
    }

    return NextResponse.json({ 
      code: generatedCode, 
      id: codeData.id,
      emailSent 
    })
  } catch (err: any) {
    console.error('API Institution Codes POST Error:', err)
    return NextResponse.json({ error: err.message || 'Erro interno' }, { status: 500 })
  }
}
