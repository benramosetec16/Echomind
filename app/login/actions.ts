'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '../../utils/supabase/server'

export async function login(formData: FormData) {
  const supabase = await createClient()

  const email = (formData.get('email') as string)?.trim()
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

  const email = (formData.get('email') as string)?.trim()
  const password = formData.get('password') as string
  const fullName = (formData.get('fullName') as string)?.trim()
  const requestedRole = (formData.get('role') as string) || 'aluno'
  const code = (formData.get('code') as string)?.trim()?.toUpperCase() || ''
  
  let institutionId = (formData.get('institutionId') as string)?.trim() || ''
  let classroomId = (formData.get('classroomId') as string)?.trim() || ''
  let role = requestedRole
  const guardianName = (formData.get('guardianName') as string)?.trim() || ''
  const guardianPhone = (formData.get('guardianPhone') as string)?.trim() || ''

  if (!email || !password || !fullName) {
    return { error: 'Identity, Keyphrase and Name are required' }
  }

  // If code is provided, validate code within institution
  if (code) {
    // 1. Check institutional_codes table
    const { data: codeData } = await supabase
      .from('institutional_codes')
      .select('*')
      .eq('code', code)
      .eq('status', 'ativo')
      .maybeSingle()

    if (codeData) {
      institutionId = codeData.institution_id
      if (codeData.classroom_id) classroomId = codeData.classroom_id
      if (codeData.type && codeData.type !== 'sala') {
        role = codeData.type
      }
    } else {
      // 2. Check classrooms table directly
      const { data: roomData } = await supabase
        .from('classrooms')
        .select('id, institution_id')
        .eq('code', code)
        .maybeSingle()

      if (roomData) {
        institutionId = roomData.institution_id
        classroomId = roomData.id
      }
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
