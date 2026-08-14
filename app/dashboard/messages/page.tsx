'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState, useCallback } from 'react';
import { createClient } from '../../../utils/supabase/client';
import TopBar from '../../components/TopBar';
import PageTransition from '../../components/PageTransition';

interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  type: string;
  is_read: boolean;
  session_status: string | null;
  concluded_at: string | null;
  created_at: string;
  sender_name?: string;
  sender_classroom?: string;
}

export default function MessagesPage() {
  const [userName, setUserName] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [orientadorId, setOrientadorId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');

  // Estado de conclusão de sessão
  const [confirmModalId, setConfirmModalId] = useState<string | null>(null);
  const [concludingId, setConcludingId] = useState<string | null>(null);

  const supabase = createClient();

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserName(user.user_metadata?.full_name?.split(' ')[0] || 'Usuário');
        setUserId(user.id);

        const { data: profile } = await supabase
          .from('profiles')
          .select('role, orientador_id, classroom_id, institution_id')
          .eq('id', user.id)
          .single();

        if (profile) {
          setUserRole(profile.role);

          let targetOrientador = profile.orientador_id;

          // Se não tem orientador direto, buscar pela Sala (Aluno -> Sala -> Orientador)
          if (!targetOrientador && profile.classroom_id) {
            const { data: classroom } = await supabase
              .from('classrooms')
              .select('orientador_id')
              .eq('id', profile.classroom_id)
              .maybeSingle();

            if (classroom?.orientador_id) {
              targetOrientador = classroom.orientador_id;
            }
          }

          setOrientadorId(targetOrientador);
        }
      }
    };
    fetchUser();
  }, [supabase]);

  const enrichMessages = useCallback(async (msgs: Message[], currentUserId: string): Promise<Message[]> => {
    if (!msgs || msgs.length === 0) return [];
    const senderIds = [...new Set(msgs.filter(m => m.sender_id !== currentUserId).map(m => m.sender_id))];
    if (senderIds.length === 0) return msgs;

    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name, role, classroom_id')
      .in('id', senderIds);

    const { data: classrooms } = await supabase
      .from('classrooms')
      .select('id, name');

    const profMap = new Map(profiles?.map(p => [p.id, p]));
    const roomMap = new Map(classrooms?.map(c => [c.id, c.name]));

    return msgs.map(msg => {
      if (msg.sender_id !== currentUserId) {
        const prof = profMap.get(msg.sender_id);
        if (prof) {
          const roomName = prof.classroom_id ? roomMap.get(prof.classroom_id) : undefined;
          return { ...msg, sender_name: prof.full_name, sender_classroom: roomName };
        }
      }
      return msg;
    });
  }, [supabase]);

  useEffect(() => {
    if (!userId) return;

    const loadMessages = async () => {
      setLoading(true);
      const { data: msgs } = await supabase
        .from('messages')
        .select('*')
        .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
        .order('created_at', { ascending: true });

      const enriched = await enrichMessages((msgs ?? []) as Message[], userId);
      setMessages(enriched);
      setLoading(false);
    };

    loadMessages();

    const channel = supabase.channel('messages_channel')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, async (payload) => {
        const newMsg = payload.new as Message;
        if (newMsg.sender_id === userId || newMsg.receiver_id === userId) {
          const [enriched] = await enrichMessages([newMsg], userId);
          setMessages(prev => [...prev, enriched]);
        }
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'messages' }, (payload) => {
        const updatedMsg = payload.new as Message;
        if (updatedMsg.sender_id === userId || updatedMsg.receiver_id === userId) {
          setMessages(prev => prev.map(m => m.id === updatedMsg.id ? { ...m, ...updatedMsg } : m));
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, supabase, enrichMessages]);

  const sendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newMessage.trim() || !userId) return;

    const receiver = userRole === 'aluno' ? orientadorId : messages.find(m => m.sender_id !== userId)?.sender_id;

    if (!receiver) {
      alert('Nenhum destinatário disponível (Alunos precisam ter um orientador vinculado).');
      return;
    }

    await supabase.from('messages').insert({
      sender_id: userId,
      receiver_id: receiver,
      content: newMessage,
      type: 'text'
    });

    setNewMessage('');
  };

  const requestSession = async () => {
    if (!userId) return;
    if (!orientadorId) {
      alert('Não foi possível localizar um orientador responsável pela sua turma.');
      return;
    }
    await supabase.from('messages').insert({
      sender_id: userId,
      receiver_id: orientadorId,
      content: 'Solicitação de sessão: O aluno solicitou uma sessão de acompanhamento através do EchoMind.',
      type: 'session_request',
      session_status: 'pendente'
    });
  };

  const handleConcludeSession = async (messageId: string) => {
    setConcludingId(messageId);
    setConfirmModalId(null);
    try {
      const res = await fetch('/api/messages/conclude', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message_id: messageId }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || 'Não foi possível concluir a sessão.');
      }
      // Realtime já atualiza o estado via canal UPDATE
    } catch {
      alert('Não foi possível concluir a sessão. Tente novamente.');
    } finally {
      setConcludingId(null);
    }
  };

  const isOrientador = userRole === 'orientador' || userRole === 'gestor' || userRole === 'administrador';

  // Separar mensagens normais das solicitações de sessão
  const chatMessages = messages.filter(m => m.type !== 'session_request');
  const sessionRequests = messages.filter(m => m.type === 'session_request');
  const pendingSessions = sessionRequests.filter(m => m.session_status === 'pendente');
  const concludedSessions = sessionRequests.filter(m => m.session_status === 'concluida');

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });

  const formatTime = (iso: string) =>
    new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <>
      <TopBar title="Mensagens Aethericas" />
      <main className="pt-32 px-8 md:px-16 pb-24 relative min-h-screen flex flex-col">
        <PageTransition>
          <section className="max-w-[900px] mx-auto w-full flex flex-col gap-8">

            {/* Header */}
            <motion.div
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              className="flex justify-between items-end"
            >
              <div>
                <span className="text-xs font-semibold text-secondary uppercase tracking-[0.3em]">Comunicação Neural</span>
                <h2 className="text-4xl font-light text-on-surface mt-1">Sintonia Direta</h2>
              </div>
              {userRole === 'aluno' && (
                <button
                  onClick={requestSession}
                  className="px-4 py-2 bg-secondary/10 text-secondary text-xs font-semibold uppercase tracking-wider rounded-full border border-secondary/20 hover:bg-secondary/20 transition-colors"
                >
                  Solicitar Sessão
                </button>
              )}
            </motion.div>

            {/* ─── SOLICITAÇÕES DE SESSÃO — Apenas para orientadores ─── */}
            {isOrientador && sessionRequests.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="aetheric-glass rounded-[28px] p-6 flex flex-col gap-6"
              >
                {/* Pendentes */}
                {pendingSessions.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-4">
                      <span className="material-symbols-outlined text-yellow-400 text-base">pending</span>
                      <h3 className="text-sm font-semibold uppercase tracking-[0.15em] text-yellow-400">
                        Solicitações Pendentes
                      </h3>
                      <span className="ml-auto px-2 py-0.5 text-[10px] font-bold rounded-full bg-yellow-400/20 text-yellow-400 border border-yellow-400/30">
                        {pendingSessions.length}
                      </span>
                    </div>
                    <div className="flex flex-col gap-3">
                      {pendingSessions.map(msg => (
                        <div
                          key={msg.id}
                          className="bg-yellow-400/5 border border-yellow-400/20 rounded-2xl p-4 flex flex-col md:flex-row md:items-center gap-3"
                        >
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="material-symbols-outlined text-yellow-400 text-sm">event_available</span>
                              <span className="text-xs font-bold text-yellow-400 uppercase tracking-wider">
                                Solicitação de Sessão
                              </span>
                            </div>
                            {msg.sender_name && (
                              <p className="text-sm text-on-surface font-medium">
                                Aluno: {msg.sender_name}
                                {msg.sender_classroom && (
                                  <span className="text-on-surface-variant font-normal"> • Turma: {msg.sender_classroom}</span>
                                )}
                              </p>
                            )}
                            <p className="text-xs text-on-surface-variant mt-1">
                              Solicitada em {formatDate(msg.created_at)} às {formatTime(msg.created_at)}
                            </p>
                          </div>
                          <button
                            onClick={() => setConfirmModalId(msg.id)}
                            disabled={concludingId === msg.id}
                            className="shrink-0 px-4 py-2 text-xs font-semibold uppercase tracking-wider rounded-full bg-green-500/20 text-green-400 border border-green-500/30 hover:bg-green-500/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-1.5"
                          >
                            {concludingId === msg.id ? (
                              <>
                                <span className="material-symbols-outlined text-sm animate-spin">sync</span>
                                Concluindo...
                              </>
                            ) : (
                              <>
                                <span className="material-symbols-outlined text-sm">check_circle</span>
                                Sessão concluída
                              </>
                            )}
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Histórico de sessões concluídas */}
                {concludedSessions.length > 0 && (
                  <div className={pendingSessions.length > 0 ? 'pt-4 border-t border-white/5' : ''}>
                    <div className="flex items-center gap-2 mb-4">
                      <span className="material-symbols-outlined text-green-400 text-base">history</span>
                      <h3 className="text-sm font-semibold uppercase tracking-[0.15em] text-green-400">
                        Histórico de Sessões
                      </h3>
                      <span className="ml-auto px-2 py-0.5 text-[10px] font-bold rounded-full bg-green-400/20 text-green-400 border border-green-400/30">
                        {concludedSessions.length}
                      </span>
                    </div>
                    <div className="flex flex-col gap-3">
                      {concludedSessions.map(msg => (
                        <div
                          key={msg.id}
                          className="bg-green-400/5 border border-green-500/15 rounded-2xl p-4"
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <span className="material-symbols-outlined text-green-400 text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>
                              check_circle
                            </span>
                            <span className="text-xs font-bold text-green-400 uppercase tracking-wider">
                              Sessão Concluída
                            </span>
                          </div>
                          {msg.sender_name && (
                            <p className="text-sm text-on-surface font-medium">
                              Aluno: {msg.sender_name}
                              {msg.sender_classroom && (
                                <span className="text-on-surface-variant font-normal"> • Turma: {msg.sender_classroom}</span>
                              )}
                            </p>
                          )}
                          <div className="flex gap-4 mt-1 text-xs text-on-surface-variant">
                            <span>Solicitada: {formatDate(msg.created_at)}</span>
                            {msg.concluded_at && (
                              <span>Concluída: {formatDate(msg.concluded_at)}</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {/* ─── SOLICITAÇÕES DE SESSÃO — Visão do Aluno ─── */}
            {!isOrientador && sessionRequests.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="flex flex-col gap-3"
              >
                <span className="text-xs font-semibold text-on-surface-variant uppercase tracking-[0.15em]">
                  Suas Solicitações de Sessão
                </span>
                {sessionRequests.map(msg => (
                  <div
                    key={msg.id}
                    className={`rounded-2xl p-4 border flex items-start gap-3 ${
                      msg.session_status === 'concluida'
                        ? 'bg-green-400/5 border-green-500/20'
                        : 'bg-yellow-400/5 border-yellow-400/20'
                    }`}
                  >
                    <span className={`material-symbols-outlined text-base mt-0.5 ${msg.session_status === 'concluida' ? 'text-green-400' : 'text-yellow-400'}`}
                      style={{ fontVariationSettings: "'FILL' 1" }}>
                      {msg.session_status === 'concluida' ? 'check_circle' : 'pending'}
                    </span>
                    <div className="flex-1">
                      <p className={`text-xs font-bold uppercase tracking-wider ${msg.session_status === 'concluida' ? 'text-green-400' : 'text-yellow-400'}`}>
                        {msg.session_status === 'concluida' ? 'Sessão Concluída' : 'Solicitação Pendente'}
                      </p>
                      <p className="text-xs text-on-surface-variant mt-0.5">
                        Solicitada em {formatDate(msg.created_at)}
                        {msg.concluded_at && ` • Concluída em ${formatDate(msg.concluded_at)}`}
                      </p>
                    </div>
                  </div>
                ))}
              </motion.div>
            )}

            {/* ─── CHAT (mensagens de texto) ─── */}
            <motion.div
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="aetheric-glass rounded-[32px] p-6 flex flex-col overflow-hidden relative"
              style={{ minHeight: '50vh' }}
            >
              {loading ? (
                <div className="flex-1 flex items-center justify-center text-sm text-on-surface-variant opacity-60">
                  Sincronizando frequências...
                </div>
              ) : (
                <div className="flex-1 overflow-y-auto flex flex-col gap-4 pr-2 mb-4 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                  {chatMessages.length === 0 ? (
                    <div className="flex-1 flex items-center justify-center text-sm text-on-surface-variant opacity-60">
                      Nenhuma ressonância detectada ainda.
                    </div>
                  ) : (
                    chatMessages.map(msg => {
                      const isMe = msg.sender_id === userId;
                      return (
                        <div key={msg.id} className={`flex flex-col max-w-[80%] ${isMe ? 'self-end items-end' : 'self-start items-start'}`}>
                          {!isMe && msg.sender_name && (
                            <span className="text-[10px] text-on-surface-variant font-medium mb-1 pl-1">
                              {msg.sender_name} {msg.sender_classroom ? `• Sala: ${msg.sender_classroom}` : ''}
                            </span>
                          )}
                          <div className={`p-4 rounded-[20px] ${isMe ? 'bg-secondary/20 border border-secondary/30 text-on-surface rounded-br-sm' : 'bg-surface-container border border-white/5 text-on-surface-variant rounded-bl-sm'}`}>
                            <p className="text-sm">{msg.content}</p>
                          </div>
                          <span className="text-[10px] uppercase tracking-wider text-on-surface-variant opacity-40 mt-1">
                            {formatTime(msg.created_at)}
                          </span>
                        </div>
                      );
                    })
                  )}
                </div>
              )}

              <form onSubmit={sendMessage} className="relative mt-auto">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Transmitir pensamento..."
                  className="w-full bg-background/50 border border-white/10 rounded-full py-4 pl-6 pr-16 text-sm text-on-surface outline-none focus:border-secondary/50 transition-colors placeholder-on-surface-variant/40"
                />
                <button
                  type="submit"
                  disabled={!newMessage.trim()}
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-secondary text-background flex items-center justify-center hover:bg-secondary-bright transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span className="material-symbols-outlined text-[20px]">send</span>
                </button>
              </form>
            </motion.div>

          </section>
        </PageTransition>
      </main>

      {/* ─── MODAL DE CONFIRMAÇÃO "Sessão concluída" ─── */}
      <AnimatePresence>
        {confirmModalId && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setConfirmModalId(null)}
            className="fixed inset-0 z-50 flex items-center justify-center bg-background/70 backdrop-blur-sm p-4"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 16 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-surface-container border border-white/10 rounded-3xl p-8 w-full max-w-md shadow-2xl"
            >
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded-full bg-green-500/10 border border-green-500/20 flex items-center justify-center">
                  <span className="material-symbols-outlined text-green-400 text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>
                    check_circle
                  </span>
                </div>
                <h3 className="text-lg font-medium text-on-surface">Concluir sessão?</h3>
              </div>
              <p className="text-sm text-on-surface-variant leading-relaxed mb-8">
                Ao confirmar, esta solicitação será marcada como <strong className="text-on-surface">concluída</strong> e deixará de aparecer entre as pendências, mas permanecerá registrada no histórico.
              </p>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setConfirmModalId(null)}
                  className="px-5 py-2.5 text-xs font-semibold uppercase tracking-wider rounded-full bg-white/5 border border-white/10 text-on-surface-variant hover:bg-white/10 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => handleConcludeSession(confirmModalId)}
                  className="px-5 py-2.5 text-xs font-semibold uppercase tracking-wider rounded-full bg-green-500/20 border border-green-500/30 text-green-400 hover:bg-green-500/30 transition-colors flex items-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-sm">check</span>
                  Confirmar conclusão
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
