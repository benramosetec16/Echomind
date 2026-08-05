'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '../../utils/supabase/server'

export async function login(formData: FormData) {
  const supabase = await createClient()

  const email = (formData.get('email') as string)?.trim().toLowerCase()
  const password = formData.get('password') as string

  if (!email || !password) {
    return { error: 'Identity and Keyphrase are required' }
  }

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/', 'layout')
  redirect('/dashboard')
}

export async function signup(formData: FormData) {
  const supabase = await createClient()

  const email = (formData.get('email') as string)?.trim().toLowerCase()
  const password = formData.get('password') as string
  const fullName = (formData.get('fullName') as string)?.trim()
  const requestedRole = (formData.get('role') as string) || 'aluno'
  const institutionCode = (formData.get('institutionCode') as string)?.trim()?.toUpperCase() || ''
  const classroomCode = (formData.get('classroomCode') as string)?.trim()?.toUpperCase() || ''
  // Backward compat: old 'code' field maps to institutionCode
  const legacyCode = (formData.get('code') as string)?.trim()?.toUpperCase() || ''
  
  let institutionId = (formData.get('institutionId') as string)?.trim() || ''
  let classroomId = (formData.get('classroomId') as string)?.trim() || ''
  let role = requestedRole
  const guardianName = (formData.get('guardianName') as string)?.trim() || ''
  const guardianPhone = (formData.get('guardianPhone') as string)?.trim() || ''

  if (!email || !password || !fullName) {
    return { error: 'Identity, Keyphrase and Name are required' }
  }

  // Resolve institution code (or legacy single code)
  const instCode = institutionCode || legacyCode
  if (instCode) {
    const { data: codeData } = await supabase
      .from('institutional_codes')
      .select('*')
      .eq('code', instCode)
      .eq('status', 'ativo')
      .maybeSingle()

    if (codeData) {
      institutionId = codeData.institution_id
      if (codeData.classroom_id) classroomId = codeData.classroom_id
      if (codeData.type && codeData.type !== 'sala') {
        role = codeData.type
      }
    }
  }

  // Resolve classroom code separately
  if (classroomCode) {
    const { data: roomData } = await supabase
      .from('classrooms')
      .select('id, institution_id')
      .eq('code', classroomCode)
      .maybeSingle()

    if (roomData) {
      classroomId = roomData.id
      if (!institutionId) institutionId = roomData.institution_id
    }
  }

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
        role: role,
        institution_id: institutionId,
        classroom_id: classroomId,
        guardian_name: guardianName,
        guardian_phone: guardianPhone,
      },
    },
  })

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/', 'layout')
  redirect('/dashboard')
}

export async function requestPasswordReset(formData: FormData) {
  const email = (formData.get('email') as string)?.trim().toLowerCase()
  if (!email) return { error: 'E-mail é obrigatório' }

  const { createAdminClient } = await import('../../utils/supabase/admin')
  const { sendSystemEmail } = await import('../../utils/email')

  const adminAuth = createAdminClient()

  // Verify if user exists first using RPC
  const { data: userId, error: userError } = await adminAuth.rpc('get_user_id_by_email', { user_email: email })
  if (userError || !userId) {
    // Return success anyway to prevent user enumeration
    return { success: true }
  }

  // 1. Generate 6 digit OTP
  const otp = Math.floor(100000 + Math.random() * 900000).toString()

  // 2. Set expiration (15 minutes)
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString()

  // 3. Save to DB using Admin Client
  const { error: dbError } = await adminAuth
    .from('password_reset_otps')
    .insert({ email: email, otp_code: otp, expires_at: expiresAt })

  if (dbError) {
    return { error: 'Falha ao processar solicitação.' }
  }

  // 4. Send email via EmailJS
  try {
    await sendSystemEmail({
      to_email: email,
      title: 'Recuperação de Acesso',
      badge: 'SEGURANÇA',
      message: 'Recebemos uma solicitação de recuperação de senha para a sua conta. Utilize o código abaixo para validar sua identidade.',
      code_label: 'SEU CÓDIGO NEURAL (OTP)',
      code: otp,
      code_description: 'Este código expira em 15 minutos e só pode ser utilizado uma vez.',
      button_text: 'RETORNAR AO LOGIN',
      button_link: '/login',
    })
    return { success: true }
  } catch (err: any) {
    return { error: err.message || 'Erro ao enviar o e-mail de recuperação.' }
  }
}

export async function confirmPasswordReset(formData: FormData) {
  const email = (formData.get('email') as string)?.trim().toLowerCase()
  const otp = (formData.get('otp') as string)?.trim()
  const newPassword = formData.get('newPassword') as string

  if (!email || !otp || !newPassword) return { error: 'Preencha todos os campos.' }

  const { createAdminClient } = await import('../../utils/supabase/admin')
  const adminAuth = createAdminClient()

  // 1. Validate OTP
  const { data: otpRecord, error: otpError } = await adminAuth
    .from('password_reset_otps')
    .select('*')
    .eq('email', email)
    .eq('otp_code', otp)
    .eq('used', false)
    .gte('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (otpError || !otpRecord) {
    return { error: 'Código inválido ou expirado.' }
  }

  // 2. Find User ID via RPC
  const { data: userId, error: userError } = await adminAuth.rpc('get_user_id_by_email', { user_email: email })
  if (userError || !userId) {
    return { error: 'Usuário não encontrado.' }
  }

  // 3. Update password
  const { error: updateError } = await adminAuth.auth.admin.updateUserById(userId, { password: newPassword })
  if (updateError) {
    return { error: 'Falha ao redefinir a senha.' }
  }

  // 4. Mark OTP as used
  await adminAuth.from('password_reset_otps').update({ used: true }).eq('id', otpRecord.id)

  return { success: true }
}
