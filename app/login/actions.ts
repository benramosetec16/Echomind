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
  const role = (formData.get('role') as string) || 'aluno'
  
  // New institutional and guardian fields
  const institutionId = (formData.get('institutionId') as string)?.trim() || ''
  const classroomId = (formData.get('classroomId') as string)?.trim() || ''
  const guardianName = (formData.get('guardianName') as string)?.trim() || ''
  const guardianPhone = (formData.get('guardianPhone') as string)?.trim() || ''

  if (!email || !password || !fullName) {
    return { error: 'Identity, Keyphrase and Name are required' }
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

  // If email confirmation is enabled, we should redirect to a confirmation page or show a message.
  // For now, if no error, we try to redirect. 
  revalidatePath('/', 'layout')
  redirect('/dashboard')
}
