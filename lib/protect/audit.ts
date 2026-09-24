/**
 * EchoMind Protect — Registro de Auditoria
 *
 * Toda ação em uma solicitação Protect deve ser registrada.
 * Os logs de auditoria são protegidos por RLS (apenas administradores).
 *
 * LGPD: logs não armazenam conteúdo do relato — apenas metadados da ação.
 */

import { createClient } from '@/utils/supabase/server';
import type { ProtectAuditAction } from './types';

interface AuditEntry {
  requestId: string;
  actorId: string;
  actorRole: string;
  action: ProtectAuditAction;
  details?: Record<string, unknown>;
}

/**
 * Registra uma ação no log de auditoria do Protect.
 * Falhas no log NÃO bloqueiam a operação principal (resiliente).
 */
export async function logProtectAudit(entry: AuditEntry): Promise<void> {
  try {
    const supabase = await createClient();

    await supabase.from('protect_audit_log').insert({
      request_id: entry.requestId,
      actor_id: entry.actorId,
      actor_role: entry.actorRole,
      action: entry.action,
      details: entry.details ?? null,
    });
  } catch (err) {
    // Auditoria nunca deve quebrar o fluxo principal
    console.error('[Protect Audit] Falha ao registrar auditoria:', err);
  }
}

/**
 * Registra mudança de status e cria entrada no histórico.
 */
export async function logStatusChange({
  requestId,
  actorId,
  actorRole,
  previousStatus,
  newStatus,
  note,
}: {
  requestId: string;
  actorId: string;
  actorRole: string;
  previousStatus: string | null;
  newStatus: string;
  note?: string;
}): Promise<void> {
  try {
    const supabase = await createClient();

    await supabase.from('protect_status_history').insert({
      request_id: requestId,
      previous_status: previousStatus,
      new_status: newStatus,
      changed_by: actorId,
      note: note ?? null,
    });

    await logProtectAudit({
      requestId,
      actorId,
      actorRole,
      action: 'status_changed',
      details: { from: previousStatus, to: newStatus },
    });
  } catch (err) {
    console.error('[Protect Audit] Falha ao registrar mudança de status:', err);
  }
}
