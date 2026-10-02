'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import TopBar from '../../components/TopBar';
import PageTransition from '../../components/PageTransition';
import RequestWizard from '../../../components/protect/RequestWizard';
import UrgentBanner from '../../../components/protect/UrgentBanner';
import ProtectTimeline from '../../../components/protect/ProtectTimeline';
import { getStudentProtectRequests, getRequestTimeline } from './request/actions';
import {
  PROTECT_STATUS_LABELS,
  PROTECT_KIND_LABELS,
  PROTECT_STATUS_ICONS,
  type ProtectStatus,
  type ProtectRequestKind,
} from '@/lib/protect/types';
import Link from 'next/link';

type MainView = 'hub' | 'request' | 'history' | 'prevention' | 'done';

interface RequestSummary {
  id: string;
  request_kind: ProtectRequestKind;
  status: ProtectStatus;
  routing_type: string;
  is_urgent: boolean;
  created_at: string;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

export default function ProtectPage() {
  const [view, setView] = useState<MainView>('hub');
  const [requests, setRequests] = useState<RequestSummary[]>([]);
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);
  const [timeline, setTimeline] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [completedRequestId, setCompletedRequestId] = useState<string | null>(null);
  const [completedRouting, setCompletedRouting] = useState<string>('normal');

  useEffect(() => {
    if (view === 'history') {
      loadRequests();
    }
  }, [view]);

  const loadRequests = async () => {
    setLoadingHistory(true);
    const result = await getStudentProtectRequests();
    if (result.data) setRequests(result.data);
    setLoadingHistory(false);
  };

  const loadTimeline = async (requestId: string) => {
    setSelectedRequestId(requestId);
    const result = await getRequestTimeline(requestId);
    if (result.data) setTimeline(result.data);
  };

  const handleWizardComplete = (requestId: string, routingType: string) => {
    setCompletedRequestId(requestId);
    setCompletedRouting(routingType);
    setView('done');
  };

  return (
    <>
      <TopBar title="EchoMind Protect" />
      <main className="pt-28 px-8 pb-12 max-w-3xl mx-auto">
        <PageTransition>
          <AnimatePresence mode="wait">

            {/* ── HUB ── */}
            {view === 'hub' && (
              <motion.div
                key="hub"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-8"
              >
                {/* Header */}
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-secondary/10 border border-secondary/20 flex items-center justify-center">
                      <span
                        className="material-symbols-outlined text-secondary text-2xl"
                        style={{ fontVariationSettings: "'FILL' 1" }}
                      >
                        shield_person
                      </span>
                    </div>
                    <div>
                      <h2 className="text-xl font-medium text-on-surface">EchoMind Protect</h2>
                      <p className="text-xs text-secondary uppercase tracking-widest">Caminho seguro para pedir ajuda</p>
                    </div>
                  </div>
                  <p className="text-sm text-on-surface-variant leading-relaxed">
                    Aqui você pode pedir ajuda, conversar com alguém de confiança ou
                    relatar uma situação. Sua privacidade é respeitada.
                  </p>
                </div>

                {/* Ações principais */}
                <div className="grid gap-3">
                  <motion.button
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    onClick={() => setView('request')}
                    className="aetheric-glass rounded-2xl p-6 text-left hover:border-secondary/30 transition-all border border-white/5 group"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-secondary/10 border border-secondary/20 group-hover:border-secondary/40 flex items-center justify-center flex-shrink-0 transition-colors">
                        <span className="material-symbols-outlined text-secondary text-2xl">support_agent</span>
                      </div>
                      <div className="flex-1">
                        <p className="text-base font-medium text-on-surface">Preciso de ajuda</p>
                        <p className="text-sm text-on-surface-variant mt-0.5">
                          Conversar com alguém, relatar uma situação ou simplesmente pedir apoio.
                        </p>
                      </div>
                      <span className="material-symbols-outlined text-on-surface-variant opacity-40 group-hover:opacity-80 transition-opacity">
                        chevron_right
                      </span>
                    </div>
                  </motion.button>

                  <motion.button
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.15 }}
                    onClick={() => setView('history')}
                    className="aetheric-glass rounded-2xl p-5 text-left hover:border-white/15 transition-all border border-white/5 group"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-white/5 border border-white/10 group-hover:border-white/20 flex items-center justify-center flex-shrink-0 transition-colors">
                        <span className="material-symbols-outlined text-on-surface-variant text-lg">history</span>
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-on-surface">Meus pedidos</p>
                        <p className="text-xs text-on-surface-variant">Ver histórico e acompanhar</p>
                      </div>
                      <span className="material-symbols-outlined text-on-surface-variant opacity-40 group-hover:opacity-80 transition-opacity text-base">
                        chevron_right
                      </span>
                    </div>
                  </motion.button>

                  <motion.button
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    onClick={() => setView('prevention')}
                    className="aetheric-glass rounded-2xl p-5 text-left hover:border-white/15 transition-all border border-white/5 group"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-white/5 border border-white/10 group-hover:border-white/20 flex items-center justify-center flex-shrink-0 transition-colors">
                        <span className="material-symbols-outlined text-on-surface-variant text-lg">menu_book</span>
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-on-surface">Prevenção e informação</p>
                        <p className="text-xs text-on-surface-variant">Conteúdo sobre respeito, bullying e como se proteger</p>
                      </div>
                      <span className="material-symbols-outlined text-on-surface-variant opacity-40 group-hover:opacity-80 transition-opacity text-base">
                        chevron_right
                      </span>
                    </div>
                  </motion.button>
                </div>

                {/* Banner de emergência sempre visível */}
                <UrgentBanner />
              </motion.div>
            )}

            {/* ── WIZARD DE PEDIDO ── */}
            {view === 'request' && (
              <motion.div
                key="request"
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -30 }}
                className="aetheric-glass rounded-2xl p-8"
              >
                <div className="flex items-center gap-3 mb-6">
                  <button
                    onClick={() => setView('hub')}
                    className="w-8 h-8 rounded-full border border-white/10 flex items-center justify-center hover:bg-white/5 transition-colors"
                  >
                    <span className="material-symbols-outlined text-sm text-on-surface-variant">arrow_back</span>
                  </button>
                  <h3 className="text-base font-medium text-on-surface">Pedir ajuda</h3>
                </div>
                <RequestWizard
                  onComplete={handleWizardComplete}
                  onCancel={() => setView('hub')}
                />
              </motion.div>
            )}

            {/* ── CONFIRMAÇÃO ── */}
            {view === 'done' && (
              <motion.div
                key="done"
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                className="aetheric-glass rounded-2xl p-8 space-y-6 text-center"
              >
                <div className="flex justify-center">
                  <div className="w-16 h-16 rounded-full bg-secondary/10 border border-secondary/30 flex items-center justify-center">
                    <span
                      className="material-symbols-outlined text-secondary text-3xl"
                      style={{ fontVariationSettings: "'FILL' 1" }}
                    >
                      check_circle
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  <h3 className="text-lg font-medium text-on-surface">Seu pedido foi registrado</h3>
                  {completedRouting === 'special_protection' ? (
                    <p className="text-sm text-on-surface-variant leading-relaxed">
                      Como você informou que a pessoa envolvida é alguém de quem você depende,
                      sua solicitação seguirá um fluxo de proteção específico.
                      Um profissional responsável vai entrar em contato com você.
                    </p>
                  ) : (
                    <p className="text-sm text-on-surface-variant leading-relaxed">
                      O que você relatou pode ser uma situação que merece atenção de um
                      profissional responsável. Alguém vai entrar em contato com você.
                    </p>
                  )}
                  {completedRequestId && (
                    <p className="text-xs text-on-surface-variant/50 mt-3">
                      Protocolo: #{completedRequestId.slice(0, 8).toUpperCase()}
                    </p>
                  )}
                </div>

                <div className="flex gap-3 justify-center">
                  <button
                    onClick={() => { setView('history'); loadRequests(); }}
                    className="px-5 py-2.5 text-xs font-semibold uppercase tracking-wider rounded-full bg-secondary/20 border border-secondary/30 text-secondary hover:bg-secondary/30 transition-colors"
                  >
                    Ver meus pedidos
                  </button>
                  <button
                    onClick={() => setView('hub')}
                    className="px-5 py-2.5 text-xs font-semibold uppercase tracking-wider rounded-full bg-white/5 border border-white/10 text-on-surface-variant hover:bg-white/10 transition-colors"
                  >
                    Voltar ao início
                  </button>
                </div>

                <div className="pt-4 border-t border-white/5">
                  <UrgentBanner />
                </div>
              </motion.div>
            )}

            {/* ── HISTÓRICO ── */}
            {view === 'history' && (
              <motion.div
                key="history"
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -30 }}
                className="space-y-6"
              >
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => {
                      setSelectedRequestId(null);
                      setView('hub');
                    }}
                    className="w-8 h-8 rounded-full border border-white/10 flex items-center justify-center hover:bg-white/5 transition-colors"
                  >
                    <span className="material-symbols-outlined text-sm text-on-surface-variant">arrow_back</span>
                  </button>
                  <h3 className="text-base font-medium text-on-surface">Meus pedidos</h3>
                </div>

                {loadingHistory ? (
                  <div className="text-center py-12 text-sm text-on-surface-variant animate-pulse">Carregando...</div>
                ) : requests.length === 0 ? (
                  <div className="aetheric-glass rounded-2xl p-8 text-center space-y-3">
                    <span className="material-symbols-outlined text-on-surface-variant text-3xl">inbox</span>
                    <p className="text-sm text-on-surface-variant">Nenhum pedido ainda.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {requests.map((req, i) => {
                      const isSelected = selectedRequestId === req.id;
                      return (
                        <motion.div
                          key={req.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.06 }}
                          className="aetheric-glass rounded-2xl overflow-hidden border border-white/5"
                        >
                          <button
                            onClick={() => {
                              if (isSelected) {
                                setSelectedRequestId(null);
                              } else {
                                loadTimeline(req.id);
                              }
                            }}
                            className="w-full p-5 text-left flex items-center gap-4 hover:bg-white/5 transition-colors"
                          >
                            <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                              req.status === 'concluded' ? 'bg-green-400' :
                              req.is_urgent ? 'bg-error animate-pulse' :
                              'bg-secondary'
                            }`} />
                            <div className="flex-1">
                              <p className="text-sm font-medium text-on-surface">
                                {PROTECT_KIND_LABELS[req.request_kind]}
                              </p>
                              <p className="text-xs text-on-surface-variant mt-0.5">
                                {formatDate(req.created_at)} · {PROTECT_STATUS_LABELS[req.status]}
                              </p>
                            </div>
                            {req.routing_type === 'special_protection' && (
                              <span
                                className="text-[10px] uppercase tracking-wider text-secondary bg-secondary/10 px-2 py-1 rounded-full border border-secondary/20"
                              >
                                Proteção especial
                              </span>
                            )}
                            <span className="material-symbols-outlined text-on-surface-variant opacity-40 text-base">
                              {isSelected ? 'expand_less' : 'expand_more'}
                            </span>
                          </button>

                          <AnimatePresence>
                            {isSelected && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="overflow-hidden"
                              >
                                <div className="px-5 pb-5 pt-2 border-t border-white/5">
                                  <p className="text-xs uppercase tracking-widest text-on-surface-variant mb-4">Linha do tempo</p>
                                  <ProtectTimeline entries={timeline} />
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </motion.div>
                      );
                    })}
                  </div>
                )}
              </motion.div>
            )}

            {/* ── PREVENÇÃO ── */}
            {view === 'prevention' && (
              <motion.div
                key="prevention"
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -30 }}
                className="space-y-6"
              >
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setView('hub')}
                    className="w-8 h-8 rounded-full border border-white/10 flex items-center justify-center hover:bg-white/5 transition-colors"
                  >
                    <span className="material-symbols-outlined text-sm text-on-surface-variant">arrow_back</span>
                  </button>
                  <h3 className="text-base font-medium text-on-surface">Prevenção e informação</h3>
                </div>

                <div className="aetheric-glass rounded-2xl p-5 border border-yellow-400/20 bg-yellow-400/5">
                  <div className="flex items-start gap-3">
                    <span className="material-symbols-outlined text-yellow-400 text-lg flex-shrink-0">construction</span>
                    <div>
                      <p className="text-sm font-medium text-yellow-400">Conteúdo em preparação</p>
                      <p className="text-xs text-yellow-400/70 mt-1 leading-relaxed">
                        Os conteúdos educativos estão sendo preparados com base em legislação
                        e fontes oficiais. Em breve estarão disponíveis aqui.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Categorias previstas */}
                <div className="grid gap-3">
                  {[
                    { icon: 'groups', label: 'Bullying', desc: 'O que é, como identificar e o que fazer' },
                    { icon: 'devices', label: 'Cyberbullying', desc: 'Violência no ambiente digital' },
                    { icon: 'security', label: 'Segurança digital', desc: 'Como se proteger online' },
                    { icon: 'support_agent', label: 'Como pedir ajuda', desc: 'Caminhos seguros para buscar apoio' },
                    { icon: 'group', label: 'Ajudar um colega', desc: 'O que fazer quando percebo que alguém precisa de ajuda' },
                    { icon: 'shield', label: 'Canais de proteção', desc: 'Disque 100, CVV, Polícia e outros' },
                  ].map((cat, i) => (
                    <motion.div
                      key={cat.label}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.06 }}
                      className="aetheric-glass rounded-2xl p-4 border border-white/5 flex items-center gap-4 opacity-60"
                    >
                      <div className="w-10 h-10 rounded-full bg-secondary/10 border border-secondary/20 flex items-center justify-center flex-shrink-0">
                        <span className="material-symbols-outlined text-secondary text-lg">{cat.icon}</span>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-on-surface">{cat.label}</p>
                        <p className="text-xs text-on-surface-variant">{cat.desc}</p>
                      </div>
                      <span className="ml-auto text-[10px] uppercase tracking-wider text-on-surface-variant/50">Em breve</span>
                    </motion.div>
                  ))}
                </div>

                <UrgentBanner />
              </motion.div>
            )}

          </AnimatePresence>
        </PageTransition>
      </main>
    </>
  );
}
