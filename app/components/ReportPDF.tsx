'use client';

import React from 'react';
import { Document, Page, Text, View, StyleSheet, Svg, Path, Line, Circle } from '@react-pdf/renderer';

// Register a clean font if needed, or use default Helvetica/Courier/Times-Roman
// React-PDF comes with Helvetica, Helvetica-Bold, Helvetica-Oblique, Helvetica-BoldOblique pre-registered.

const styles = StyleSheet.create({
  page: {
    backgroundColor: '#121414',
    color: '#e2e2e2',
    fontFamily: 'Helvetica',
    paddingTop: 60,
    paddingBottom: 70,
    paddingHorizontal: 50,
  },
  // Capa Styles
  coverPage: {
    backgroundColor: '#121414',
    color: '#e2e2e2',
    fontFamily: 'Helvetica',
    padding: 60,
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
  },
  coverHeader: {
    marginTop: 40,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  logoIcon: {
    width: 24,
    height: 24,
    backgroundColor: '#9fcfd5',
    borderRadius: 6,
    marginRight: 10,
  },
  logoText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#9fcfd5',
    letterSpacing: 2,
  },
  coverTitleContainer: {
    marginTop: 100,
  },
  coverSubtitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#9fcfd5',
    letterSpacing: 3,
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  coverTitle: {
    fontSize: 42,
    fontWeight: 'normal',
    color: '#e2e2e2',
    lineHeight: 1.1,
    letterSpacing: -1,
  },
  coverFooter: {
    marginBottom: 40,
    borderTop: '1px solid rgba(255, 255, 255, 0.08)',
    paddingTop: 20,
  },
  coverMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  coverMetaLabel: {
    fontSize: 10,
    color: '#c4c7c7',
    opacity: 0.6,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  coverMetaValue: {
    fontSize: 10,
    color: '#e2e2e2',
    fontWeight: 'bold',
  },

  // Document Structure Styles
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
    paddingBottom: 15,
    marginBottom: 30,
  },
  headerLeft: {
    fontSize: 10,
    color: '#9fcfd5',
    fontWeight: 'bold',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  headerRight: {
    fontSize: 8,
    color: '#c4c7c7',
    opacity: 0.6,
  },
  title: {
    fontSize: 24,
    fontWeight: 'normal',
    color: '#e2e2e2',
    marginBottom: 20,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#cebdff',
    marginTop: 20,
    marginBottom: 10,
  },
  paragraph: {
    fontSize: 10,
    lineHeight: 1.6,
    color: '#c4c7c7',
    marginBottom: 15,
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 50,
    right: 50,
    borderTop: '1px solid rgba(255, 255, 255, 0.05)',
    paddingTop: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  footerText: {
    fontSize: 8,
    color: '#c4c7c7',
    opacity: 0.4,
  },

  // Index / Sumário
  indexContainer: {
    marginVertical: 40,
  },
  indexItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 8,
    borderBottom: '1px dotted rgba(255, 255, 255, 0.1)',
    paddingBottom: 4,
  },
  indexLabel: {
    fontSize: 11,
    color: '#e2e2e2',
  },
  indexPage: {
    fontSize: 11,
    color: '#9fcfd5',
    fontWeight: 'bold',
  },

  // Grid and Cards
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -6,
    marginBottom: 20,
  },
  col6: {
    width: '50%',
    paddingHorizontal: 6,
    marginBottom: 12,
  },
  card: {
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    border: '1px solid rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 15,
  },
  cardTitle: {
    fontSize: 9,
    color: '#c4c7c7',
    opacity: 0.6,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 6,
  },
  cardValue: {
    fontSize: 18,
    color: '#e2e2e2',
    fontWeight: 'normal',
  },
  cardLabel: {
    fontSize: 9,
    color: '#9fcfd5',
    marginTop: 4,
  },

  // Tables
  table: {
    marginVertical: 15,
    border: '1px solid rgba(255, 255, 255, 0.05)',
    borderRadius: 8,
    overflow: 'hidden',
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottom: '1px solid rgba(255, 255, 255, 0.03)',
    paddingVertical: 8,
    paddingHorizontal: 12,
    alignItems: 'center',
  },
  tableColHeader: {
    fontSize: 8,
    fontWeight: 'bold',
    color: '#c4c7c7',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  tableCell: {
    fontSize: 9,
    color: '#e2e2e2',
  },
  tableCellSub: {
    fontSize: 8,
    color: '#c4c7c7',
    opacity: 0.6,
  },

  // Badges
  badge: {
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 4,
    fontSize: 7,
    textTransform: 'uppercase',
    fontWeight: 'bold',
  },
  badgeSerenity: {
    backgroundColor: 'rgba(159, 207, 213, 0.1)',
    color: '#9fcfd5',
    border: '1px solid rgba(159, 207, 213, 0.2)',
  },
  badgeTurbulence: {
    backgroundColor: 'rgba(255, 180, 171, 0.1)',
    color: '#ffb4ab',
    border: '1px solid rgba(255, 180, 171, 0.2)',
  },
  badgeDefault: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    color: '#c4c7c7',
    border: '1px solid rgba(255, 255, 255, 0.1)',
  },

  // Alert Box
  alertBox: {
    backgroundColor: 'rgba(255, 180, 171, 0.04)',
    border: '1px solid rgba(255, 180, 171, 0.15)',
    borderRadius: 12,
    padding: 15,
    marginVertical: 15,
  },
  alertTitle: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#ffb4ab',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 4,
  },
  alertText: {
    fontSize: 9,
    color: '#ffb4ab',
    opacity: 0.9,
    lineHeight: 1.5,
  },

  // Disclaimer / Observações
  disclaimer: {
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    border: '1px solid rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 20,
    marginTop: 40,
  },
  disclaimerTitle: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#c4c7c7',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
  },
  disclaimerText: {
    fontSize: 8,
    color: '#c4c7c7',
    opacity: 0.5,
    lineHeight: 1.6,
  },
});

interface ReportPDFProps {
  userName: string;
  dateStr: string;
  version: string;
  summary: {
    checkinsCount: number;
    predominantMood: string;
    avgSleep: string;
    avgHeartRate: number;
    avgEnergy: number;
    periodStr: string;
  };
  journalEntries: Array<{
    id: string;
    created_at: string;
    title: string;
    sentiment_tag: string;
    sentiment_dots: number;
    insight?: string;
  }>;
  biometricLogs: Array<{
    id: string;
    created_at: string;
    title: string;
    description: string;
    type: string;
    bpm: number | null;
  }>;
  aiInsights: {
    summaryText: string;
    patterns: string[];
    recommendations: string[];
    alerts: string[];
  };
  chartsData: {
    moodHistory: number[];
    sleepHistory: number[];
    energyHistory: number[];
    bpmHistory: number[];
  };
}

export default function ReportPDF({
  userName,
  dateStr,
  version,
  summary,
  journalEntries,
  biometricLogs,
  aiInsights,
  chartsData,
}: ReportPDFProps) {
  // Helpers
  const getBadgeStyle = (tag: string) => {
    const t = tag.toLowerCase();
    if (t.includes('seren') || t.includes('calm') || t.includes('peace') || t.includes('paz') || t.includes('tranquil')) {
      return styles.badgeSerenity;
    }
    if (t.includes('turbul') || t.includes('anx') || t.includes('stress') || t.includes('ansie') || t.includes('tenso')) {
      return styles.badgeTurbulence;
    }
    return styles.badgeDefault;
  };

  const formatDate = (dateString: string) => {
    try {
      const d = new Date(dateString);
      return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' }) + ' ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    } catch {
      return dateString;
    }
  };

  // Render dynamic SVG chart helper
  const renderLineChart = (data: number[], color: string, height: number = 60, width: number = 220) => {
    if (!data || data.length < 2) return null;
    const padding = 5;
    const chartHeight = height - 2 * padding;
    const chartWidth = width - 2 * padding;
    const minVal = Math.min(...data);
    const maxVal = Math.max(...data);
    const valRange = maxVal - minVal === 0 ? 1 : maxVal - minVal;

    const stepX = chartWidth / (data.length - 1);
    const points: string[] = [];

    data.forEach((val, idx) => {
      const x = padding + idx * stepX;
      const y = padding + chartHeight - ((val - minVal) / valRange) * chartHeight;
      points.push(`${x},${y}`);
    });

    const pathD = `M ${points.join(' L ')}`;

    return (
      <Svg height={height} width={width}>
        {/* Grid lines */}
        <Line x1={padding} y1={padding} x2={width - padding} y2={padding} stroke="rgba(255,255,255,0.05)" strokeWidth={1} />
        <Line x1={padding} y1={height / 2} x2={width - padding} y2={height / 2} stroke="rgba(255,255,255,0.03)" strokeWidth={1} />
        <Line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="rgba(255,255,255,0.05)" strokeWidth={1} />
        
        {/* Data Path */}
        <Path d={pathD} fill="none" stroke={color} strokeWidth={1.5} />

        {/* Data Points */}
        {points.map((p, i) => {
          const coords = p.split(',');
          return (
            <Circle key={i} cx={parseFloat(coords[0])} cy={parseFloat(coords[1])} r={2} fill={color} />
          );
        })}
      </Svg>
    );
  };

  return (
    <Document>
      {/* 1. CAPA */}
      <Page size="A4" style={styles.coverPage}>
        <View style={styles.coverHeader}>
          <View style={styles.logoContainer}>
            <View style={styles.logoIcon} />
            <Text style={styles.logoText}>EchoMind</Text>
          </View>
        </View>

        <View style={styles.coverTitleContainer}>
          <Text style={styles.coverSubtitle}>Relatório Institucional</Text>
          <Text style={styles.coverTitle}>Relatório de Bem-Estar</Text>
        </View>

        <View style={styles.coverFooter}>
          <View style={styles.coverMetaRow}>
            <Text style={styles.coverMetaLabel}>Emitido Para</Text>
            <Text style={styles.coverMetaValue}>{userName}</Text>
          </View>
          <View style={styles.coverMetaRow}>
            <Text style={styles.coverMetaLabel}>Data de Emissão</Text>
            <Text style={styles.coverMetaValue}>{dateStr}</Text>
          </View>
          <View style={styles.coverMetaRow}>
            <Text style={styles.coverMetaLabel}>Versão</Text>
            <Text style={styles.coverMetaValue}>{version}</Text>
          </View>
        </View>
      </Page>

      {/* 2. SUMÁRIO E RESUMO GERAL */}
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerLeft}>EchoMind</Text>
          <Text style={styles.headerRight}>{dateStr} • Versão {version}</Text>
        </View>

        <Text style={styles.title}>Sumário</Text>
        
        <View style={styles.indexContainer}>
          <View style={styles.indexItem}>
            <Text style={styles.indexLabel}>Resumo Geral</Text>
            <Text style={styles.indexPage}>Pág. 2</Text>
          </View>
          <View style={styles.indexItem}>
            <Text style={styles.indexLabel}>Histórico Emocional</Text>
            <Text style={styles.indexPage}>Pág. 3</Text>
          </View>
          <View style={styles.indexItem}>
            <Text style={styles.indexLabel}>Histórico Biométrico & Gráficos</Text>
            <Text style={styles.indexPage}>Pág. 4</Text>
          </View>
          <View style={styles.indexItem}>
            <Text style={styles.indexLabel}>Insights da IA & Recomendações</Text>
            <Text style={styles.indexPage}>Pág. 5</Text>
          </View>
          <View style={styles.indexItem}>
            <Text style={styles.indexLabel}>Observações & Isenção</Text>
            <Text style={styles.indexPage}>Pág. 5</Text>
          </View>
        </View>

        <Text style={[styles.title, { marginTop: 30 }]}>Resumo Geral</Text>
        <Text style={styles.paragraph}>
          Análise agregada correspondente ao período de {summary.periodStr}. Os indicadores abaixo refletem a consistência e a variação da ressonância emocional e física coletadas.
        </Text>

        <View style={styles.grid}>
          {/* Card 1 */}
          <View style={styles.col6}>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Total de Check-ins</Text>
              <Text style={styles.cardValue}>{summary.checkinsCount}</Text>
              <Text style={styles.cardLabel}>Sinalizações ativas</Text>
            </View>
          </View>
          
          {/* Card 2 */}
          <View style={styles.col6}>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Humor Predominante</Text>
              <Text style={styles.cardValue}>{summary.predominantMood}</Text>
              <Text style={styles.cardLabel}>Valência dominante</Text>
            </View>
          </View>

          {/* Card 3 */}
          <View style={styles.col6}>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Média de Sono</Text>
              <Text style={styles.cardValue}>{summary.avgSleep}</Text>
              <Text style={styles.cardLabel}>Qualidade regenerativa</Text>
            </View>
          </View>

          {/* Card 4 */}
          <View style={styles.col6}>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Frequência Cardíaca</Text>
              <Text style={styles.cardValue}>{summary.avgHeartRate} BPM</Text>
              <Text style={styles.cardLabel}>Ritmo basal médio</Text>
            </View>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>EchoMind v{version}</Text>
          <Text style={styles.footerText}>Página 2</Text>
        </View>
      </Page>

      {/* 3. HISTÓRICO EMOCIONAL */}
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerLeft}>EchoMind</Text>
          <Text style={styles.headerRight}>{dateStr} • Versão {version}</Text>
        </View>

        <Text style={styles.title}>Histórico Emocional</Text>
        <Text style={styles.paragraph}>
          Registros consolidados extraídos diretamente da atmosfera emocional e do diário neural do usuário.
        </Text>

        <View style={styles.table}>
          {/* Table Header */}
          <View style={styles.tableHeader}>
            <View style={{ width: '25%' }}><Text style={styles.tableColHeader}>Data/Hora</Text></View>
            <View style={{ width: '20%' }}><Text style={styles.tableColHeader}>Emoção</Text></View>
            <View style={{ width: '15%' }}><Text style={styles.tableColHeader}>Valência</Text></View>
            <View style={{ width: '40%' }}><Text style={styles.tableColHeader}>Resumo de IA</Text></View>
          </View>

          {/* Table Rows */}
          {journalEntries.slice(0, 10).map((entry, idx) => (
            <View style={styles.tableRow} key={entry.id || idx}>
              <View style={{ width: '25%' }}><Text style={styles.tableCell}>{formatDate(entry.created_at)}</Text></View>
              <View style={{ width: '20%' }}>
                <Text style={[styles.badge, getBadgeStyle(entry.sentiment_tag)]}>
                  {entry.sentiment_tag}
                </Text>
              </View>
              <View style={{ width: '15%' }}>
                <Text style={styles.tableCell}>{entry.sentiment_dots}/5</Text>
              </View>
              <View style={{ width: '40%' }}>
                <Text style={styles.tableCellSub}>{entry.title}</Text>
              </View>
            </View>
          ))}

          {journalEntries.length === 0 && (
            <View style={{ padding: 20, alignItems: 'center' }}>
              <Text style={styles.tableCellSub}>Nenhum registro emocional disponível no período.</Text>
            </View>
          )}
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>EchoMind v{version}</Text>
          <Text style={styles.footerText}>Página 3</Text>
        </View>
      </Page>

      {/* 4. HISTÓRICO BIOMÉTRICO & GRÁFICOS */}
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerLeft}>EchoMind</Text>
          <Text style={styles.headerRight}>{dateStr} • Versão {version}</Text>
        </View>

        <Text style={styles.title}>Histórico Biométrico & Tendências</Text>
        <Text style={styles.paragraph}>
          Análise gráfica e log de diagnóstico da interface biossincrônica. Representações visuais das tendências cognitivas e metabólicas ao longo do tempo.
        </Text>

        <View style={[styles.grid, { marginBottom: 30 }]}>
          {/* Chart 1: Humor */}
          <View style={styles.col6}>
            <View style={[styles.card, { alignItems: 'center' }]}>
              <Text style={[styles.cardTitle, { marginBottom: 12 }]}>Evolução de Humor (Estabilidade)</Text>
              {chartsData.moodHistory.length >= 2 ? (
                renderLineChart(chartsData.moodHistory, '#9fcfd5')
              ) : (
                <Text style={styles.tableCellSub}>Dados insuficientes</Text>
              )}
            </View>
          </View>

          {/* Chart 2: Sono */}
          <View style={styles.col6}>
            <View style={[styles.card, { alignItems: 'center' }]}>
              <Text style={[styles.cardTitle, { marginBottom: 12 }]}>Ciclo e Horas de Sono</Text>
              {chartsData.sleepHistory.length >= 2 ? (
                renderLineChart(chartsData.sleepHistory, '#cebdff')
              ) : (
                <Text style={styles.tableCellSub}>Dados insuficientes</Text>
              )}
            </View>
          </View>

          {/* Chart 3: Energia */}
          <View style={styles.col6}>
            <View style={[styles.card, { alignItems: 'center' }]}>
              <Text style={[styles.cardTitle, { marginBottom: 12 }]}>Rendimento Energético</Text>
              {chartsData.energyHistory.length >= 2 ? (
                renderLineChart(chartsData.energyHistory, '#e5e2e1')
              ) : (
                <Text style={styles.tableCellSub}>Dados insuficientes</Text>
              )}
            </View>
          </View>

          {/* Chart 4: BPM */}
          <View style={styles.col6}>
            <View style={[styles.card, { alignItems: 'center' }]}>
              <Text style={[styles.cardTitle, { marginBottom: 12 }]}>Frequência Cardíaca (Estresse)</Text>
              {chartsData.bpmHistory.length >= 2 ? (
                renderLineChart(chartsData.bpmHistory, '#ffb4ab')
              ) : (
                <Text style={styles.tableCellSub}>Dados insuficientes</Text>
              )}
            </View>
          </View>
        </View>

        <Text style={styles.subtitle}>Alertas de Diagnóstico Recentes</Text>
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <View style={{ width: '20%' }}><Text style={styles.tableColHeader}>Hora</Text></View>
            <View style={{ width: '15%' }}><Text style={styles.tableColHeader}>Tipo</Text></View>
            <View style={{ width: '30%' }}><Text style={styles.tableColHeader}>Alerta</Text></View>
            <View style={{ width: '35%' }}><Text style={styles.tableColHeader}>Diagnóstico</Text></View>
          </View>

          {biometricLogs.slice(0, 4).map((log, idx) => (
            <View style={styles.tableRow} key={log.id || idx}>
              <View style={{ width: '20%' }}><Text style={styles.tableCell}>{formatDate(log.created_at)}</Text></View>
              <View style={{ width: '15%' }}>
                <Text style={[styles.badge, log.type === 'critical' ? styles.badgeTurbulence : styles.badgeDefault]}>
                  {log.type}
                </Text>
              </View>
              <View style={{ width: '30%' }}><Text style={styles.tableCell}>{log.title}</Text></View>
              <View style={{ width: '35%' }}><Text style={styles.tableCellSub}>{log.description}</Text></View>
            </View>
          ))}

          {biometricLogs.length === 0 && (
            <View style={{ padding: 20, alignItems: 'center' }}>
              <Text style={styles.tableCellSub}>Nenhum alerta crítico registrado nas últimas 24 horas.</Text>
            </View>
          )}
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>EchoMind v{version}</Text>
          <Text style={styles.footerText}>Página 4</Text>
        </View>
      </Page>

      {/* 5. INSIGHTS DE IA, RECOMENDAÇÕES E OBSERVAÇÕES */}
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerLeft}>EchoMind</Text>
          <Text style={styles.headerRight}>{dateStr} • Versão {version}</Text>
        </View>

        <Text style={styles.title}>Insights & Recomendações de IA</Text>
        
        <Text style={styles.subtitle}>Resumo dos Padrões Identificados</Text>
        <Text style={styles.paragraph}>
          {aiInsights.summaryText || 'Os insights gerados pela inteligência cognitiva do EchoMind apontam para uma ressonância emocional contínua e equilibrada.'}
        </Text>

        {aiInsights.patterns && aiInsights.patterns.length > 0 && (
          <View style={{ marginBottom: 15 }}>
            <Text style={[styles.subtitle, { color: '#9fcfd5', marginTop: 10 }]}>Padrões Encontrados</Text>
            {aiInsights.patterns.map((pattern, i) => (
              <Text key={i} style={[styles.paragraph, { marginBottom: 6, paddingLeft: 10 }]}>
                • {pattern}
              </Text>
            ))}
          </View>
        )}

        {aiInsights.recommendations && aiInsights.recommendations.length > 0 && (
          <View style={{ marginBottom: 15 }}>
            <Text style={[styles.subtitle, { color: '#cebdff', marginTop: 10 }]}>Recomendações Práticas</Text>
            {aiInsights.recommendations.map((rec, i) => (
              <Text key={i} style={[styles.paragraph, { marginBottom: 6, paddingLeft: 10 }]}>
                • {rec}
              </Text>
            ))}
          </View>
        )}

        {aiInsights.alerts && aiInsights.alerts.length > 0 && (
          <View style={styles.alertBox}>
            <Text style={styles.alertTitle}>Alertas Ativos no Período</Text>
            {aiInsights.alerts.map((alert, i) => (
              <Text key={i} style={styles.alertText}>
                ⚠️ {alert}
              </Text>
            ))}
          </View>
        )}

        {/* Disclaimer / Observações */}
        <View style={styles.disclaimer}>
          <Text style={styles.disclaimerTitle}>Observações</Text>
          <Text style={styles.disclaimerText}>
            Este relatório possui finalidade exclusivamente informativa e educacional. As análises apresentadas foram geradas com auxílio de inteligência artificial e não substituem avaliação, diagnóstico ou acompanhamento realizado por profissionais qualificados.
          </Text>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>EchoMind v{version}</Text>
          <Text style={styles.footerText}>Página 5</Text>
        </View>
      </Page>
    </Document>
  );
}
