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

export async function transmitAura(payload: { valenceValue: number; texture: string; thoughts: string }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Initialize Groq
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return { error: 'GROQ_API_KEY is not configured in .env.local.' };
  }

  const groq = new Groq({ apiKey });

  try {
    // 1. Call Groq AI for an Aetheric Insight
    const prompt = `
      You are the Aetheric Intelligence of Echomind, a futuristic emotional tracking system.
      The user just checked in with the following aura:
      - Valence (0 to 100): ${payload.valenceValue}
      - Texture: ${payload.texture}
      - Thoughts: "${payload.thoughts || 'Silent transmission'}"
      
      Generate a poetic, brief (2 sentences max) insight reflecting their state.
      Also, generate a short poetic title (max 4 words) and a single-word sentiment tag.
      
      Respond ONLY with a valid JSON object in this format:
      {
        "insight": "Your poetic reflection here.",
        "journalTitle": "Title here",
        "journalTag": "TagHere"
      }
    `;

    const chatCompletion = await groq.chat.completions.create({
      messages: [
        { role: 'system', content: 'You only reply in valid JSON.' },
        { role: 'user', content: prompt }
      ],
      model: 'llama3-8b-8192',
      temperature: 0.7,
      response_format: { type: 'json_object' }
    });

    const aiResponse = chatCompletion.choices[0]?.message?.content;
    if (!aiResponse) throw new Error('No response from Aetheric Intelligence');

    const result = JSON.parse(aiResponse);

    // 2. Save to Supabase (only if logged in)
    if (user) {
      // Save check-in
      const { error: checkinError } = await supabase.from('emotional_checkins').insert({
        user_id: user.id,
        valence_value: payload.valenceValue,
        texture: payload.texture,
        thoughts: payload.thoughts
      });

      if (checkinError) console.error('Error saving checkin:', checkinError);

      // Save to journal
      const { error: journalError } = await supabase.from('aetheric_journal').insert({
        user_id: user.id,
        title: result.journalTitle || 'Aetheric Echo',
        sentiment_tag: result.journalTag || 'Unknown',
        sentiment_dots: calculateDots(payload.valenceValue),
        icon: textureToIcon[payload.texture] || 'auto_awesome'
      });

      if (journalError) console.error('Error saving journal:', journalError);
    } else {
       console.log('User not authenticated. Returning AI insight without saving to Supabase.');
    }

    return { success: true, insight: result.insight };

  } catch (error: any) {
    console.error('Groq / DB Error:', error);
    return { error: 'Failed to process aetheric signal. Please check your Groq API limits or configuration.' };
  }
}
