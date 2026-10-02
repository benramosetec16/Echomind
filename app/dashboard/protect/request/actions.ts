'use server';

import { createClient } from '@/utils/supabase/server';
import { determineRouting } from '@/lib/protect/routing';
import { logProtectAudit, logStatusChange } from '@/lib/protect/audit';
import type {
  ProtectRequestKind,
  ProtectEntryType,
  ProtectStatus,
} from '@/lib/protect/types';
import Groq from 'groq-sdk';

/**
 * Cria uma nova solicitação Protect.
 *
 * REGRAS CRÍTICAS:
 * 1. Nunca encaminha para o guardian cadastrado em profiles
 * 2. A IA não decide o routing — apenas o determineRouting() decide
 * 3. Dados de teste devem ser 100% fictícios
 */
export async function createProtectRequest(payload: {
  requestKind: ProtectRequestKind;
  reportText: string;
  entryType: ProtectEntryType;
  involvesGuardian: boolean | null;
  isUrgent?: boolean;
  orientadorId?: string;
}): Promise<{
  success?: boolean;
  requestId?: string;
  routingType?: string;
  error?: string;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'Não autenticado' };

  // Busca a instituição do aluno
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, role, institution_id')
    .eq('id', user.id)
    .single();

  if (!profile?.institution_id) {
    return {
      error:
        'Você precisa estar vinculado a uma instituição para enviar um pedido de ajuda.',
    };
  }

  // === PROTECTED ROUTING ENGINE ===
  const routing = await determineRouting(
    user.id,
    profile.institution_id,
    payload.involvesGuardian,
  );
  
  const assignedTo = payload.orientadorId || routing.assignedTo;

  // Gera resumo auxiliar via IA (apenas organização, sem decisão crítica)
  let aiSummary: string | null = null;
  let isUrgentAI = payload.isUrgent ?? false;

  const apiKey = process.env.GROQ_API_KEY;
  if (apiKey && payload.reportText && payload.reportText.trim().length > 20) {
    try {
      const groq = new Groq({ apiKey });
      const completion = await groq.chat.completions.create({
        messages: [
          {
            role: 'system',
            content: `Você é um assistente de triagem do EchoMind Protect. 
Sua função é APENAS organizar e resumir o relato para facilitar a leitura do profissional humano autorizado.

REGRAS ABSOLUTAS:
- NÃO determine que uma pessoa é agressora ou vítima
- NÃO use termos jurídicos definitivos
- NÃO diagnostique
- NÃO acuse ninguém
- USE linguagem de cuidado: "pode merecer atenção", "é possível que"
- Identifique se há possível urgência (risco imediato mencionado)

Responda APENAS com JSON válido:
{
  "summary": "Resumo organizado do relato em 2-3 frases, linguagem cuidadosa",
  "attention_points": ["ponto1", "ponto2"],
  "possible_urgency": true/false
}`,
          },
          {
            role: 'user',
            content: `Relato: "${payload.reportText}"`,
          },
        ],
        model: 'openai/gpt-oss-20b',
        temperature: 0.3,
        
      });

      const aiResponse = completion.choices[0]?.message?.content;
      if (aiResponse) {
        const parsed = JSON.parse(aiResponse);
        if (parsed.summary) aiSummary = parsed.summary;
        if (parsed.possible_urgency === true) isUrgentAI = true;
      }
    } catch (err) {
      console.warn('[Protect AI] Falha na geração de resumo, continuando sem IA:', err);
    }
  }

  // Salva a solicitação
  const { data: newRequest, error: insertError } = await supabase
    .from('protect_requests')
    .insert({
      student_id: user.id,
      institution_id: profile.institution_id,
      entry_type: payload.entryType,
      request_kind: payload.requestKind,
      report_text: payload.reportText || null,
      involves_guardian: payload.involvesGuardian,
      routing_type: routing.routingType,
      is_urgent: isUrgentAI,
      status: 'created',
      assigned_to: assignedTo,
      assigned_at: assignedTo ? new Date().toISOString() : null,
    })
    .select('id')
    .single();

  if (insertError || !newRequest) {
    return { error: `Erro ao registrar: ${insertError?.message}` };
  }

  // Histórico inicial
  await logStatusChange({
    requestId: newRequest.id,
    actorId: user.id,
    actorRole: profile.role,
    previousStatus: null,
    newStatus: 'created',
    note: 'Solicitação criada pelo estudante',
  });

  // Auditoria de criação
  await logProtectAudit({
    requestId: newRequest.id,
    actorId: user.id,
    actorRole: profile.role,
    action: 'created',
    details: {
      routing_type: routing.routingType,
      has_report_text: !!payload.reportText,
      entry_type: payload.entryType,
      // NÃO logar o conteúdo do relato aqui
    },
  });

  if (routing.assignedTo) {
    await logProtectAudit({
      requestId: newRequest.id,
      actorId: user.id,
      actorRole: profile.role,
      action: 'routing_determined',
      details: {
        routing_type: routing.routingType,
        reason: routing.auditReason,
        // NÃO logar a identidade do profissional ao aluno
      },
    });
  }

  if (aiSummary) {
    await logProtectAudit({
      requestId: newRequest.id,
      actorId: user.id,
      actorRole: profile.role,
      action: 'ai_summary_generated',
      details: { summary_generated: true },
    });
  }

  return {
    success: true,
    requestId: newRequest.id,
    routingType: routing.routingType,
  };
}

/**
 * Busca as solicitações do próprio aluno.
 * RLS garante que só retorna as suas próprias.
 */
export async function getStudentProtectRequests(): Promise<{
  data?: any[];
  error?: string;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'Não autenticado' };

  const { data, error } = await supabase
    .from('protect_requests')
    .select('id, request_kind, status, routing_type, is_urgent, created_at, updated_at')
    .eq('student_id', user.id)
    .order('created_at', { ascending: false });

  if (error) return { error: error.message };
  return { data: data ?? [] };
}

/**
 * Busca a linha do tempo de uma solicitação (para o aluno).
 * RLS garante que só retorna entradas das suas próprias solicitações.
 */
export async function getRequestTimeline(requestId: string): Promise<{
  data?: any[];
  error?: string;
}> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('protect_status_history')
    .select('id, new_status, previous_status, changed_at, note')
    .eq('request_id', requestId)
    .order('changed_at', { ascending: true });

  if (error) return { error: error.message };
  return { data: data ?? [] };
}

/**
 * Busca as solicitações recebidas pelo profissional autenticado.
 * NÃO retorna o conteúdo completo do relato na listagem.
 */
export async function getProfessionalProtectRequests(): Promise<{
  data?: any[];
  error?: string;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'Não autenticado' };

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, institution_id')
    .eq('id', user.id)
    .single();

  if (!profile || !['orientador', 'gestor', 'administrador'].includes(profile.role)) {
    return { error: 'Acesso não autorizado.' };
  }

  const { data, error } = await supabase
    .from('protect_requests')
    .select(
      'id, request_kind, status, routing_type, is_urgent, created_at, updated_at, student:profiles!student_id(full_name)',
    )
    .eq('assigned_to', user.id)
    .neq('status', 'archived')
    .order('is_urgent', { ascending: false })
    .order('created_at', { ascending: false });

  if (error) return { error: error.message };
  return { data: data ?? [] };
}

/**
 * Profissional acessa o detalhe de uma solicitação.
 * Registra auditoria de acesso.
 */
export async function getProfessionalRequestDetail(requestId: string): Promise<{
  data?: any;
  error?: string;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'Não autenticado' };

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!profile) return { error: 'Perfil não encontrado.' };

  const { data, error } = await supabase
    .from('protect_requests')
    .select(
      'id, request_kind, entry_type, report_text, involves_guardian, routing_type, is_urgent, status, created_at, updated_at, assigned_at, student:profiles!student_id(full_name)',
    )
    .eq('id', requestId)
    .single();

  if (error || !data) return { error: 'Solicitação não encontrada ou acesso não autorizado.' };

  // Registra que o profissional acessou
  await logProtectAudit({
    requestId,
    actorId: user.id,
    actorRole: profile.role,
    action: 'viewed',
  });

  return { data };
}

/**
 * Atualiza o status de uma solicitação (apenas pelo profissional designado).
 */
export async function updateProtectRequestStatus({
  requestId,
  newStatus,
  note,
}: {
  requestId: string;
  newStatus: ProtectStatus;
  note?: string;
}): Promise<{ success?: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'Não autenticado' };

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!profile) return { error: 'Perfil não encontrado.' };

  // Busca status atual para o histórico
  const { data: current } = await supabase
    .from('protect_requests')
    .select('status')
    .eq('id', requestId)
    .single();

  const updateData: Record<string, unknown> = {
    status: newStatus,
    updated_at: new Date().toISOString(),
  };

  if (newStatus === 'concluded') {
    updateData.concluded_at = new Date().toISOString();
    updateData.concluded_by = user.id;
    if (note) updateData.conclusion_notes = note;
  }

  const { error } = await supabase
    .from('protect_requests')
    .update(updateData)
    .eq('id', requestId);

  if (error) return { error: error.message };

  await logStatusChange({
    requestId,
    actorId: user.id,
    actorRole: profile.role,
    previousStatus: current?.status ?? null,
    newStatus,
    note,
  });

  return { success: true };
}

/**
 * Retorna os orientadores disponíveis na instituição do aluno.
 */
export async function getAvailableOrientadores(): Promise<{
  data?: any[];
  error?: string;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'Não autenticado' };

  const { data: profile } = await supabase
    .from('profiles')
    .select('institution_id')
    .eq('id', user.id)
    .single();

  if (!profile?.institution_id) return { error: 'Instituição não encontrada' };

  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, role')
    .eq('institution_id', profile.institution_id)
    .in('role', ['orientador', 'gestor'])
    .order('full_name');

  if (error) return { error: error.message };
  return { data: data ?? [] };
}

