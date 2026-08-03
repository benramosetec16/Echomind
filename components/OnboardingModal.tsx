'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { createClient } from '../utils/supabase/client';

interface Institution {
  id: string;
  name: string;
}

interface Classroom {
  id: string;
  name: string;
  code?: string;
  institution_id: string;
}

export default function OnboardingModal({
  userId,
  userRole,
  onComplete,
}: {
  userId: string;
  userRole: string;
  onComplete: () => void;
}) {
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [selectedInstitution, setSelectedInstitution] = useState<string>('');
  const [selectedClassroom, setSelectedClassroom] = useState<string>('');
  const [code, setCode] = useState<string>('');
  const [guardianName, setGuardianName] = useState<string>('');
  const [guardianPhone, setGuardianPhone] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const supabase = createClient();

  useEffect(() => {
    async function loadData() {
      const { data: instData } = await supabase.from('institutions').select('id, name');
      if (instData) setInstitutions(instData);

      const { data: classData } = await supabase.from('classrooms').select('id, name, code, institution_id');
      if (classData) setClassrooms(classData);
    }
    loadData();
  }, [supabase]);

  // Filter classrooms based on selected institution
  const availableClassrooms = classrooms.filter(
    (c) => !selectedInstitution || c.institution_id === selectedInstitution
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    let targetInstId = selectedInstitution;
    let targetClassId = selectedClassroom;

    // Validate institutional code if provided
    if (code.trim()) {
      const cleanCode = code.trim();
      const { data: codeData, error: codeErr } = await supabase
        .from('institutional_codes')
        .select('*')
        .eq('code', cleanCode)
        .eq('status', 'ativo')
        .maybeSingle();

      if (codeErr || !codeData) {
        // Also check if code is classroom code directly
        const { data: roomByCode } = await supabase
          .from('classrooms')
          .select('*')
          .eq('code', cleanCode)
          .maybeSingle();

        if (roomByCode) {
          targetInstId = roomByCode.institution_id;
          targetClassId = roomByCode.id;
        } else if (!targetInstId && !targetClassId) {
          setErrorMsg('Código institucional inválido ou revogado.');
          setLoading(false);
          return;
        }
      } else {
        targetInstId = codeData.institution_id;
        if (codeData.classroom_id) {
          targetClassId = codeData.classroom_id;
        }
      }
    }

    // Update user profile without altering role, password, email or ID
    const updateData: Record<string, any> = {
      onboarding_completed: true,
    };

    if (targetInstId) updateData.institution_id = targetInstId;
    if (targetClassId) updateData.classroom_id = targetClassId;
    if (guardianName.trim()) updateData.guardian_name = guardianName.trim();
    if (guardianPhone.trim()) updateData.guardian_phone = guardianPhone.trim();

    const { error: updateError } = await supabase
      .from('profiles')
      .update(updateData)
      .eq('id', userId);

    if (updateError) {
      setErrorMsg('Erro ao salvar dados de vincular instituição. Tente novamente.');
      setLoading(false);
      return;
    }

    setLoading(false);
    onComplete();
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="aetheric-glass rounded-[32px] p-8 max-w-lg w-full border border-secondary/30 bg-surface/90 shadow-2xl relative"
        >
          <div className="flex items-center gap-3 mb-4">
            <span className="material-symbols-outlined text-secondary text-2xl">verified_user</span>
            <span className="text-xs font-semibold text-secondary uppercase tracking-[0.2em]">
              Atualização Institucional
            </span>
          </div>

          <h2 className="text-2xl font-light text-on-surface mb-2">Conectar a uma Instituição</h2>
          <p className="text-xs text-on-surface-variant mb-6">
            Para continuar acessando todos os recursos do EchoMind, vincule sua conta à sua escola ou informe o código fornecido pelo orientador/gestor.
          </p>

          {errorMsg && (
            <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-300 flex items-center gap-2">
              <span className="material-symbols-outlined text-base">error</span>
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs uppercase tracking-wider text-on-surface-variant mb-1">
                Código da Sala ou Institucional (Opcional)
              </label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="Ex: PROF001 ou TURMA-A"
                className="w-full bg-background/60 border border-white/10 rounded-2xl p-3 text-sm text-on-surface focus:border-secondary outline-none transition-colors"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs uppercase tracking-wider text-on-surface-variant mb-1">
                  Instituição
                </label>
                <select
                  value={selectedInstitution}
                  onChange={(e) => setSelectedInstitution(e.target.value)}
                  className="w-full bg-background/60 border border-white/10 rounded-2xl p-3 text-sm text-on-surface focus:border-secondary outline-none transition-colors"
                >
                  <option value="">Selecione a Instituição...</option>
                  {institutions.map((inst) => (
                    <option key={inst.id} value={inst.id} className="bg-surface text-on-surface">
                      {inst.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs uppercase tracking-wider text-on-surface-variant mb-1">
                  Sala / Turma
                </label>
                <select
                  value={selectedClassroom}
                  onChange={(e) => setSelectedClassroom(e.target.value)}
                  className="w-full bg-background/60 border border-white/10 rounded-2xl p-3 text-sm text-on-surface focus:border-secondary outline-none transition-colors"
                >
                  <option value="">Selecione a Sala...</option>
                  {availableClassrooms.map((cls) => (
                    <option key={cls.id} value={cls.id} className="bg-surface text-on-surface">
                      {cls.name} {cls.code ? `(${cls.code})` : ''}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {userRole === 'aluno' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-white/5">
                <div>
                  <label className="block text-xs uppercase tracking-wider text-on-surface-variant mb-1">
                    Nome do Responsável
                  </label>
                  <input
                    type="text"
                    value={guardianName}
                    onChange={(e) => setGuardianName(e.target.value)}
                    placeholder="Nome completo"
                    className="w-full bg-background/60 border border-white/10 rounded-2xl p-3 text-sm text-on-surface focus:border-secondary outline-none transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs uppercase tracking-wider text-on-surface-variant mb-1">
                    Telefone do Responsável
                  </label>
                  <input
                    type="text"
                    value={guardianPhone}
                    onChange={(e) => setGuardianPhone(e.target.value)}
                    placeholder="(00) 00000-0000"
                    className="w-full bg-background/60 border border-white/10 rounded-2xl p-3 text-sm text-on-surface focus:border-secondary outline-none transition-colors"
                  />
                </div>
              </div>
            )}

            <div className="pt-4 flex justify-end gap-3">
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-6 rounded-2xl bg-secondary text-background font-semibold hover:bg-secondary-bright transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? 'Salvando...' : 'Salvar e Continuar'}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
