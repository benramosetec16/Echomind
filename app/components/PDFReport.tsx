import React from 'react';
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: 'Helvetica',
    backgroundColor: '#ffffff',
  },
  header: {
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    paddingBottom: 15,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#0f172a',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 11,
    color: '#64748b',
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#334155',
    marginBottom: 10,
    backgroundColor: '#f8fafc',
    padding: 6,
    borderRadius: 4,
  },
  text: {
    fontSize: 10,
    color: '#475569',
    lineHeight: 1.5,
    marginBottom: 6,
  },
  listItem: {
    flexDirection: 'row',
    marginBottom: 5,
  },
  bullet: {
    width: 10,
    fontSize: 10,
    color: '#475569',
  },
  itemText: {
    flex: 1,
    fontSize: 10,
    color: '#475569',
    lineHeight: 1.4,
  },
  alertBox: {
    padding: 10,
    borderRadius: 6,
    marginBottom: 14,
  },
  alertBoxCritico: { backgroundColor: '#fef2f2', borderLeftWidth: 4, borderLeftColor: '#ef4444' },
  alertBoxElevado: { backgroundColor: '#fff7ed', borderLeftWidth: 4, borderLeftColor: '#f97316' },
  alertBoxModerado: { backgroundColor: '#fefce8', borderLeftWidth: 4, borderLeftColor: '#eab308' },
  alertBoxBaixo: { backgroundColor: '#f0fdf4', borderLeftWidth: 4, borderLeftColor: '#22c55e' },
  alertText: { fontSize: 11, fontWeight: 'bold', color: '#0f172a' },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 15,
    marginHorizontal: -4,
  },
  col4: {
    width: '25%',
    paddingHorizontal: 4,
  },
  card: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 6,
    padding: 10,
    alignItems: 'center',
  },
  cardLabel: {
    fontSize: 8,
    color: '#64748b',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  cardVal: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  table: {
    marginVertical: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 6,
    overflow: 'hidden',
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f1f5f9',
    borderBottomWidth: 1,
    borderBottomColor: '#cbd5e1',
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    paddingVertical: 6,
    paddingHorizontal: 8,
    alignItems: 'center',
  },
  tableColHeader: {
    fontSize: 8,
    fontWeight: 'bold',
    color: '#475569',
    textTransform: 'uppercase',
  },
  tableCell: {
    fontSize: 9,
    color: '#334155',
  },
  footer: {
    position: 'absolute',
    bottom: 25,
    left: 40,
    right: 40,
    textAlign: 'center',
    color: '#94a3b8',
    fontSize: 8,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingTop: 8,
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
      {(items || []).map((item, i) => (
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
          <Text style={styles.subtitle}>{institutionName || 'Instituição'} — Gerado em {new Date().toLocaleDateString('pt-BR')}</Text>
        </View>

        <View style={styles.section}>
          <View style={[styles.alertBox, getAlertStyle(data?.nivel_alerta_geral || 'Baixo')]}>
            <Text style={styles.alertText}>Nível de Alerta Geral: {data?.nivel_alerta_geral || 'Baixo'}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Resumo Executivo</Text>
          <Text style={styles.text}>{data?.resumo_executivo || 'Sem resumo disponível.'}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Pontos Positivos</Text>
          <List items={data?.pontos_positivos || []} />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Pontos Críticos</Text>
          <List items={data?.pontos_criticos || []} />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Áreas de Atenção</Text>
          <List items={data?.areas_atencao || []} />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recomendações Preventivas</Text>
          <List items={data?.recomendacoes_preventivas || []} />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Estratégias Institucionais</Text>
          <List items={data?.estrategias_institucionais || []} />
        </View>

        <Text style={styles.footer} render={({ pageNumber, totalPages }) => (
          `EchoMind Analytics — Baseado em COPSOQ & NR-1 (Página ${pageNumber} de ${totalPages})`
        )} fixed />
      </Page>
    </Document>
  );
};

interface OrientadorReportData {
  orientadorName: string;
  dateStr: string;
  version: string;
  stats: {
    totalStudents: number;
    criticosCount: number;
    moderadosCount: number;
    observacaoCount: number;
    interventionsCount: number;
  };
  studentWatchlist: Array<{
    name: string;
    room: string;
    riskLevel: string;
    moodAvg: number;
    checkinCount: number;
    guardianName: string;
    guardianPhone: string;
  }>;
  interventions: Array<{
    title: string;
    description: string;
    status: string;
    date: string;
  }>;
  aiSummary: {
    executiveSummary: string;
    recommendations: string[];
  };
}

export const OrientadorPDFReport = ({ data }: { data: OrientadorReportData }) => {
  const List = ({ items }: { items: string[] }) => (
    <View>
      {(items || []).map((item, i) => (
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
          <Text style={styles.title}>Relatório de Acompanhamento Emocional</Text>
          <Text style={styles.subtitle}>Orientador: {data?.orientadorName || 'Orientador'} — {data?.dateStr || ''}</Text>
        </View>

        {/* Metrics Grid */}
        <View style={styles.grid}>
          <View style={styles.col4}>
            <View style={styles.card}>
              <Text style={styles.cardLabel}>Alunos</Text>
              <Text style={styles.cardVal}>{data?.stats?.totalStudents || 0}</Text>
            </View>
          </View>
          <View style={styles.col4}>
            <View style={styles.card}>
              <Text style={styles.cardLabel}>Risco Crítico</Text>
              <Text style={[styles.cardVal, { color: '#ef4444' }]}>{data?.stats?.criticosCount || 0}</Text>
            </View>
          </View>
          <View style={styles.col4}>
            <View style={styles.card}>
              <Text style={styles.cardLabel}>Moderado</Text>
              <Text style={[styles.cardVal, { color: '#eab308' }]}>{data?.stats?.moderadosCount || 0}</Text>
            </View>
          </View>
          <View style={styles.col4}>
            <View style={styles.card}>
              <Text style={styles.cardLabel}>Intervenções</Text>
              <Text style={[styles.cardVal, { color: '#3b82f6' }]}>{data?.stats?.interventionsCount || 0}</Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Síntese de Orientação Psicopedagógica</Text>
          <Text style={styles.text}>{data?.aiSummary?.executiveSummary || 'Sem resumo de orientação disponível.'}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Lista de Observação de Alunos</Text>
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <View style={{ width: '30%' }}><Text style={styles.tableColHeader}>Aluno</Text></View>
              <View style={{ width: '25%' }}><Text style={styles.tableColHeader}>Turma</Text></View>
              <View style={{ width: '20%' }}><Text style={styles.tableColHeader}>Nível Risco</Text></View>
              <View style={{ width: '25%' }}><Text style={styles.tableColHeader}>Humor Médio</Text></View>
            </View>
            {(data?.studentWatchlist || []).slice(0, 12).map((s, idx) => (
              <View style={styles.tableRow} key={idx}>
                <View style={{ width: '30%' }}><Text style={styles.tableCell}>{s.name}</Text></View>
                <View style={{ width: '25%' }}><Text style={styles.tableCell}>{s.room}</Text></View>
                <View style={{ width: '20%' }}>
                  <Text style={[styles.tableCell, { fontWeight: 'bold', color: s.riskLevel === 'Crítico' ? '#ef4444' : s.riskLevel === 'Moderado' ? '#eab308' : '#22c55e' }]}>
                    {s.riskLevel}
                  </Text>
                </View>
                <View style={{ width: '25%' }}><Text style={styles.tableCell}>{s.moodAvg}%</Text></View>
              </View>
            ))}
            {(data?.studentWatchlist || []).length === 0 && (
              <View style={{ padding: 10, alignItems: 'center' }}>
                <Text style={styles.text}>Nenhum aluno sob observação.</Text>
              </View>
            )}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Intervenções Registradas</Text>
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <View style={{ width: '25%' }}><Text style={styles.tableColHeader}>Título</Text></View>
              <View style={{ width: '45%' }}><Text style={styles.tableColHeader}>Descrição</Text></View>
              <View style={{ width: '15%' }}><Text style={styles.tableColHeader}>Status</Text></View>
              <View style={{ width: '15%' }}><Text style={styles.tableColHeader}>Data</Text></View>
            </View>
            {(data?.interventions || []).slice(0, 8).map((interv, idx) => (
              <View style={styles.tableRow} key={idx}>
                <View style={{ width: '25%' }}><Text style={styles.tableCell}>{interv.title}</Text></View>
                <View style={{ width: '45%' }}><Text style={styles.tableCell}>{interv.description}</Text></View>
                <View style={{ width: '15%' }}><Text style={styles.tableCell}>{interv.status}</Text></View>
                <View style={{ width: '15%' }}><Text style={styles.tableCell}>{interv.date}</Text></View>
              </View>
            ))}
            {(data?.interventions || []).length === 0 && (
              <View style={{ padding: 10, alignItems: 'center' }}>
                <Text style={styles.text}>Nenhuma intervenção registrada.</Text>
              </View>
            )}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recomendações Práticas</Text>
          <List items={data?.aiSummary?.recommendations || []} />
        </View>

        <Text style={styles.footer} render={({ pageNumber, totalPages }) => (
          `EchoMind Orientação — Documento Interno (Página ${pageNumber} de ${totalPages})`
        )} fixed />
      </Page>
    </Document>
  );
};
