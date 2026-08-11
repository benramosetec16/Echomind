'use client';

import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
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

          // Fallback: buscar qualquer orientador/gestor na mesma instituição se ainda não encontrado
          if (!targetOrientador && profile.institution_id) {
            const { data: instStaff } = await supabase
              .from('profiles')
              .select('id')
              .eq('institution_id', profile.institution_id)
              .in('role', ['orientador', 'gestor'])
              .limit(1)
              .maybeSingle();
              
            if (instStaff?.id) {
              targetOrientador = instStaff.id;
            }
          }

          setOrientadorId(targetOrientador);
        }
      }
    };
    fetchUser();
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
        
      if (msgs && msgs.length > 0) {
        // Enriquecer com dados do remetente (apenas se eu for o receiver)
        const senderIds = [...new Set(msgs.filter(m => m.sender_id !== userId).map(m => m.sender_id))];
        
        let enrichedMsgs = msgs as Message[];
        
        if (senderIds.length > 0) {
          const { data: profiles } = await supabase
            .from('profiles')
            .select('id, full_name, role, classroom_id')
            .in('id', senderIds);
            
          const { data: classrooms } = await supabase
            .from('classrooms')
            .select('id, name');
            
          const profMap = new Map(profiles?.map(p => [p.id, p]));
          const roomMap = new Map(classrooms?.map(c => [c.id, c.name]));
          
          enrichedMsgs = msgs.map(msg => {
            if (msg.sender_id !== userId) {
              const prof = profMap.get(msg.sender_id);
              if (prof) {
                const roomName = prof.classroom_id ? roomMap.get(prof.classroom_id) : undefined;
                return {
                  ...msg,
                  sender_name: prof.full_name,
                  sender_classroom: roomName
                };
              }
            }
            return msg;
          });
        }
        setMessages(enrichedMsgs);
      }
      setLoading(false);
    };

    loadMessages();

    const channel = supabase.channel('messages_channel')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, async (payload) => {
        let newMsg = payload.new as Message;
        if (newMsg.sender_id === userId || newMsg.receiver_id === userId) {
          if (newMsg.sender_id !== userId) {
            const { data: prof } = await supabase.from('profiles').select('full_name, classroom_id').eq('id', newMsg.sender_id).single();
            if (prof) {
              newMsg.sender_name = prof.full_name;
              if (prof.classroom_id) {
                const { data: room } = await supabase.from('classrooms').select('name').eq('id', prof.classroom_id).single();
                if (room) newMsg.sender_classroom = room.name;
              }
            }
          }
          setMessages(prev => [...prev, newMsg]);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, supabase]);

  const sendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newMessage.trim() || !userId) return;
    
    // Aluno envia para o orientador, Orientador precisaria de um seletor (simplificado aqui)
    const receiver = userRole === 'aluno' ? orientadorId : messages.find(m => m.sender_id !== userId)?.sender_id;
    
    if (!receiver) {
      alert("Nenhum destinatário disponível (Alunos precisam ter um orientador vinculado).");
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
    if (!userId || !orientadorId) return;
    await supabase.from('messages').insert({
      sender_id: userId,
      receiver_id: orientadorId,
      content: 'SOLICITAÇÃO DE SESSÃO: Gostaria de agendar uma sessão de apoio.',
      type: 'session_request'
    });
  };

  return (
    <>
      <TopBar title="Mensagens Aethericas" />
      <main className="pt-32 px-8 md:px-16 pb-24 relative min-h-screen flex flex-col">
        <PageTransition>
          <section className="max-w-[800px] mx-auto w-full flex-1 flex flex-col h-[70vh]">
            <motion.div
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              className="flex justify-between items-end mb-6"
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

            <div className="aetheric-glass rounded-[32px] p-6 flex-1 flex flex-col overflow-hidden relative">
              {loading ? (
                <div className="flex-1 flex items-center justify-center text-sm text-on-surface-variant opacity-60">Sincronizando frequências...</div>
              ) : (
                <div className="flex-1 overflow-y-auto flex flex-col gap-4 pr-2 mb-4 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                  {messages.length === 0 ? (
                    <div className="flex-1 flex items-center justify-center text-sm text-on-surface-variant opacity-60">Nenhuma ressonância detectada ainda.</div>
                  ) : (
                    messages.map(msg => {
                      const isMe = msg.sender_id === userId;
                      return (
                        <div key={msg.id} className={`flex flex-col max-w-[80%] ${isMe ? 'self-end items-end' : 'self-start items-start'}`}>
                          {/* Sender Info for non-me messages */}
                          {!isMe && msg.sender_name && (
                            <span className="text-[10px] text-on-surface-variant font-medium mb-1 pl-1">
                              {msg.sender_name} {msg.sender_classroom ? `• Sala: ${msg.sender_classroom}` : ''}
                            </span>
                          )}
                          <div className={`p-4 rounded-[20px] ${isMe ? 'bg-secondary/20 border border-secondary/30 text-on-surface rounded-br-sm' : 'bg-surface-container border border-white/5 text-on-surface-variant rounded-bl-sm'} ${msg.type === 'session_request' ? 'border-yellow-400/50 bg-yellow-400/10 text-yellow-100' : ''}`}>
                            <p className="text-sm">{msg.content}</p>
                          </div>
                          <span className="text-[10px] uppercase tracking-wider text-on-surface-variant opacity-40 mt-1">
                            {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
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
            </div>
          </section>
        </PageTransition>
      </main>
    </>
  );
}
