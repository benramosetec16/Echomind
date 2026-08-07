import React from 'react';
import { Document, Page, Text, View, StyleSheet, Font } from '@react-pdf/renderer';

// Font registration for a more professional look
Font.register({
  family: 'Inter',
  fonts: [
    { src: 'https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfAZ9hjp-Ek-_EeA.woff' },
    { src: 'https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuI6fAZ9hjp-Ek-_EeA.woff', fontWeight: 700 }
  ]
});

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: 'Inter',
    backgroundColor: '#ffffff',
  },
  header: {
    marginBottom: 30,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    paddingBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 700,
    color: '#0f172a',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 12,
    color: '#64748b',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 700,
    color: '#334155',
    marginBottom: 12,
    backgroundColor: '#f8fafc',
    padding: 8,
    borderRadius: 4,
  },
  text: {
    fontSize: 11,
    color: '#475569',
    lineHeight: 1.6,
    marginBottom: 8,
  },
  listItem: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  bullet: {
    width: 10,
    fontSize: 11,
    color: '#475569',
  },
  itemText: {
    flex: 1,
    fontSize: 11,
    color: '#475569',
    lineHeight: 1.5,
  },
  alertBox: {
    padding: 12,
    borderRadius: 6,
    marginBottom: 16,
  },
  alertBoxCritico: { backgroundColor: '#fef2f2', borderLeftWidth: 4, borderLeftColor: '#ef4444' },
  alertBoxElevado: { backgroundColor: '#fff7ed', borderLeftWidth: 4, borderLeftColor: '#f97316' },
  alertBoxModerado: { backgroundColor: '#fefce8', borderLeftWidth: 4, borderLeftColor: '#eab308' },
  alertBoxBaixo: { backgroundColor: '#f0fdf4', borderLeftWidth: 4, borderLeftColor: '#22c55e' },
  alertText: { fontSize: 12, fontWeight: 700, color: '#0f172a' },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    textAlign: 'center',
    color: '#94a3b8',
    fontSize: 9,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingTop: 10,
  }
});

interface AIReportData {
  resumo_executivo: string;
  nivel_alerta_geral: string;
  pontos_positivos: string[];
  pontos_criticos: string[];
  areas_atencao: string[];
  recomendacoes_preventivas: string[];
  estrategias_institucionais: string[];
}

export const InstitutionalPDFReport = ({ data, institutionName }: { data: AIReportData, institutionName: string }) => {
  const getAlertStyle = (nivel: string) => {
    switch(nivel) {
      case 'Crítico': return styles.alertBoxCritico;
      case 'Elevado': return styles.alertBoxElevado;
      case 'Moderado': return styles.alertBoxModerado;
      default: return styles.alertBoxBaixo;
    }
  };

  const List = ({ items }: { items: string[] }) => (
    <View>
      {items.map((item, i) => (
        <View key={i} style={styles.listItem}>
          <Text style={styles.bullet}>•</Text>
          <Text style={styles.itemText}>{item}</Text>
        </View>
      ))}
    </View>
  );

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.title}>Relatório de Inteligência Institucional</Text>
          <Text style={styles.subtitle}>{institutionName} — Gerado em {new Date().toLocaleDateString('pt-BR')}</Text>
        </View>

        <View style={styles.section}>
          <View style={[styles.alertBox, getAlertStyle(data.nivel_alerta_geral)]}>
            <Text style={styles.alertText}>Nível de Alerta Geral: {data.nivel_alerta_geral}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Resumo Executivo</Text>
          <Text style={styles.text}>{data.resumo_executivo}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Pontos Positivos</Text>
          <List items={data.pontos_positivos || []} />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Pontos Críticos</Text>
          <List items={data.pontos_criticos || []} />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Áreas de Atenção</Text>
          <List items={data.areas_atencao || []} />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recomendações Preventivas</Text>
          <List items={data.recomendacoes_preventivas || []} />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Estratégias Institucionais</Text>
          <List items={data.estrategias_institucionais || []} />
        </View>

        <Text style={styles.footer} render={({ pageNumber, totalPages }) => (
          `EchoMind Analytics — Baseado em COPSOQ & NR-1 (Página ${pageNumber} de ${totalPages})`
        )} fixed />
      </Page>
    </Document>
  );
};
