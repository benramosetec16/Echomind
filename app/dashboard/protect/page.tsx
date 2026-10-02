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

function TopicCard({ topic, idx }: { topic: { icon: string; label: string; color: string; bg: string; border: string; content: { subtitle: string; text: string }[] }; idx: number }) {
  const [open, setOpen] = useState(false);
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: idx * 0.06 }}
      className={`aetheric-glass rounded-[32px] overflow-hidden border ${topic.border}`}
    >
      <button
        onClick={() => setOpen(p => !p)}
        className="w-full p-5 text-left flex items-center gap-4 hover:bg-white/5 transition-colors"
      >
        <div className={`w-10 h-10 rounded-full ${topic.bg} border ${topic.border} flex items-center justify-center flex-shrink-0`}>
          <span className={`material-symbols-outlined ${topic.color} text-lg`}>{topic.icon}</span>
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium text-on-surface">{topic.label}</p>
          <p className="text-xs text-on-surface-variant">{topic.content.length} seções</p>
        </div>
        <span className={`material-symbols-outlined text-on-surface-variant opacity-40 text-base transition-transform ${open ? 'rotate-180' : ''}`}>expand_more</span>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-6 pt-1 border-t border-white/5 space-y-5">
              {topic.content.map((item) => (
                <div key={item.subtitle}>
                  <p className={`text-xs font-semibold ${topic.color} mb-1`}>{item.subtitle}</p>
                  <p className="text-sm text-on-surface-variant leading-relaxed">{item.text}</p>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
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
      <main className="pt-20 md:pt-28 px-4 md:px-8 pb-12 max-w-3xl mx-auto">
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
                    className="aetheric-glass rounded-[32px] p-6 text-left hover:border-secondary/30 transition-all border border-white/5 group"
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
                    className="aetheric-glass rounded-[32px] p-5 text-left hover:border-white/15 transition-all border border-white/5 group"
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
                    className="aetheric-glass rounded-[32px] p-5 text-left hover:border-white/15 transition-all border border-white/5 group"
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
                className="aetheric-glass rounded-[32px] p-8"
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
                className="aetheric-glass rounded-[32px] p-8 space-y-6 text-center"
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
                  <div className="aetheric-glass rounded-[32px] p-8 text-center space-y-3">
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
                          className="aetheric-glass rounded-[32px] overflow-hidden border border-white/5"
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

                {/* Tópicos educativos reais */}
                {[
                  {
                    icon: 'groups',
                    label: 'Bullying',
                    color: 'text-red-400',
                    bg: 'bg-red-400/10',
                    border: 'border-red-400/20',
                    content: [
                      {
                        subtitle: 'O que é bullying?',
                        text: 'Bullying é quando alguém repete comportamentos agressivos, humilhantes ou excludentes contra outra pessoa que tem dificuldade de se defender. Pode ser físico (empurrões, agressões), verbal (apelidos, insultos), social (exclusão, fofocas) ou psicológico (ameaças, intimidação).',
                      },
                      {
                        subtitle: 'Como identificar',
                        text: 'Sinais de que alguém pode estar sofrendo bullying: evita ir à escola, muda de comportamento, tem objetos danificados ou desaparece com dinheiro, apresenta tristeza ou ansiedade sem explicação, tem dificuldade para dormir, perde amigos repentinamente.',
                      },
                      {
                        subtitle: 'O que fazer',
                        text: 'Não fique em silêncio. Converse com um adulto de confiança na escola: orientador, professor ou direção. Se você testemunhou, também pode relatar. Bullying é crime no Brasil (Lei 13.185/2015). Guarde evidências como mensagens ou fotos se for cyberbullying.',
                      },
                      {
                        subtitle: '⚖️ Lei brasileira',
                        text: 'A Lei 13.185/2015 (Programa de Combate à Intimidação Sistemática) obriga escolas a implementarem medidas contra bullying. A vítima ou responsável pode registrar boletim de ocorrência.',
                      },
                    ],
                  },
                  {
                    icon: 'devices',
                    label: 'Cyberbullying',
                    color: 'text-orange-400',
                    bg: 'bg-orange-400/10',
                    border: 'border-orange-400/20',
                    content: [
                      {
                        subtitle: 'O que é?',
                        text: 'Cyberbullying é o bullying praticado por meios digitais: redes sociais, aplicativos de mensagem, jogos online. Inclui compartilhar fotos ou vídeos humilhantes, criar perfis falsos para difamar, ameaçar, ou excluir alguém sistematicamente de grupos.',
                      },
                      {
                        subtitle: 'Por que é grave?',
                        text: 'O cyberbullying é especialmente prejudicial porque a agressão pode se espalhar rapidamente para muitas pessoas, acontece 24h por dia inclusive dentro de casa, e a vítima pode sentir que não existe lugar seguro.',
                      },
                      {
                        subtitle: 'O que fazer',
                        text: 'Não responda às mensagens ofensivas. Bloqueie o agressor. Faça capturas de tela das evidências ANTES de bloquear. Reporte o conteúdo à plataforma. Conte para um adulto de confiança. Em casos graves, registre boletim de ocorrência (pode ser feito online).',
                      },
                      {
                        subtitle: '⚖️ É crime',
                        text: 'Dependendo da ação, o cyberbullying pode ser crime: calúnia, difamação, injúria (Código Penal), ameaça, ou crimes contra a honra. O Marco Civil da Internet (Lei 12.965/2014) protege as vítimas e responsabiliza plataformas.',
                      },
                    ],
                  },
                  {
                    icon: 'security',
                    label: 'Segurança digital',
                    color: 'text-blue-400',
                    bg: 'bg-blue-400/10',
                    border: 'border-blue-400/20',
                    content: [
                      {
                        subtitle: 'Proteja sua privacidade',
                        text: 'Não compartilhe senhas com ninguém, nem com amigos próximos. Use senhas diferentes para cada conta. Ative a verificação em duas etapas. Revise as configurações de privacidade das suas redes sociais — quem pode ver seus posts, localização e lista de amigos.',
                      },
                      {
                        subtitle: 'Cuidado com o que você compartilha',
                        text: 'Uma vez que uma foto ou informação é enviada, você perde o controle sobre ela. Não envie imagens íntimas para ninguém. Tenha cuidado com pessoas desconhecidas online — nem sempre são quem dizem ser.',
                      },
                      {
                        subtitle: 'Golpes e manipulação',
                        text: 'Desconfie de propostas muito boas (prêmios, empregos fáceis). Não clique em links desconhecidos. Adultos que buscam relações muito próximas com jovens online podem ser uma ameaça (grooming) — conte para um adulto de confiança.',
                      },
                      {
                        subtitle: '📱 Exposição não consensual',
                        text: 'Compartilhar imagens íntimas de alguém sem autorização é crime (Lei 13.718/2018), com pena de 1 a 5 anos de prisão. Se isso aconteceu com você, procure a delegacia mais próxima ou a Safernet Brasil.',
                      },
                    ],
                  },
                  {
                    icon: 'support_agent',
                    label: 'Como pedir ajuda',
                    color: 'text-secondary',
                    bg: 'bg-secondary/10',
                    border: 'border-secondary/20',
                    content: [
                      {
                        subtitle: 'Você não precisa enfrentar sozinho',
                        text: 'Pedir ajuda é um ato de coragem, não de fraqueza. Se você está passando por algo difícil, fale com alguém de confiança: um amigo, familiar, professor, orientador ou psicólogo escolar.',
                      },
                      {
                        subtitle: 'Na escola',
                        text: 'O orientador educacional é um profissional treinado para ajudar em situações de conflito, sofrimento emocional ou violência. O que você contar é tratado com responsabilidade e cuidado. Use o EchoMind Protect para registrar seu pedido de forma segura.',
                      },
                      {
                        subtitle: 'Canais de emergência',
                        text: 'CVV (Centro de Valorização da Vida): ligue 188 ou acesse cvv.org.br — disponível 24h, gratuito. Disque 100 (Direitos Humanos): para situações de violação de direitos, inclusive violência doméstica. Disque 180 (Central da Mulher): para violência contra mulheres.',
                      },
                      {
                        subtitle: 'Se for urgente',
                        text: 'Em situação de risco imediato, ligue 190 (Polícia) ou 192 (SAMU). Não espere. Sua segurança vem primeiro.',
                      },
                    ],
                  },
                  {
                    icon: 'group',
                    label: 'Ajudar um colega',
                    color: 'text-green-400',
                    bg: 'bg-green-400/10',
                    border: 'border-green-400/20',
                    content: [
                      {
                        subtitle: 'Reconhecer que alguém precisa de ajuda',
                        text: 'Sinais de que um colega pode estar sofrendo: isolamento, tristeza persistente, mudança repentina de comportamento, marcas físicas inexplicáveis, medo de ir a certos lugares, perda de interesse em atividades que gostava.',
                      },
                      {
                        subtitle: 'O que você pode fazer',
                        text: 'Aproxime-se com empatia, sem pressionar. Pergunte como a pessoa está. Ouça sem julgamento. Não prometa segredo se a situação envolver risco — nesses casos, contar para um adulto não é traição, é cuidado. Ofereça companhia.',
                      },
                      {
                        subtitle: 'Como reportar',
                        text: 'Você pode usar o EchoMind Protect com a opção "Estou preocupado com alguém". Também pode falar diretamente com o orientador ou professor. Se preferir, pode ser anônimo na maioria dos canais institucionais.',
                      },
                      {
                        subtitle: '💚 Ser aliado importa',
                        text: 'Estudos mostram que a presença de um aliado — alguém que não é neutro, que se posiciona — reduz significativamente os danos causados pelo bullying. Você faz diferença.',
                      },
                    ],
                  },
                  {
                    icon: 'shield',
                    label: 'Canais de proteção',
                    color: 'text-purple-400',
                    bg: 'bg-purple-400/10',
                    border: 'border-purple-400/20',
                    content: [
                      {
                        subtitle: '📞 Disque 100 — Direitos Humanos',
                        text: 'Gratuito, 24h. Para denunciar violações de direitos humanos, incluindo violência contra crianças e adolescentes, trabalho infantil, tráfico de pessoas e discriminação.',
                      },
                      {
                        subtitle: '📞 CVV — 188',
                        text: 'Centro de Valorização da Vida. Gratuito, 24h. Para quem está em crise emocional, sofrendo ou pensando em suicídio. Também disponível em cvv.org.br com chat.',
                      },
                      {
                        subtitle: '🌐 Safernet Brasil — safernet.org.br',
                        text: 'Canal de denúncia de crimes na internet. Aceita denúncias anônimas. Faz parcerias com plataformas e delegacias para remoção de conteúdo ilegal.',
                      },
                      {
                        subtitle: '🏛️ Conselho Tutelar',
                        text: 'Órgão municipal que protege os direitos de crianças e adolescentes. Qualquer pessoa pode fazer uma denúncia. Funciona em todos os municípios brasileiros.',
                      },
                    ],
                  },
                ].map((topic, idx) => (
                  <TopicCard key={topic.label} topic={topic} idx={idx} />
                ))}

                <UrgentBanner />
              </motion.div>
            )}

          </AnimatePresence>
        </PageTransition>
      </main>
    </>
  );
}
