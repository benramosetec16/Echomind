'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import TopBar from '../../components/TopBar';
import PageTransition from '../../components/PageTransition';
import { createClient } from '../../../utils/supabase/client';

interface CalendarEvent {
  id: string;
  date: string; // YYYY-MM-DD
  title: string;
  type: 'checkin' | 'journal' | 'study' | 'custom';
  color: string;
}

const TYPE_COLORS: Record<CalendarEvent['type'], string> = {
  checkin: '#9fcfd5',
  journal: '#cebdff',
  study: '#ffb4ab',
  custom: '#ffd966',
};

const TYPE_LABELS: Record<CalendarEvent['type'], string> = {
  checkin: 'Check-in',
  journal: 'Diário',
  study: 'Estudo',
  custom: 'Evento',
};

const TYPE_ICONS: Record<CalendarEvent['type'], string> = {
  checkin: 'auto_awesome',
  journal: 'history_edu',
  study: 'school',
  custom: 'event',
};

const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const MONTHS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

function toDateKey(d: Date): string {
  return d.toISOString().split('T')[0];
}

export default function CalendarPage() {
  const supabase = createClient();
  const today = new Date();

  const [currentDate, setCurrentDate] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(toDateKey(today));
  const [showAddModal, setShowAddModal] = useState(false);
  const [newEventTitle, setNewEventTitle] = useState('');
  const [newEventType, setNewEventType] = useState<CalendarEvent['type']>('custom');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadEvents();
  }, []);

  const loadEvents = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Load check-ins as events
      const { data: checkins } = await supabase
        .from('emotional_checkins')
        .select('id, created_at, emotional_state, valence_value')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true });

      // Load journal entries as events
      const { data: journals } = await supabase
        .from('aetheric_journal')
        .select('id, created_at, entry_title, sentiment_tag')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true });

      const mapped: CalendarEvent[] = [];

      (checkins || []).forEach(c => {
        mapped.push({
          id: 'ci-' + c.id,
          date: new Date(c.created_at).toISOString().split('T')[0],
          title: `Check-in: ${c.emotional_state || 'Emocional'}`,
          type: 'checkin',
          color: TYPE_COLORS.checkin,
        });
      });

      (journals || []).forEach(j => {
        mapped.push({
          id: 'jr-' + j.id,
          date: new Date(j.created_at).toISOString().split('T')[0],
          title: j.entry_title || 'Entrada no Diário',
          type: 'journal',
          color: TYPE_COLORS.journal,
        });
      });

      // Load saved custom events from localStorage (future: Supabase table)
      try {
        const saved = JSON.parse(localStorage.getItem('echomind_calendar_events') || '[]');
        mapped.push(...saved);
      } catch { /* ignore */ }

      setEvents(mapped);
    } finally {
      setLoading(false);
    }
  };

  const handleAddEvent = () => {
    if (!newEventTitle.trim() || !selectedDate) return;
    const newEvent: CalendarEvent = {
      id: 'custom-' + Date.now(),
      date: selectedDate,
      title: newEventTitle.trim(),
      type: newEventType,
      color: TYPE_COLORS[newEventType],
    };
    const updated = [...events, newEvent];
    setEvents(updated);
    // Persist custom events to localStorage
    const custom = updated.filter(e => e.id.startsWith('custom-'));
    localStorage.setItem('echomind_calendar_events', JSON.stringify(custom));
    setNewEventTitle('');
    setShowAddModal(false);
  };

  const handleDeleteEvent = (id: string) => {
    if (!id.startsWith('custom-')) return;
    const updated = events.filter(e => e.id !== id);
    setEvents(updated);
    const custom = updated.filter(e => e.id.startsWith('custom-'));
    localStorage.setItem('echomind_calendar_events', JSON.stringify(custom));
  };

  // Build calendar grid for current month
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const calendarDays: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  const getEventsForDate = (day: number): CalendarEvent[] => {
    const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return events.filter(e => e.date === dateKey);
  };

  const selectedEvents = selectedDate ? events.filter(e => e.date === selectedDate) : [];

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  return (
    <>
      <TopBar title="Agenda" />
      <main className="pt-32 px-16 pb-24 relative min-h-screen">
        <PageTransition>
          <header className="max-w-[1200px] mx-auto mb-12">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-3 mb-4"
            >
              <span className="text-xs font-semibold text-secondary/60 uppercase tracking-[0.2em]">
                Linha do Tempo
              </span>
            </motion.div>
            <motion.h1
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-5xl font-extralight tracking-tighter text-on-background"
            >
              Calendário Integrado
            </motion.h1>
          </header>

          <div className="max-w-[1200px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Calendar Grid */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="lg:col-span-8 aetheric-glass rounded-3xl p-8"
            >
              {/* Month Nav */}
              <div className="flex items-center justify-between mb-8">
                <button
                  onClick={prevMonth}
                  className="p-2 rounded-xl hover:bg-white/5 text-on-surface-variant hover:text-on-surface transition-all"
                >
                  <span className="material-symbols-outlined">chevron_left</span>
                </button>
                <h2 className="text-xl font-light text-on-surface tracking-wide">
                  {MONTHS[month]} <span className="text-secondary">{year}</span>
                </h2>
                <button
                  onClick={nextMonth}
                  className="p-2 rounded-xl hover:bg-white/5 text-on-surface-variant hover:text-on-surface transition-all"
                >
                  <span className="material-symbols-outlined">chevron_right</span>
                </button>
              </div>

              {/* Weekday Headers */}
              <div className="grid grid-cols-7 mb-2">
                {WEEKDAYS.map(d => (
                  <div key={d} className="text-center text-[10px] font-semibold uppercase tracking-[0.15em] text-on-surface-variant opacity-50 py-2">
                    {d}
                  </div>
                ))}
              </div>

              {/* Days Grid */}
              {loading ? (
                <div className="flex items-center justify-center py-16">
                  <span className="material-symbols-outlined animate-spin text-3xl text-secondary">sync</span>
                </div>
              ) : (
                <div className="grid grid-cols-7 gap-1">
                  {calendarDays.map((day, i) => {
                    if (day === null) return <div key={`empty-${i}`} />;
                    const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                    const dayEvents = getEventsForDate(day);
                    const isToday = toDateKey(today) === dateKey;
                    const isSelected = selectedDate === dateKey;

                    return (
                      <motion.button
                        key={dateKey}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: i * 0.005 }}
                        onClick={() => setSelectedDate(dateKey)}
                        className={`relative p-2 rounded-xl flex flex-col items-center gap-1 transition-all min-h-[56px] ${
                          isSelected
                            ? 'bg-secondary/15 border border-secondary/40'
                            : isToday
                            ? 'bg-white/5 border border-secondary/20'
                            : 'hover:bg-white/5 border border-transparent'
                        }`}
                      >
                        <span className={`text-sm font-light ${
                          isToday ? 'text-secondary font-medium' :
                          isSelected ? 'text-on-surface' :
                          'text-on-surface-variant'
                        }`}>
                          {day}
                        </span>
                        {/* Event dots */}
                        {dayEvents.length > 0 && (
                          <div className="flex gap-0.5 flex-wrap justify-center max-w-[40px]">
                            {dayEvents.slice(0, 3).map(ev => (
                              <div
                                key={ev.id}
                                className="w-1.5 h-1.5 rounded-full"
                                style={{ backgroundColor: ev.color }}
                              />
                            ))}
                            {dayEvents.length > 3 && (
                              <div className="w-1.5 h-1.5 rounded-full bg-white/30" />
                            )}
                          </div>
                        )}
                      </motion.button>
                    );
                  })}
                </div>
              )}

              {/* Legend */}
              <div className="flex gap-4 mt-6 pt-6 border-t border-white/5">
                {(Object.keys(TYPE_COLORS) as CalendarEvent['type'][]).map(type => (
                  <div key={type} className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: TYPE_COLORS[type] }} />
                    <span className="text-[10px] text-on-surface-variant uppercase tracking-wide opacity-60">{TYPE_LABELS[type]}</span>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Day Detail Sidebar */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.35 }}
              className="lg:col-span-4 flex flex-col gap-4"
            >
              {/* Selected Day Events */}
              <div className="aetheric-glass rounded-3xl p-6 flex-1">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-sm font-semibold text-on-surface uppercase tracking-[0.12em]">
                      {selectedDate
                        ? new Date(selectedDate + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' })
                        : 'Selecione um dia'}
                    </h3>
                    <p className="text-xs text-on-surface-variant opacity-50 mt-0.5">
                      {selectedEvents.length} {selectedEvents.length === 1 ? 'evento' : 'eventos'}
                    </p>
                  </div>
                  {selectedDate && (
                    <button
                      onClick={() => setShowAddModal(true)}
                      className="p-2 rounded-xl bg-secondary/10 border border-secondary/30 text-secondary hover:bg-secondary/20 transition-all"
                      title="Adicionar evento"
                    >
                      <span className="material-symbols-outlined text-base">add</span>
                    </button>
                  )}
                </div>

                {selectedEvents.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <span className="material-symbols-outlined text-3xl text-on-surface-variant opacity-20 mb-3">event_busy</span>
                    <p className="text-xs text-on-surface-variant opacity-40">Nenhum evento neste dia.</p>
                    {selectedDate && (
                      <button
                        onClick={() => setShowAddModal(true)}
                        className="mt-4 text-xs text-secondary underline underline-offset-4 hover:no-underline transition-all"
                      >
                        + Adicionar evento
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col gap-3 overflow-y-auto max-h-80">
                    <AnimatePresence>
                      {selectedEvents.map((ev, i) => (
                        <motion.div
                          key={ev.id}
                          initial={{ opacity: 0, x: 10 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -10 }}
                          transition={{ delay: i * 0.05 }}
                          className="flex items-start gap-3 p-3 rounded-xl bg-white/5 border border-white/5 group"
                        >
                          <span
                            className="material-symbols-outlined text-base mt-0.5 flex-shrink-0"
                            style={{ color: ev.color }}
                          >
                            {TYPE_ICONS[ev.type]}
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-on-surface font-medium truncate">{ev.title}</p>
                            <p className="text-[10px] uppercase tracking-widest mt-0.5 opacity-50" style={{ color: ev.color }}>
                              {TYPE_LABELS[ev.type]}
                            </p>
                          </div>
                          {ev.id.startsWith('custom-') && (
                            <button
                              onClick={() => handleDeleteEvent(ev.id)}
                              className="opacity-0 group-hover:opacity-100 transition-opacity text-error hover:text-error/80"
                            >
                              <span className="material-symbols-outlined text-base">delete</span>
                            </button>
                          )}
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>
                )}
              </div>

              {/* Monthly Summary */}
              <div className="aetheric-glass rounded-2xl p-5">
                <h4 className="text-xs font-semibold uppercase tracking-[0.15em] text-on-surface-variant mb-4">
                  Resumo do Mês
                </h4>
                {(Object.keys(TYPE_LABELS) as CalendarEvent['type'][]).map(type => {
                  const count = events.filter(e =>
                    e.type === type && e.date.startsWith(`${year}-${String(month + 1).padStart(2, '0')}`)
                  ).length;
                  return (
                    <div key={type} className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: TYPE_COLORS[type] }} />
                        <span className="text-xs text-on-surface-variant">{TYPE_LABELS[type]}</span>
                      </div>
                      <span className="text-sm font-light" style={{ color: TYPE_COLORS[type] }}>{count}</span>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          </div>

          {/* Add Event Modal */}
          <AnimatePresence>
            {showAddModal && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-8"
                onClick={e => { if (e.target === e.currentTarget) setShowAddModal(false); }}
              >
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="aetheric-glass rounded-3xl p-8 max-w-md w-full"
                >
                  <h3 className="text-xl font-light text-on-surface mb-6">
                    Novo Evento —{' '}
                    <span className="text-secondary">
                      {selectedDate && new Date(selectedDate + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' })}
                    </span>
                  </h3>

                  <input
                    type="text"
                    value={newEventTitle}
                    onChange={e => setNewEventTitle(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleAddEvent()}
                    placeholder="Título do evento..."
                    autoFocus
                    className="w-full bg-surface-container-lowest/60 border border-white/10 rounded-xl px-4 py-3 text-sm text-on-surface placeholder-on-surface-variant/30 focus:outline-none focus:border-secondary/50 transition-colors mb-4"
                  />

                  <div className="grid grid-cols-2 gap-2 mb-6">
                    {(Object.keys(TYPE_LABELS) as CalendarEvent['type'][]).map(type => (
                      <button
                        key={type}
                        onClick={() => setNewEventType(type)}
                        className={`py-2.5 px-3 rounded-xl text-xs font-semibold uppercase tracking-widest flex items-center gap-2 transition-all ${
                          newEventType === type ? 'border' : 'bg-white/5 border border-transparent hover:bg-white/10'
                        }`}
                        style={newEventType === type ? {
                          backgroundColor: TYPE_COLORS[type] + '20',
                          borderColor: TYPE_COLORS[type] + '60',
                          color: TYPE_COLORS[type],
                        } : {}}
                      >
                        <span className="material-symbols-outlined text-base">{TYPE_ICONS[type]}</span>
                        {TYPE_LABELS[type]}
                      </button>
                    ))}
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={handleAddEvent}
                      disabled={!newEventTitle.trim()}
                      className="flex-1 py-3 rounded-xl bg-secondary/10 border border-secondary/30 text-secondary font-semibold text-xs uppercase tracking-widest hover:bg-secondary/20 disabled:opacity-30 transition-all"
                    >
                      Adicionar
                    </button>
                    <button
                      onClick={() => setShowAddModal(false)}
                      className="py-3 px-6 rounded-xl border border-white/10 text-on-surface-variant text-xs font-semibold uppercase tracking-widest hover:bg-white/5 transition-all"
                    >
                      Cancelar
                    </button>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </PageTransition>
      </main>
    </>
  );
}
