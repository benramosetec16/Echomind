-- ============================================================
-- Migration: EchoMind Protect Module
-- Arquivo: supabase/migrations/20260924_protect_module.sql
-- ISOLADO: não altera nenhuma tabela existente
-- Todas as tabelas usam prefixo protect_ para evitar conflitos
-- ============================================================

-- ============================================================
-- 1. PROTECT_REQUESTS — Solicitações de Ajuda
-- ============================================================
CREATE TABLE IF NOT EXISTS public.protect_requests (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,

  -- Quem solicitou (NUNCA deletar em cascata — preservar histórico)
  student_id uuid REFERENCES public.profiles(id) ON DELETE RESTRICT NOT NULL,
  institution_id uuid REFERENCES public.institutions(id) ON DELETE RESTRICT NOT NULL,

  -- Tipo de entrada do relato
  entry_type text NOT NULL DEFAULT 'text'
    CHECK (entry_type IN ('text', 'libras', 'text_and_libras')),

  -- Como o aluno escolheu iniciar (discreto — sem exigir definição jurídica)
  request_kind text NOT NULL DEFAULT 'generic'
    CHECK (request_kind IN (
      'want_to_talk',
      'report_situation',
      'worried_about_someone',
      'dont_know',
      'generic'
    )),

  -- Relato em texto (pode vir de digitação direta ou conversão Libras→texto)
  -- NUNCA expor este campo para o responsável legal cadastrado
  report_text text,

  -- Pergunta de segurança: a pessoa envolvida é responsável/cuidador/familiar?
  -- NULL = não respondida (tratada como possível conflito → proteção especial)
  -- true = sim (responsável envolvido)
  -- false = não
  involves_guardian boolean DEFAULT NULL,

  -- Routing calculado pelo sistema (NUNCA pelo aluno diretamente)
  routing_type text NOT NULL DEFAULT 'pending'
    CHECK (routing_type IN ('pending', 'normal', 'special_protection')),

  -- Urgência
  is_urgent boolean NOT NULL DEFAULT false,

  -- Status do ciclo de vida completo
  status text NOT NULL DEFAULT 'created'
    CHECK (status IN (
      'created',
      'under_review',
      'accepted',
      'forwarded',
      'in_follow_up',
      'concluded',
      'archived'
    )),

  -- Profissional designado (determinado pelo Protected Routing, nunca pelo aluno)
  -- JAMAIS deve ser o guardian cadastrado em profiles
  assigned_to uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  assigned_at timestamptz,

  -- Conclusão
  concluded_at timestamptz,
  concluded_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  conclusion_notes text, -- visível apenas para profissionais autorizados

  -- LGPD: campos de controle de retenção
  data_minimization_applied boolean NOT NULL DEFAULT false,
  retention_until date, -- data até quando os dados devem ser mantidos

  created_at timestamptz DEFAULT timezone('utc', now()) NOT NULL,
  updated_at timestamptz DEFAULT timezone('utc', now()) NOT NULL
);

ALTER TABLE public.protect_requests ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 2. PROTECT_AUDIT_LOG — Auditoria de cada acesso e ação
-- ============================================================
CREATE TABLE IF NOT EXISTS public.protect_audit_log (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  request_id uuid REFERENCES public.protect_requests(id) ON DELETE RESTRICT NOT NULL,

  -- Quem realizou a ação (snapshot do papel no momento)
  actor_id uuid REFERENCES public.profiles(id) ON DELETE RESTRICT NOT NULL,
  actor_role text NOT NULL,

  -- O que aconteceu
  action text NOT NULL CHECK (action IN (
    'created',
    'viewed',
    'routing_determined',
    'status_changed',
    'assigned',
    'note_added',
    'forwarded',
    'concluded',
    'archived',
    'ai_summary_generated'
  )),

  -- Detalhes adicionais — NUNCA armazenar dado pessoal sensível do aluno aqui
  details jsonb,

  -- Hash do IP (não o IP bruto — LGPD)
  ip_hash text,

  created_at timestamptz DEFAULT timezone('utc', now()) NOT NULL
);

ALTER TABLE public.protect_audit_log ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 3. PROTECT_AUTHORIZED_ROLES — Configuração Institucional
-- Quem pode receber qual tipo de solicitação
-- ============================================================
CREATE TABLE IF NOT EXISTS public.protect_authorized_roles (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  institution_id uuid REFERENCES public.institutions(id) ON DELETE CASCADE NOT NULL,

  -- Papel autorizado a receber solicitações Protect
  role text NOT NULL CHECK (role IN ('orientador', 'gestor', 'administrador')),

  -- Tipo de routing que este papel pode atender
  routing_type text NOT NULL CHECK (routing_type IN ('normal', 'special_protection', 'both')),

  -- Prioridade de designação (1 = primeira escolha)
  priority integer NOT NULL DEFAULT 1,

  -- Ativo?
  is_active boolean NOT NULL DEFAULT true,

  created_at timestamptz DEFAULT timezone('utc', now()) NOT NULL,
  UNIQUE (institution_id, role, routing_type)
);

ALTER TABLE public.protect_authorized_roles ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 4. PROTECT_STATUS_HISTORY — Linha do Tempo Protegida
-- ============================================================
CREATE TABLE IF NOT EXISTS public.protect_status_history (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  request_id uuid REFERENCES public.protect_requests(id) ON DELETE CASCADE NOT NULL,

  previous_status text,
  new_status text NOT NULL,

  changed_by uuid REFERENCES public.profiles(id) ON DELETE RESTRICT NOT NULL,
  changed_at timestamptz DEFAULT timezone('utc', now()) NOT NULL,

  -- Nota do profissional (visível apenas para autorizados)
  note text
);

ALTER TABLE public.protect_status_history ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 5. PROTECT_PREVENTION_CONTENT — Conteúdo Educativo de Prevenção
-- ============================================================
CREATE TABLE IF NOT EXISTS public.protect_prevention_content (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,

  category text NOT NULL CHECK (category IN (
    'bullying',
    'cyberbullying',
    'violence',
    'harassment',
    'digital_safety',
    'respect',
    'limits',
    'how_to_ask_help',
    'how_to_help_friend',
    'warning_signs',
    'protection_channels'
  )),

  title text NOT NULL,
  summary text NOT NULL,
  content_md text,
  source_url text,
  source_name text,
  legal_reference text,

  -- Faixa etária recomendada
  age_min integer,
  age_max integer,

  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT timezone('utc', now()) NOT NULL,
  updated_at timestamptz DEFAULT timezone('utc', now()) NOT NULL
);

ALTER TABLE public.protect_prevention_content ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 6. RLS POLICIES — protect_requests
-- REGRA CRÍTICA: guardian cadastrado NUNCA recebe acesso
-- ============================================================

-- Aluno vê apenas suas próprias solicitações
CREATE POLICY "protect_requests: student views own"
  ON public.protect_requests FOR SELECT
  USING (auth.uid() = student_id);

-- Aluno cria solicitações para si mesmo
CREATE POLICY "protect_requests: student creates own"
  ON public.protect_requests FOR INSERT
  WITH CHECK (auth.uid() = student_id);

-- Profissional designado ou autorizado da instituição pode ver
CREATE POLICY "protect_requests: authorized professional views"
  ON public.protect_requests FOR SELECT
  USING (
    auth.uid() = assigned_to
    OR EXISTS (
      SELECT 1
      FROM public.protect_authorized_roles par
      JOIN public.profiles viewer ON viewer.id = auth.uid()
      WHERE par.institution_id = protect_requests.institution_id
        AND par.role = viewer.role
        AND par.is_active = true
        AND viewer.institution_id = protect_requests.institution_id
    )
  );

-- Apenas profissional designado ou gestor/admin da instituição pode atualizar
CREATE POLICY "protect_requests: authorized professional updates"
  ON public.protect_requests FOR UPDATE
  USING (
    auth.uid() = assigned_to
    OR EXISTS (
      SELECT 1 FROM public.profiles updater
      WHERE updater.id = auth.uid()
        AND updater.role IN ('administrador', 'gestor')
        AND updater.institution_id = protect_requests.institution_id
    )
  )
  WITH CHECK (
    auth.uid() = assigned_to
    OR EXISTS (
      SELECT 1 FROM public.profiles updater
      WHERE updater.id = auth.uid()
        AND updater.role IN ('administrador', 'gestor')
        AND updater.institution_id = protect_requests.institution_id
    )
  );

-- DELEÇÃO: nenhuma policy = nenhum acesso via client
-- (apenas service role para gestão de retenção LGPD)

-- ============================================================
-- 7. RLS POLICIES — protect_audit_log
-- Apenas administradores da plataforma podem ler
-- Inserção apenas via service role (trigger automático)
-- ============================================================
CREATE POLICY "protect_audit_log: only platform admins read"
  ON public.protect_audit_log FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles viewer
      WHERE viewer.id = auth.uid()
        AND viewer.role = 'administrador'
    )
  );

-- ============================================================
-- 8. RLS POLICIES — protect_authorized_roles
-- ============================================================
CREATE POLICY "protect_authorized_roles: gestores view own institution"
  ON public.protect_authorized_roles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles viewer
      WHERE viewer.id = auth.uid()
        AND viewer.institution_id = protect_authorized_roles.institution_id
        AND viewer.role IN ('administrador', 'gestor')
    )
  );

CREATE POLICY "protect_authorized_roles: gestores manage own institution"
  ON public.protect_authorized_roles FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles viewer
      WHERE viewer.id = auth.uid()
        AND viewer.institution_id = protect_authorized_roles.institution_id
        AND viewer.role IN ('administrador', 'gestor')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles viewer
      WHERE viewer.id = auth.uid()
        AND viewer.institution_id = protect_authorized_roles.institution_id
        AND viewer.role IN ('administrador', 'gestor')
    )
  );

-- ============================================================
-- 9. RLS POLICIES — protect_status_history
-- ============================================================

-- Aluno vê apenas a timeline das suas próprias solicitações
CREATE POLICY "protect_status_history: student views own"
  ON public.protect_status_history FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.protect_requests pr
      WHERE pr.id = protect_status_history.request_id
        AND pr.student_id = auth.uid()
    )
  );

-- Profissional designado vê a timeline das solicitações atribuídas
CREATE POLICY "protect_status_history: assigned professional views"
  ON public.protect_status_history FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.protect_requests pr
      WHERE pr.id = protect_status_history.request_id
        AND pr.assigned_to = auth.uid()
    )
  );

-- Profissional designado insere entradas de histórico
CREATE POLICY "protect_status_history: assigned professional inserts"
  ON public.protect_status_history FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.protect_requests pr
      WHERE pr.id = protect_status_history.request_id
        AND pr.assigned_to = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.profiles actor
      WHERE actor.id = auth.uid()
        AND actor.role IN ('administrador', 'gestor', 'orientador')
    )
  );

-- ============================================================
-- 10. RLS POLICIES — protect_prevention_content
-- ============================================================

-- Qualquer usuário autenticado pode ler conteúdo ativo de prevenção
CREATE POLICY "protect_prevention_content: authenticated users read active"
  ON public.protect_prevention_content FOR SELECT
  USING (is_active = true);

-- Apenas administradores gerenciam o conteúdo
CREATE POLICY "protect_prevention_content: admins manage all"
  ON public.protect_prevention_content FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles viewer
      WHERE viewer.id = auth.uid()
        AND viewer.role = 'administrador'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles viewer
      WHERE viewer.id = auth.uid()
        AND viewer.role = 'administrador'
    )
  );

-- ============================================================
-- 11. TRIGGER: updated_at automático para protect_requests
-- ============================================================
CREATE TRIGGER set_protect_requests_updated_at
  BEFORE UPDATE ON public.protect_requests
  FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

CREATE TRIGGER set_protect_prevention_content_updated_at
  BEFORE UPDATE ON public.protect_prevention_content
  FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

-- ============================================================
-- 12. ÍNDICES para performance
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_protect_requests_student_id
  ON public.protect_requests(student_id);

CREATE INDEX IF NOT EXISTS idx_protect_requests_institution_id
  ON public.protect_requests(institution_id);

CREATE INDEX IF NOT EXISTS idx_protect_requests_assigned_to
  ON public.protect_requests(assigned_to);

CREATE INDEX IF NOT EXISTS idx_protect_requests_status
  ON public.protect_requests(status);

CREATE INDEX IF NOT EXISTS idx_protect_audit_log_request_id
  ON public.protect_audit_log(request_id);

CREATE INDEX IF NOT EXISTS idx_protect_status_history_request_id
  ON public.protect_status_history(request_id);

-- ============================================================
-- 13. SEED DE CONTEÚDO DE PREVENÇÃO (dados fictícios para teste)
-- Todos os conteúdos abaixo são exemplos de desenvolvimento.
-- NÃO usar relatos reais de estudantes neste arquivo.
-- Antes de ir para produção: validar com fontes oficiais (ECA,
-- Lei 13.431/2017, Lei 13.185/2015, Lei 14.811/2024, LGPD).
-- ============================================================
INSERT INTO public.protect_prevention_content
  (category, title, summary, source_name, legal_reference, is_active)
VALUES
  (
    'bullying',
    'O que é bullying?',
    'Bullying é um conjunto de comportamentos agressivos, repetitivos e intencionais que causam sofrimento. Pode acontecer pessoalmente ou de forma online. Ninguém merece passar por isso.',
    '[Conteúdo de desenvolvimento — revisar antes de publicar]',
    'Lei 13.185/2015 — Programa de Combate à Intimidação Sistemática',
    false -- desativado até validação jurídica
  ),
  (
    'cyberbullying',
    'Cyberbullying: quando o bullying acontece online',
    'O cyberbullying ocorre por meio de dispositivos digitais — redes sociais, mensagens, jogos. Inclui compartilhamento de conteúdo humilhante, ameaças e exclusão social online.',
    '[Conteúdo de desenvolvimento — revisar antes de publicar]',
    'Lei 14.811/2024 — Combate ao Bullying e Cyberbullying Escolar',
    false
  ),
  (
    'how_to_ask_help',
    'Como pedir ajuda',
    'Pedir ajuda é um ato de coragem. Você pode começar conversando com um adulto de confiança, um orientador escolar ou utilizando este canal. Você não precisa enfrentar isso sozinho.',
    '[Conteúdo de desenvolvimento — revisar antes de publicar]',
    NULL,
    false
  ),
  (
    'how_to_help_friend',
    'Como ajudar um colega',
    'Se você perceber que um colega está passando por uma situação difícil, escute com atenção, mostre que se importa e incentive-o a buscar ajuda de um adulto de confiança.',
    '[Conteúdo de desenvolvimento — revisar antes de publicar]',
    NULL,
    false
  ),
  (
    'protection_channels',
    'Canais de proteção',
    'Disque 100 (Direitos Humanos), CVV 188 (apoio emocional 24h), Polícia 190 e SAMU 192 são canais oficiais disponíveis para situações de emergência.',
    'CVV / Disque 100 / SEMU',
    NULL,
    false
  ),
  (
    'digital_safety',
    'Segurança digital',
    'Proteja suas senhas, não compartilhe informações pessoais com desconhecidos e saiba como denunciar conteúdo abusivo nas plataformas digitais.',
    '[Conteúdo de desenvolvimento — revisar antes de publicar]',
    'Lei 14.819/2024 — Proteção no Ambiente Digital',
    false
  ),
  (
    'warning_signs',
    'Sinais de atenção',
    'Mudanças repentinas de comportamento, isolamento, queda no rendimento escolar ou sinais físicos podem indicar que alguém precisa de atenção e cuidado.',
    '[Conteúdo de desenvolvimento — revisar antes de publicar]',
    NULL,
    false
  )
ON CONFLICT DO NOTHING;

-- ============================================================
-- FIM DA MIGRATION
-- Verificar ANTES de aplicar em produção:
-- 1. Nenhuma tabela existente foi alterada
-- 2. Todas as RLS policies estão ativas
-- 3. O trigger handle_updated_at() existe (criado em schema.sql)
-- 4. Testar Cenário E: aluno com responsável envolvido
--    → routing_type DEVE ser 'special_protection'
--    → guardian_name/guardian_phone de profiles NUNCA deve ser acessado
-- 5. Conteúdo de prevenção (is_active=false) só deve ser publicado
--    após validação jurídica e institucional
-- ============================================================
