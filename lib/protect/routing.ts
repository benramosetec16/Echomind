/**
 * EchoMind Protect — Protected Routing Engine
 *
 * PRINCÍPIO CENTRAL:
 * O sistema não pergunta "quem é o responsável pelo aluno?"
 * Ele pergunta "quem está autorizado e é APROPRIADO para receber
 * esta informação neste contexto?"
 *
 * REGRA CRÍTICA:
 * O guardian cadastrado em profiles.guardian_name / guardian_phone
 * JAMAIS é considerado como destinatário de qualquer solicitação Protect.
 *
 * A IA NÃO toma decisões críticas neste módulo.
 * O routing é baseado em regras institucionais configuradas previamente.
 */

import { createClient } from '@/utils/supabase/server';
import type { ProtectRoutingDecision, ProtectRoutingType } from './types';

/**
 * Determina o tipo de routing com base na resposta da pergunta de segurança.
 *
 * Regra de segurança:
 * - involves_guardian = true  → special_protection (envolvimento de responsável confirmado)
 * - involves_guardian = null  → special_protection (não respondeu = dúvida = proteção)
 * - involves_guardian = false → normal
 */
export function determineRoutingType(
  involvesGuardian: boolean | null,
): ProtectRoutingType {
  if (involvesGuardian === false) return 'normal';
  // null (não respondeu) ou true (confirmou) → proteção especial
  return 'special_protection';
}

/**
 * Busca o profissional mais adequado para receber a solicitação.
 *
 * Nunca retorna o guardian do aluno.
 * Busca em protect_authorized_roles por ordem de prioridade.
 */
export async function findAuthorizedProfessional(
  institutionId: string,
  routingType: ProtectRoutingType,
): Promise<string | null> {
  if (routingType === 'pending') return null;

  const supabase = await createClient();

  // Busca papéis autorizados para este tipo de routing, por prioridade
  const { data: authorizedRoles } = await supabase
    .from('protect_authorized_roles')
    .select('role, priority')
    .eq('institution_id', institutionId)
    .eq('is_active', true)
    .in('routing_type', [routingType, 'both'])
    .order('priority', { ascending: true });

  if (!authorizedRoles || authorizedRoles.length === 0) return null;

  // Para cada papel autorizado (por prioridade), busca um profissional disponível
  for (const { role } of authorizedRoles) {
    const { data: professional } = await supabase
      .from('profiles')
      .select('id')
      .eq('institution_id', institutionId)
      .eq('role', role)
      .limit(1)
      .maybeSingle();

    if (professional?.id) {
      return professional.id;
    }
  }

  return null;
}

/**
 * Decisão completa de routing para uma nova solicitação Protect.
 *
 * Esta função é o coração do Protected Routing.
 * Ela nunca consulta guardian_name ou guardian_phone.
 */
export async function determineRouting(
  studentId: string,
  institutionId: string,
  involvesGuardian: boolean | null,
): Promise<ProtectRoutingDecision> {
  const routingType = determineRoutingType(involvesGuardian);

  const assignedTo = await findAuthorizedProfessional(institutionId, routingType);

  let auditReason: string;
  if (involvesGuardian === null) {
    auditReason =
      'Student did not answer safety question — protective routing applied by default';
  } else if (involvesGuardian === true) {
    auditReason =
      'Student indicated possible guardian/caregiver involvement — special protection routing applied';
  } else {
    auditReason = 'Normal routing — student indicated no guardian conflict';
  }

  return {
    routingType,
    assignedTo,
    auditReason,
  };
}
