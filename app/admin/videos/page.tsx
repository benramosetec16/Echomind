'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import TopBar from '@/app/components/TopBar';
import PageTransition from '@/app/components/PageTransition';

type Video = {
  id: string;
  disciplina: string;
  assunto: string;
  subtopicos: string[];
  palavras_chave: string[];
  titulo: string;
  canal: string;
  video_id: string;
  duracao: number;
  nivel: string;
  idioma: string;
  descricao: string;
  prioridade: number;
  ativo: boolean;
};

export default function AdminVideosPage() {
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState<Partial<Video> | null>(null);
  const supabase = createClient();

  const fetchVideos = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('educational_videos')
      .select('*')
      .order('prioridade', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching videos:', error);
    } else {
      setVideos(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchVideos();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isEditing?.titulo || !isEditing?.video_id || !isEditing?.disciplina || !isEditing?.assunto) return;

    const payload = {
      ...isEditing,
      subtopicos: typeof isEditing.subtopicos === 'string' ? (isEditing.subtopicos as string).split(',').map(s => s.trim()) : isEditing.subtopicos || [],
      palavras_chave: typeof isEditing.palavras_chave === 'string' ? (isEditing.palavras_chave as string).split(',').map(s => s.trim()) : isEditing.palavras_chave || [],
      duracao: isEditing.duracao ? Number(isEditing.duracao) : 0,
      prioridade: isEditing.prioridade ? Number(isEditing.prioridade) : 0,
    };

    if (payload.id) {
      const { error } = await supabase.from('educational_videos').update(payload).eq('id', payload.id);
      if (error) alert('Erro ao atualizar: ' + error.message);
    } else {
      const { error } = await supabase.from('educational_videos').insert([payload]);
      if (error) alert('Erro ao criar: ' + error.message);
    }
    
    setIsEditing(null);
    fetchVideos();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este vídeo?')) return;
    const { error } = await supabase.from('educational_videos').delete().eq('id', id);
    if (error) alert('Erro ao excluir: ' + error.message);
    fetchVideos();
  };

  const toggleStatus = async (id: string, currentStatus: boolean) => {
    const { error } = await supabase.from('educational_videos').update({ ativo: !currentStatus }).eq('id', id);
    if (error) alert('Erro ao atualizar status: ' + error.message);
    fetchVideos();
  };

  return (
    <>
      <TopBar title="Gestão de Vídeos" />
      <main className="pt-32 px-4 md:px-16 pb-24 relative min-h-screen">
        <PageTransition>
          <div className="max-w-[1200px] mx-auto w-full">
            <div className="flex justify-between items-center mb-8">
              <div>
                <h2 className="text-3xl font-extralight text-on-surface tracking-tighter mb-2">Biblioteca de Conteúdo</h2>
                <p className="text-sm text-on-surface-variant opacity-80">Gerencie os vídeos recomendados pela IA no módulo de estudos.</p>
              </div>
              <button 
                onClick={() => setIsEditing({ nivel: 'Médio', idioma: 'pt-BR', ativo: true })}
                className="flex items-center gap-2 px-6 py-3 bg-secondary text-background text-xs uppercase tracking-widest font-bold rounded-full hover:bg-secondary/90 transition-all"
              >
                <span className="material-symbols-outlined text-[16px]">add</span>
                Novo Vídeo
              </button>
            </div>

            {isEditing && (
              <div className="aetheric-glass rounded-[32px] p-6 mb-8 border border-secondary/30">
                <h3 className="text-xl font-semibold mb-6">{isEditing.id ? 'Editar Vídeo' : 'Novo Vídeo'}</h3>
                <form onSubmit={handleSave} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <input type="text" placeholder="Título" value={isEditing.titulo || ''} onChange={e => setIsEditing({...isEditing, titulo: e.target.value})} className="bg-white/5 border border-white/10 rounded-xl p-3 text-sm focus:outline-none focus:border-secondary" required />
                  <input type="text" placeholder="Video ID (ex: dQw4w9WgXcQ)" value={isEditing.video_id || ''} onChange={e => setIsEditing({...isEditing, video_id: e.target.value})} className="bg-white/5 border border-white/10 rounded-xl p-3 text-sm focus:outline-none focus:border-secondary" required />
                  <input type="text" placeholder="Disciplina" value={isEditing.disciplina || ''} onChange={e => setIsEditing({...isEditing, disciplina: e.target.value})} className="bg-white/5 border border-white/10 rounded-xl p-3 text-sm focus:outline-none focus:border-secondary" required />
                  <input type="text" placeholder="Assunto" value={isEditing.assunto || ''} onChange={e => setIsEditing({...isEditing, assunto: e.target.value})} className="bg-white/5 border border-white/10 rounded-xl p-3 text-sm focus:outline-none focus:border-secondary" required />
                  <input type="text" placeholder="Palavras-chave (separadas por vírgula)" value={isEditing.palavras_chave?.toString() || ''} onChange={e => setIsEditing({...isEditing, palavras_chave: e.target.value as any})} className="bg-white/5 border border-white/10 rounded-xl p-3 text-sm focus:outline-none focus:border-secondary" />
                  <input type="text" placeholder="Subtópicos (separados por vírgula)" value={isEditing.subtopicos?.toString() || ''} onChange={e => setIsEditing({...isEditing, subtopicos: e.target.value as any})} className="bg-white/5 border border-white/10 rounded-xl p-3 text-sm focus:outline-none focus:border-secondary" />
                  <input type="text" placeholder="Canal" value={isEditing.canal || ''} onChange={e => setIsEditing({...isEditing, canal: e.target.value})} className="bg-white/5 border border-white/10 rounded-xl p-3 text-sm focus:outline-none focus:border-secondary" />
                  <select value={isEditing.nivel || 'Médio'} onChange={e => setIsEditing({...isEditing, nivel: e.target.value})} className="bg-white/5 border border-white/10 rounded-xl p-3 text-sm focus:outline-none focus:border-secondary text-on-surface">
                    <option value="Fundamental" className="bg-surface-container">Fundamental</option>
                    <option value="Médio" className="bg-surface-container">Médio</option>
                    <option value="Superior" className="bg-surface-container">Superior</option>
                    <option value="Livre" className="bg-surface-container">Livre</option>
                  </select>
                  <input type="number" placeholder="Duração (segundos)" value={isEditing.duracao || ''} onChange={e => setIsEditing({...isEditing, duracao: parseInt(e.target.value)})} className="bg-white/5 border border-white/10 rounded-xl p-3 text-sm focus:outline-none focus:border-secondary" />
                  <input type="number" placeholder="Prioridade (maior = mais relevante)" value={isEditing.prioridade || 0} onChange={e => setIsEditing({...isEditing, prioridade: parseInt(e.target.value)})} className="bg-white/5 border border-white/10 rounded-xl p-3 text-sm focus:outline-none focus:border-secondary" />
                  
                  <div className="md:col-span-2">
                    <textarea placeholder="Descrição" value={isEditing.descricao || ''} onChange={e => setIsEditing({...isEditing, descricao: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm focus:outline-none focus:border-secondary resize-none h-24" />
                  </div>

                  <div className="md:col-span-2 flex justify-end gap-4 mt-4">
                    <button type="button" onClick={() => setIsEditing(null)} className="px-6 py-2 rounded-full border border-white/10 text-sm hover:bg-white/5">Cancelar</button>
                    <button type="submit" className="px-6 py-2 rounded-full bg-secondary text-background font-bold text-sm hover:bg-secondary/90">Salvar</button>
                  </div>
                </form>
              </div>
            )}

            <div className="aetheric-glass rounded-[32px] overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-white/5 border-b border-white/10">
                    <tr>
                      <th className="p-4 font-semibold">Disciplina / Assunto</th>
                      <th className="p-4 font-semibold">Vídeo</th>
                      <th className="p-4 font-semibold">Nível</th>
                      <th className="p-4 font-semibold">Prioridade</th>
                      <th className="p-4 font-semibold">Status</th>
                      <th className="p-4 font-semibold text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr><td colSpan={6} className="p-8 text-center text-on-surface-variant">Carregando biblioteca...</td></tr>
                    ) : videos.length === 0 ? (
                      <tr><td colSpan={6} className="p-8 text-center text-on-surface-variant">Nenhum vídeo cadastrado.</td></tr>
                    ) : (
                      videos.map(video => (
                        <tr key={video.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                          <td className="p-4">
                            <div className="font-semibold text-secondary">{video.disciplina}</div>
                            <div className="text-xs text-on-surface-variant">{video.assunto}</div>
                          </td>
                          <td className="p-4">
                            <div className="line-clamp-1 font-medium">{video.titulo}</div>
                            <div className="text-xs text-on-surface-variant font-mono">{video.video_id}</div>
                          </td>
                          <td className="p-4"><span className="px-2 py-1 bg-white/10 rounded-md text-xs">{video.nivel}</span></td>
                          <td className="p-4 text-center">{video.prioridade}</td>
                          <td className="p-4">
                            <button onClick={() => toggleStatus(video.id, video.ativo)} className={`px-3 py-1 rounded-full text-xs font-bold ${video.ativo ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                              {video.ativo ? 'ATIVO' : 'INATIVO'}
                            </button>
                          </td>
                          <td className="p-4 text-right flex justify-end gap-2">
                            <button onClick={() => setIsEditing(video)} className="p-2 bg-white/5 hover:bg-white/10 rounded-full text-on-surface transition-colors" title="Editar">
                              <span className="material-symbols-outlined text-[16px]">edit</span>
                            </button>
                            <button onClick={() => handleDelete(video.id)} className="p-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-full transition-colors" title="Excluir">
                              <span className="material-symbols-outlined text-[16px]">delete</span>
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </PageTransition>
      </main>
    </>
  );
}
