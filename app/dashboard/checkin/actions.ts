'use server'

import { createClient } from '../../../utils/supabase/server'
import Groq from 'groq-sdk'

// Helper to calculate sentiment dots (1 to 5) based on valence (0 to 100)
function calculateDots(valence: number): number {
  if (valence < 20) return 1;
  if (valence < 40) return 2;
  if (valence < 60) return 3;
  if (valence < 80) return 4;
  return 5;
}

// Map texture to an icon for the journal
const textureToIcon: Record<string, string> = {
  focus: 'target',
  calm: 'air',
  anxiety: 'bolt',
  bloom: 'filter_vintage'
};

// Fallback titles and tags based on valence
function getFallbackMetadata(valence: number, texture: string) {
  let title = 'Registro Emocional';
  let tag = 'Equilíbrio';
  if (valence < 25) {
    title = 'Vórtice de Discórdia';
    tag = 'Turbulência';
  } else if (valence < 45) {
    title = 'Deriva Melancólica';
    tag = 'Instabilidade';
  } else if (valence < 75) {
    title = 'Equilíbrio Neural';
    tag = 'Serenidade';
  } else {
    title = 'Clareza Luminosa';
    tag = 'Harmonia';
  }
  return { title, tag };
}

export async function transmitAura(payload: { valenceValue: number; texture: string; thoughts: string }): Promise<{ success?: boolean; insight?: string; error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let aiResult = {
    insight: `Ressonância de ${payload.valenceValue}% registrada com sucesso.`,
    journalTitle: getFallbackMetadata(payload.valenceValue, payload.texture).title,
    journalTag: getFallbackMetadata(payload.valenceValue, payload.texture).tag
  };

  // 1. Try Groq AI analysis if API key exists
  const apiKey = process.env.GROQ_API_KEY;
  if (apiKey) {
    try {
      const groq = new Groq({ apiKey });
      const prompt = `
        You are the Analytical Intelligence of Echomind, a pragmatic emotional tracking system.
        The user just checked in with the following aura:
        - Valence (0 to 100): ${payload.valenceValue}
        - Texture: ${payload.texture}
        - Thoughts: "${payload.thoughts || 'Silent transmission'}"
        
        Gere uma análise objetiva, direta e analítica (máximo de 2 frases) refletindo o estado atual do usuário. Não seja poético. Seja prático. Em português do Brasil.
        Também gere um título curto e objetivo (máximo 4 palavras) e uma tag de sentimento de uma única palavra. Em português do Brasil.
        
        Responda APENAS com um objeto JSON válido neste formato:
        {
          "insight": "Sua reflexão objetiva aqui.",
          "journalTitle": "Título aqui",
          "journalTag": "TagAqui"
        }
      `;

      const chatCompletion = await groq.chat.completions.create({
        messages: [
          { role: 'system', content: 'You only reply in valid JSON.' },
          { role: 'user', content: prompt }
        ],
        model: 'llama-3.3-70b-versatile',
        temperature: 0.7,
        response_format: { type: 'json_object' }
      });

      const aiResponse = chatCompletion.choices[0]?.message?.content;
      if (aiResponse) {
        const parsed = JSON.parse(aiResponse);
        if (parsed.insight) aiResult.insight = parsed.insight;
        if (parsed.journalTitle) aiResult.journalTitle = parsed.journalTitle;
        if (parsed.journalTag) aiResult.journalTag = parsed.journalTag;
      }
    } catch (aiErr) {
      console.warn('Groq AI call failed or timed out, using fallback metadata:', aiErr);
    }
  }

  // 2. ALWAYS Save to Supabase (Journal & Checkin & Biometric Logs must NEVER fail)
  if (user) {
    // ENSURE PROFILE EXISTS (Bypass RLS for legacy users missing a profile)
    const { createAdminClient } = await import('../../../utils/supabase/admin');
    const adminAuth = createAdminClient();
    const { data: profileExists } = await adminAuth.from('profiles').select('id').eq('id', user.id).maybeSingle();
    
    if (!profileExists) {
        await adminAuth.from('profiles').insert({
             id: user.id,
             full_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Viajante',
             role: 'aluno'
        });
    }

    // Save check-in
    const { error: checkinError } = await supabase.from('emotional_checkins').insert({
      user_id: user.id,
      valence_value: payload.valenceValue,
      texture: payload.texture,
      thoughts: payload.thoughts
    });

    if (checkinError) return { error: `Erro Check-in DB: ${checkinError.message}` };

    // Save to journal
    const { error: journalError } = await supabase.from('aetheric_journal').insert({
      user_id: user.id,
      title: aiResult.journalTitle,
      sentiment_tag: aiResult.journalTag,
      sentiment_dots: calculateDots(payload.valenceValue),
      icon: textureToIcon[payload.texture] || 'auto_awesome'
    });

    if (journalError) return { error: `Erro Journal DB: ${journalError.message}` };

    // Save Biometric Log based on valence
    let logType = 'normal';
    let nomenclature = aiResult.journalTitle;
    let bpm = 70;

    if (payload.valenceValue < 25) {
      logType = 'critical';
      bpm = 92;
    } else if (payload.valenceValue < 45) {
      logType = 'warning';
      bpm = 84;
    } else if (payload.valenceValue < 75) {
      logType = 'normal';
      bpm = 70;
    } else if (payload.valenceValue < 90) {
      logType = 'info';
      bpm = 60;
    } else {
      logType = 'info';
      bpm = 55;
    }
    
    const { error: biometricError } = await supabase.from('biometric_logs').insert({
      user_id: user.id,
      title: nomenclature,
      description: aiResult.insight,
      type: logType,
      bpm: bpm
    });
    
    if (biometricError) console.error('Error saving biometric log:', biometricError);
  }

  return { success: true, insight: aiResult.insight };
}

export async function verifyAndRestoreProfile() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false };

  const { createAdminClient } = await import('../../../utils/supabase/admin');
  const adminAuth = createAdminClient();
  const { data: profileExists } = await adminAuth.from('profiles').select('id').eq('id', user.id).maybeSingle();
  
  if (!profileExists) {
      await adminAuth.from('profiles').insert({
           id: user.id,
           full_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Viajante',
           role: 'aluno'
      });
  }
  return { success: true };
}
