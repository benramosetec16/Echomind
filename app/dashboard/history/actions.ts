'use server'

import { createClient } from '../../../utils/supabase/server'
import Groq from 'groq-sdk'

export async function generateTemporalAnalysis(period: '7D' | '30D') {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { error: 'Usuário não autenticado' };

  // Fetch checkins for the period
  const dateLimit = new Date();
  if (period === '7D') {
    dateLimit.setDate(dateLimit.getDate() - 7);
  } else {
    dateLimit.setDate(dateLimit.getDate() - 30);
  }

  const { data: checkins, error: checkinsError } = await supabase
    .from('emotional_checkins')
    .select('id, valence_value, texture, thoughts, created_at')
    .eq('user_id', user.id)
    .gte('created_at', dateLimit.toISOString())
    .order('created_at', { ascending: true });

  if (checkinsError || !checkins || checkins.length === 0) {
    return { error: 'Dados insuficientes para gerar análise neste período.' };
  }

  // Calculate stats
  const totalCheckins = checkins.length;
  const avgValence = checkins.reduce((acc, curr) => acc + curr.valence_value, 0) / totalCheckins;
  
  // Find dominant texture
  const textureCounts = checkins.reduce((acc: any, curr) => {
    acc[curr.texture] = (acc[curr.texture] || 0) + 1;
    return acc;
  }, {});
  const dominantTexture = Object.keys(textureCounts).reduce((a, b) => textureCounts[a] > textureCounts[b] ? a : b, '');

  const checkinDataForPrompt = checkins.map(c => ({
    data: new Date(c.created_at).toLocaleDateString('pt-BR'),
    valencia: c.valence_value,
    textura: c.texture,
    pensamentos: c.thoughts || ''
  }));

  // Initialize Groq
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return { error: 'GROQ_API_KEY não configurada' };
  }

  const groq = new Groq({ apiKey });

  try {
    const prompt = `
      Você é a Inteligência Analítica do Echomind.
      Gere uma análise consolidada do período de ${period} do usuário.
      Aqui estão os dados dos check-ins (${totalCheckins} no total):
      ${JSON.stringify(checkinDataForPrompt)}

      Média de valência: ${avgValence.toFixed(1)}/100
      Textura dominante: ${dominantTexture}
      
      REGRAS OBRIGATÓRIAS:
      - Responda em português do Brasil.
      - Seja objetivo, profissional e clínico. SEM linguagem poética ou mística.
      - NÃO use palavras como "etérico", "aura", "ressonância cósmica".
      - Responda APENAS um JSON com o formato exato:
      {
        "ai_summary": "Resumo analítico sobre as tendências de humor e consistência emocional (máx 3 frases).",
        "ai_recommendations": "Duas ou três recomendações acionáveis para melhorar o bem-estar.",
        "dominant_sentiment": "Uma única palavra que descreve o sentimento dominante"
      }
    `;

    const chatCompletion = await groq.chat.completions.create({
      messages: [
        { role: 'system', content: 'You only reply in valid JSON.' },
        { role: 'user', content: prompt }
      ],
      model: 'llama-3.3-70b-versatile',
      temperature: 0.5,
      response_format: { type: 'json_object' }
    });

    const aiResponse = chatCompletion.choices[0]?.message?.content;
    if (!aiResponse) throw new Error('Falha ao obter resposta da IA');

    const result = JSON.parse(aiResponse);

    // Save temporal analysis
    const checkinIds = checkins.map(c => c.id);
    const { error: insertError } = await supabase.from('temporal_analyses').insert({
      user_id: user.id,
      period,
      total_checkins: totalCheckins,
      avg_valence: avgValence,
      dominant_texture: dominantTexture,
      dominant_sentiment: result.dominant_sentiment,
      ai_summary: result.ai_summary,
      ai_recommendations: result.ai_recommendations,
    });

    if (insertError) console.error('Erro ao salvar analise temporal:', insertError);

    // Save as a journal entry too
    const { error: journalError } = await supabase.from('aetheric_journal').insert({
      user_id: user.id,
      title: `Análise Final: ${period}`,
      sentiment_tag: result.dominant_sentiment || 'Consolidado',
      sentiment_dots: avgValence >= 80 ? 5 : avgValence >= 60 ? 4 : avgValence >= 40 ? 3 : avgValence >= 20 ? 2 : 1,
      icon: 'analytics'
    });

    if (journalError) console.error('Erro ao salvar no journal:', journalError);

    return { success: true, analysis: result };

  } catch (error: any) {
    console.error('Groq Error:', error);
    return { error: 'Falha ao processar análise consolidada.' };
  }
}
