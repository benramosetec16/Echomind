'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import TopBar from '../../components/TopBar';
import PageTransition from '../../components/PageTransition';
import { getUserRole, ROLE_LABELS, type UserRole } from '../../../utils/roles';
import { useRouter } from 'next/navigation';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

interface InstitutionMetrics {
  totalUsers: number;
  totalCheckins: number;
  totalJournalEntries: number;
  totalBiometricLogs: number;
  activeUsersLast7Days: number;
  avgValence: number;
  dailyCheckinsChart: Array<{ date: string; count: number }>;
  sentimentDistribution: Array<{ name: string; value: number }>;
}

const PIE_COLORS = ['#9fcfd5', '#cebdff', '#e5e2e1', '#ffb4ab', '#444748'];

export default function InstitutionPage() {
  const [metrics, setMetrics] = useState<InstitutionMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<UserRole>('aluno');
  const router = useRouter();

  useEffect(() => {
    const init = async () => {
      const role = await getUserRole();
      setUserRole(role);

      if (!['professor', 'orientador', 'administrador'].includes(role)) {
        router.replace('/dashboard');
        return;
      }

      try {
        const res = await fetch('/api/institution/metrics');
        if (!res.ok) {
          const d = await res.json();
          throw new Error(d.error || 'Falha ao carregar métricas');
        }
        const data = await res.json();
        setMetrics(data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [router]);

  const statCards = metrics ? [
    { label: 'Usuários Cadastrados', value: metrics.totalUsers, icon: 'group', color: 'text-secondary' },
    { label: 'Ativos (7 dias)', value: metrics.activeUsersLast7Days, icon: 'person_check', color: 'text-tertiary' },
    { label: 'Check-ins Totais', value: metrics.totalCheckins, icon: 'auto_awesome', color: 'text-secondary' },
    { label: 'Registros do Diário', value: metrics.totalJournalEntries, icon: 'history_edu', color: 'text-tertiary' },
    { label: 'Alertas Biométricos', value: metrics.totalBiometricLogs, icon: 'monitor_heart', color: 'text-error' },
    { label: 'Humor Médio (Valência)', value: `${metrics.avgValence}/100`, icon: 'sentiment_satisfied', color: 'text-secondary' },
  ] : [];

  return (
    <>
      <TopBar title="Institucional" />
      <main className="pt-32 px-16 pb-24 relative min-h-screen">
        <PageTransition>
          {/* Header */}
          <header className="max-w-[1200px] mx-auto mb-16">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-3 mb-4"
            >
              <span className="text-xs font-semibold text-secondary/60 uppercase tracking-[0.2em]">
                {ROLE_LABELS[userRole]} — Acesso Restrito
              </span>
            </motion.div>
            <motion.h1
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-5xl font-extralight tracking-tighter text-on-background mb-3"
            >
              Painel Institucional
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-on-surface-variant max-w-2xl"
            >
              Indicadores agregados de uso da plataforma. Nenhum dado pessoal, conteúdo do diário ou conversas privadas são exibidos neste painel.
            </motion.p>
          </header>

          {loading ? (
            <div className="max-w-[1200px] mx-auto flex items-center justify-center py-32">
              <span className="material-symbols-outlined animate-spin text-4xl text-secondary">sync</span>
            </div>
          ) : error ? (
            <div className="max-w-[1200px] mx-auto aetheric-glass rounded-3xl p-12 text-center">
              <span className="material-symbols-outlined text-error text-4xl mb-4 block">error</span>
              <p className="text-error text-sm">{error}</p>
            </div>
          ) : (
            <div className="max-w-[1200px] mx-auto">
              {/* Stats Grid */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="grid grid-cols-2 md:grid-cols-3 gap-6 mb-12"
              >
                {statCards.map((card, i) => (
                  <motion.div
                    key={card.label}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 + i * 0.07 }}
                    className="aetheric-glass rounded-2xl p-6 flex flex-col gap-3 group hover:bg-white/[0.03] transition-colors"
                  >
                    <div className="flex justify-between items-start">
                      <span className="text-xs uppercase tracking-[0.15em] text-on-surface-variant opacity-60 font-semibold">
                        {card.label}
                      </span>
                      <span className={`material-symbols-outlined text-xl opacity-50 group-hover:opacity-100 transition-opacity ${card.color}`}>
                        {card.icon}
                      </span>
                    </div>
                    <span className={`text-4xl font-extralight ${card.color}`}>{card.value}</span>
                  </motion.div>
                ))}
              </motion.div>

              {/* Charts Row */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-12">
                {/* Daily Check-ins Bar Chart */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6 }}
                  className="lg:col-span-8 aetheric-glass rounded-3xl p-8"
                >
                  <h3 className="text-sm font-semibold uppercase tracking-[0.15em] text-on-surface-variant mb-8">
                    Check-ins por Dia (Últimos 14 Dias)
                  </h3>
                  {metrics?.dailyCheckinsChart && metrics.dailyCheckinsChart.length > 0 ? (
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart data={metrics.dailyCheckinsChart} barSize={20}>
                        <XAxis
                          dataKey="date"
                          tick={{ fill: '#c4c7c7', fontSize: 9 }}
                          axisLine={false}
                          tickLine={false}
                        />
                        <YAxis
                          tick={{ fill: '#c4c7c7', fontSize: 9 }}
                          axisLine={false}
                          tickLine={false}
                          allowDecimals={false}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: '#1e2020',
                            border: '1px solid rgba(255,255,255,0.08)',
                            borderRadius: 12,
                            color: '#e2e2e2',
                            fontSize: 11,
                          }}
                        />
                        <Bar dataKey="count" name="Check-ins" fill="#9fcfd5" radius={[6, 6, 0, 0]} opacity={0.8} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <p className="text-on-surface-variant text-sm text-center py-12 opacity-50">
                      Sem dados de check-in nos últimos 14 dias.
                    </p>
                  )}
                </motion.div>

                {/* Sentiment Pie Chart */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.7 }}
                  className="lg:col-span-4 aetheric-glass rounded-3xl p-8"
                >
                  <h3 className="text-sm font-semibold uppercase tracking-[0.15em] text-on-surface-variant mb-8">
                    Distribuição de Sentimentos
                  </h3>
                  {metrics?.sentimentDistribution && metrics.sentimentDistribution.length > 0 ? (
                    <>
                      <ResponsiveContainer width="100%" height={140}>
                        <PieChart>
                          <Pie
                            data={metrics.sentimentDistribution}
                            dataKey="value"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            innerRadius={40}
                            outerRadius={65}
                            paddingAngle={3}
                          >
                            {metrics.sentimentDistribution.map((_, index) => (
                              <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} opacity={0.8} />
                            ))}
                          </Pie>
                          <Tooltip
                            contentStyle={{
                              backgroundColor: '#1e2020',
                              border: '1px solid rgba(255,255,255,0.08)',
                              borderRadius: 12,
                              color: '#e2e2e2',
                              fontSize: 11,
                            }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="flex flex-col gap-2 mt-4">
                        {metrics.sentimentDistribution.slice(0, 4).map((item, i) => (
                          <div key={item.name} className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                              <span className="text-[10px] text-on-surface-variant uppercase tracking-wide">{item.name}</span>
                            </div>
                            <span className="text-[10px] font-semibold text-on-surface">{item.value}</span>
                          </div>
                        ))}
                      </div>
                    </>
                  ) : (
                    <p className="text-on-surface-variant text-sm text-center py-12 opacity-50">
                      Dados insuficientes.
                    </p>
                  )}
                </motion.div>
              </div>

              {/* Privacy Notice */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.9 }}
                className="aetheric-glass rounded-2xl p-6 flex items-start gap-4"
              >
                <span className="material-symbols-outlined text-secondary flex-shrink-0 mt-0.5" style={{ fontVariationSettings: "'FILL' 1" }}>
                  shield
                </span>
                <div>
                  <h4 className="text-sm font-semibold text-secondary mb-1 uppercase tracking-[0.1em]">Privacidade Garantida</h4>
                  <p className="text-xs text-on-surface-variant opacity-60 leading-relaxed">
                    Este painel exibe exclusivamente indicadores agregados e anônimos. Nenhum conteúdo do Diário Emocional, nenhuma conversa com a IA e nenhuma informação pessoal identificável dos alunos é acessível aqui.
                  </p>
                </div>
              </motion.div>
            </div>
          )}
        </PageTransition>
      </main>
    </>
  );
}
