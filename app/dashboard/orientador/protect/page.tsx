'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import TopBar from '../../../components/TopBar';
import PageTransition from '../../../components/PageTransition';
import {
  getProfessionalProtectRequests,
  getProfessionalRequestDetail,
  updateProtectRequestStatus,
} from '../protect/request/actions';
import {
  PROTECT_STATUS_LABELS,
  PROTECT_KIND_LABELS,
  PROTECT_STATUS_ICONS,
  type ProtectStatus,
  type ProtectRequestKind,
} from '@/lib/protect/types';

interface RequestItem {
  id: string;
  request_kind: ProtectRequestKind;
  status: ProtectStatus;
  routing_type: string;
  is_urgent: boolean;
  created_at: string;
}

interface RequestDetail {
  id: string;
  request_kind: ProtectRequestKind;
  entry_type: string;
  report_text: string | null;
  involves_guardian: boolean | null;
  routing_type: string;
  is_urgent: boolean;
  status: ProtectStatus;
  created_at: string;
  assigned_at: string | null;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

const STATUS_FLOW: ProtectStatus[] = [
  'under_review',
  'accepted',
  'forwarded',
  'in_follow_up',
  'concluded',
];

export default function OrientadorProtectPage() {
  const [requests, setRequests] = useState<RequestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<RequestDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [statusNote, setStatusNote] = useState('');
  const [confirmStatus, setConfirmStatus] = useState<ProtectStatus | null>(null);

  const loadRequests = useCallback(async () => {
    setLoading(true);
    const result = await getProfessionalProtectRequests();
    if (result.data) setRequests(result.data);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  const handleSelect = async (id: string) => {
    if (selectedId === id) {
      setSelectedId(null);
      setDetail(null);
      return;
    }
    setSelectedId(id);
    setLoadingDetail(true);
    const result = await getProfessionalRequestDetail(id);
    if (result.data) setDetail(result.data);
    setLoadingDetail(false);
    setStatusNote('');
    setConfirmStatus(null);
  };

  const handleStatusUpdate = async () => {
    if (!selectedId || !confirmStatus) return;
    setUpdatingStatus(true);
    await updateProtectRequestStatus({
      requestId: selectedId,
      newStatus: confirmStatus,
      note: statusNote || undefined,
    });
    setConfirmStatus(null);
    setStatusNote('');
    await loadRequests();
    // Recarrega o detalhe
    const result = await getProfessionalRequestDetail(selectedId);
    if (result.data) setDetail(result.data);
    setUpdatingStatus(false);
  };

  const urgentCount = requests.filter((r) => r.is_urgent).length;
  const pendingCount = requests.filter((r) => r.status === 'created' || r.status === 'under_review').length;

  return (
    <>
      <TopBar title="Protect — Painel do Orientador" />
      <main className="pt-28 px-8 pb-12 max-w-4xl mx-auto">
        <PageTransition>
          <div className="space-y-6">

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4">
              {[
                { label: 'Total', value: requests.length, icon: 'list', color: 'text-on-surface' },
                { label: 'Pendentes', value: pendingCount, icon: 'pending', color: 'text-yellow-400' },
                { label: 'Urgentes', value: urgentCount, icon: 'emergency', color: 'text-error' },
              ].map((stat, i) => (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.06 }}
                  className="aetheric-glass rounded-2xl p-5"
                >
                  <div className="flex items-center gap-3">
                    <span className={`material-symbols-outlined ${stat.color}`}>{stat.icon}</span>
                    <div>
                      <p className="text-2xl font-light text-on-surface">{stat.value}</p>
                      <p className="text-xs text-on-surface-variant uppercase tracking-wider">{stat.label}</p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Lista de solicitações */}
            <div className="space-y-3">
              {loading ? (
                <div className="text-center py-12 text-sm text-on-surface-variant animate-pulse">Carregando...</div>
              ) : requests.length === 0 ? (
                <div className="aetheric-glass rounded-2xl p-8 text-center">
                  <span className="material-symbols-outlined text-on-surface-variant text-3xl">check_circle</span>
                  <p className="text-sm text-on-surface-variant mt-2">Nenhuma solicitação recebida.</p>
                </div>
              ) : (
                requests.map((req, i) => (
                  <motion.div
                    key={req.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="aetheric-glass rounded-2xl overflow-hidden border border-white/5"
                  >
                    <button
                      onClick={() => handleSelect(req.id)}
                      className="w-full p-5 text-left flex items-center gap-4 hover:bg-white/5 transition-colors"
                    >
                      {/* Urgência */}
                      <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                        req.is_urgent
                          ? 'bg-error animate-pulse'
                          : req.routing_type === 'special_protection'
                          ? 'bg-secondary'
                          : 'bg-white/30'
                      }`} />

                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-on-surface">
                            {PROTECT_KIND_LABELS[req.request_kind]}
                          </p>
                          {req.is_urgent && (
                            <span className="text-[10px] uppercase tracking-wider text-error bg-error/10 px-2 py-0.5 rounded-full border border-error/20">
                              Urgente
                            </span>
                          )}
                          {req.routing_type === 'special_protection' && (
                            <span className="text-[10px] uppercase tracking-wider text-secondary bg-secondary/10 px-2 py-0.5 rounded-full border border-secondary/20">
                              Proteção especial
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-on-surface-variant mt-0.5">
                          {formatDate(req.created_at)} · {PROTECT_STATUS_LABELS[req.status]}
                        </p>
                      </div>

                      <span className="material-symbols-outlined text-on-surface-variant opacity-40 text-base">
                        {selectedId === req.id ? 'expand_less' : 'expand_more'}
                      </span>
                    </button>

                    {/* Detalhe expandido */}
                    <AnimatePresence>
                      {selectedId === req.id && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="px-5 pb-6 pt-3 border-t border-white/5 space-y-5">
                            {loadingDetail ? (
                              <p className="text-xs text-on-surface-variant animate-pulse">Carregando detalhes...</p>
                            ) : detail ? (
                              <>
                                {/* AVISO de routing especial */}
                                {detail.routing_type === 'special_protection' && (
                                  <div className="rounded-xl p-4 bg-secondary/5 border border-secondary/20 flex items-start gap-3">
                                    <span className="material-symbols-outlined text-secondary text-base flex-shrink-0"
                                      style={{ fontVariationSettings: "'FILL' 1" }}>
                                      shield_person
                                    </span>
                                    <p className="text-xs text-secondary leading-relaxed">
                                      <strong>Fluxo de Proteção Especial.</strong>{' '}
                                      O estudante indicou que a pessoa envolvida pode ser familiar,
                                      responsável ou cuidador. Avaliação humana é obrigatória.
                                      Não encaminhar automaticamente ao responsável cadastrado.
                                    </p>
                                  </div>
                                )}

                                {/* Relato */}
                                {detail.report_text && (
                                  <div className="space-y-2">
                                    <p className="text-xs uppercase tracking-widest text-on-surface-variant">Relato</p>
                                    <div className="bg-background/50 rounded-xl p-4 border border-white/5">
                                      <p className="text-sm text-on-surface leading-relaxed">{detail.report_text}</p>
                                    </div>
                                    <p className="text-[10px] text-on-surface-variant/50 italic">
                                      ⚠ Relato ≠ prova. Análise humana é necessária antes de qualquer encaminhamento.
                                    </p>
                                  </div>
                                )}

                                {!detail.report_text && (
                                  <div className="rounded-xl p-4 bg-white/5 border border-white/5">
                                    <p className="text-xs text-on-surface-variant">
                                      O estudante não forneceu relato em texto.
                                      {detail.entry_type === 'libras' && ' Comunicação realizada por Libras.'}
                                    </p>
                                  </div>
                                )}

                                {/* Ações de status */}
                                <div className="space-y-3">
                                  <p className="text-xs uppercase tracking-widest text-on-surface-variant">Atualizar status</p>
                                  <div className="flex flex-wrap gap-2">
                                    {STATUS_FLOW.filter((s) => s !== detail.status).map((s) => (
                                      <button
                                        key={s}
                                        onClick={() => setConfirmStatus(s)}
                                        className={`px-3 py-1.5 text-xs font-medium rounded-full border transition-colors ${
                                          s === 'concluded'
                                            ? 'border-green-500/30 text-green-400 hover:bg-green-500/10'
                                            : 'border-white/10 text-on-surface-variant hover:border-secondary/30 hover:text-secondary'
                                        }`}
                                      >
                                        <span className="material-symbols-outlined text-xs mr-1" style={{ fontVariationSettings: "'FILL' 1" }}>
                                          {PROTECT_STATUS_ICONS[s]}
                                        </span>
                                        {PROTECT_STATUS_LABELS[s]}
                                      </button>
                                    ))}
                                  </div>

                                  {/* Confirmação de mudança de status */}
                                  {confirmStatus && (
                                    <motion.div
                                      initial={{ opacity: 0, y: 8 }}
                                      animate={{ opacity: 1, y: 0 }}
                                      className="space-y-3"
                                    >
                                      <textarea
                                        value={statusNote}
                                        onChange={(e) => setStatusNote(e.target.value)}
                                        placeholder={`Nota sobre a mudança para "${PROTECT_STATUS_LABELS[confirmStatus]}" (opcional)`}
                                        rows={3}
                                        className="w-full bg-background/50 border border-white/10 rounded-xl py-3 px-4 text-sm text-on-surface outline-none focus:border-secondary/50 transition-colors placeholder-on-surface-variant/40 resize-none"
                                      />
                                      <div className="flex gap-3">
                                        <button
                                          onClick={() => setConfirmStatus(null)}
                                          className="px-4 py-2 text-xs rounded-full bg-white/5 border border-white/10 text-on-surface-variant hover:bg-white/10 transition-colors"
                                        >
                                          Cancelar
                                        </button>
                                        <button
                                          onClick={handleStatusUpdate}
                                          disabled={updatingStatus}
                                          className={`px-4 py-2 text-xs font-semibold rounded-full border transition-colors ${
                                            confirmStatus === 'concluded'
                                              ? 'bg-green-500/20 border-green-500/30 text-green-400 hover:bg-green-500/30'
                                              : 'bg-secondary/20 border-secondary/30 text-secondary hover:bg-secondary/30'
                                          } disabled:opacity-50`}
                                        >
                                          {updatingStatus ? 'Salvando...' : `Confirmar: ${PROTECT_STATUS_LABELS[confirmStatus]}`}
                                        </button>
                                      </div>
                                    </motion.div>
                                  )}
                                </div>
                              </>
                            ) : null}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                ))
              )}
            </div>

          </div>
        </PageTransition>
      </main>
    </>
  );
}
