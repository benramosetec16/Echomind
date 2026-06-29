import { createClient } from './supabase/client';

export type UserRole = 'aluno' | 'professor' | 'orientador' | 'administrador';

export const ROLE_LABELS: Record<UserRole, string> = {
  aluno: 'Aluno',
  professor: 'Professor',
  orientador: 'Orientador',
  administrador: 'Administrador',
};

export const INSTITUTIONAL_ROLES: UserRole[] = ['professor', 'orientador', 'administrador'];

/**
 * Fetches the current user's role from Supabase profiles table.
 * Returns 'aluno' as default if not found.
 */
export async function getUserRole(): Promise<UserRole> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return 'aluno';

  const { data } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  return (data?.role as UserRole) || 'aluno';
}

/**
 * Checks if the given role has access to institutional features.
 */
export function hasInstitutionalAccess(role: UserRole): boolean {
  return INSTITUTIONAL_ROLES.includes(role);
}

/**
 * Updates the current user's role. Only admins can change roles.
 * (For demo purposes, this allows self-role selection in profile.)
 */
export async function updateUserRole(role: UserRole): Promise<{ error?: string }> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Não autenticado' };

  const { error } = await supabase
    .from('profiles')
    .update({ role })
    .eq('id', user.id);

  if (error) return { error: error.message };
  return {};
}
