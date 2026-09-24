/**
 * EchoMind Protect — Definições de Tipos
 *
 * REGRA: Estes tipos nunca devem conter referência a
 * guardian_name ou guardian_phone do perfil do aluno.
 * O routing jamais expõe o responsável legal como destinatário.
 */

export type ProtectRequestKind =
  | 'want_to_talk'
  | 'report_situation'
  | 'worried_about_someone'
  | 'dont_know'
  | 'generic';

export type ProtectRoutingType = 'pending' | 'normal' | 'special_protection';

export type ProtectEntryType = 'text' | 'libras' | 'text_and_libras';

export type ProtectStatus =
  | 'created'
  | 'under_review'
  | 'accepted'
  | 'forwarded'
  | 'in_follow_up'
  | 'concluded'
  | 'archived';

export type ProtectAuditAction =
  | 'created'
  | 'viewed'
  | 'routing_determined'
  | 'status_changed'
  | 'assigned'
  | 'note_added'
  | 'forwarded'
  | 'concluded'
  | 'archived'
  | 'ai_summary_generated';

export interface ProtectRequest {
  id: string;
  student_id: string;
  institution_id: string;
  entry_type: ProtectEntryType;
  request_kind: ProtectRequestKind;
  report_text: string | null;
  involves_guardian: boolean | null;
  routing_type: ProtectRoutingType;
  is_urgent: boolean;
  status: ProtectStatus;
  assigned_to: string | null;
  assigned_at: string | null;
  concluded_at: string | null;
  concluded_by: string | null;
  conclusion_notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProtectStatusHistoryEntry {
  id: string;
  request_id: string;
  previous_status: ProtectStatus | null;
  new_status: ProtectStatus;
  changed_by: string;
  changed_at: string;
  note: string | null;
}

export interface ProtectRoutingDecision {
  routingType: ProtectRoutingType;
  /** UUID do profissional autorizado. NUNCA o guardian do aluno. */
  assignedTo: string | null;
  /** Motivo para registro de auditoria interna — nunca exposto ao aluno */
  auditReason: string;
}

export interface ProtectPreventionContent {
  id: string;
  category: string;
  title: string;
  summary: string;
  content_md: string | null;
  source_url: string | null;
  source_name: string | null;
  legal_reference: string | null;
  age_min: number | null;
  age_max: number | null;
  is_active: boolean;
}

/** Labels de status exibidos ao aluno (linguagem cuidadosa, sem termos jurídicos) */
export const PROTECT_STATUS_LABELS: Record<ProtectStatus, string> = {
  created: 'Recebido',
  under_review: 'Em análise',
  accepted: 'Acolhido',
  forwarded: 'Encaminhado',
  in_follow_up: 'Em acompanhamento',
  concluded: 'Concluído',
  archived: 'Arquivado',
};

/** Labels do tipo de ajuda exibidos ao aluno */
export const PROTECT_KIND_LABELS: Record<ProtectRequestKind, string> = {
  want_to_talk: 'Quero conversar com alguém',
  report_situation: 'Quero relatar uma situação',
  worried_about_someone: 'Estou preocupado com alguém',
  dont_know: 'Não sei explicar, mas preciso de ajuda',
  generic: 'Pedido de ajuda',
};

/** Ícones Material Symbols para cada tipo */
export const PROTECT_KIND_ICONS: Record<ProtectRequestKind, string> = {
  want_to_talk: 'chat',
  report_situation: 'description',
  worried_about_someone: 'group',
  dont_know: 'help',
  generic: 'shield_person',
};

/** Ícones para status */
export const PROTECT_STATUS_ICONS: Record<ProtectStatus, string> = {
  created: 'radio_button_unchecked',
  under_review: 'pending',
  accepted: 'handshake',
  forwarded: 'forward',
  in_follow_up: 'track_changes',
  concluded: 'check_circle',
  archived: 'inventory_2',
};
