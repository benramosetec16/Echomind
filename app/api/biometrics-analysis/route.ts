import { NextResponse } from 'next/server';
import { Groq } from 'groq-sdk';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function POST(req: Request) {
  try {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "A chave da API Groq não está configurada (.env)." }, { status: 500 });
    }

    const groq = new Groq({ apiKey });
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
        },
      }
    );

    const { data: userData, error: authError } = await supabase.auth.getUser();
    if (authError || !userData?.user) {
      return NextResponse.json({ error: "Usuário não autenticado." }, { status: 401 });
    }

    // Busca os últimos 14 registros de biometria para ter mais base histórica
    const { data: history } = await supabase
      .from("biometrics")
      .select("*")
      .eq("user_id", userData.user.id)
      .order("created_at", { ascending: false })
      .limit(14);

    if (!history || history.length === 0) {
      return NextResponse.json({ 
        resumo: "Não há dados biométricos suficientes para uma análise.",
        tendencias: "Indefinido",
        fatores_atencao: [],
        recomendacoes: ["Por favor, faça um registro biométrico primeiro."],
        nivel_risco: "Baixo"
      });
    }

    const systemPrompt = `Você é o EchoMind AI, um sistema de análise institucional.
Baseie-se no Copenhagen Psychosocial Questionnaire (COPSOQ) e na NR-1 (GRO e PGR) para prevenção.
NUNCA faça diagnóstico médico. 
Avalie estes dados biométricos do usuário:
${JSON.stringify(history, null, 2)}

Analise os padrões de sono, energia e batimentos cardíacos.
Retorne APENAS JSON no formato:
{
  "resumo": "Descrição objetiva e concisa da situação biométrica em 2 parágrafos.",
  "tendencias": "Ex: melhora na energia, redução do sono, picos de BPM.",
  "fatores_atencao": ["Possível sobrecarga", "Déficit de sono", "Batimentos anormais no repouso"],
  "recomendacoes": ["Organização da rotina", "Higiene do sono", "Prática de relaxamento"],
  "nivel_risco": "Baixo" // Pode ser: Baixo, Moderado, Elevado ou Crítico, baseado no histórico, jamais num único pico.
}`;

    const chatCompletion = await groq.chat.completions.create({
      messages: [{ role: "system", content: systemPrompt }],
      model: "openai/gpt-oss-20b",
      response_format: { type: 'json_object' },
      temperature: 0.2,
      max_tokens: 1000,
    });

    const responseContent = chatCompletion.choices[0]?.message?.content || "{}";
    const analise = JSON.parse(responseContent);

    return NextResponse.json(analise);
  } catch (error: any) {
    console.error("Biometrics AI Analysis Error:", error);
    return NextResponse.json({ error: error.message || "Erro desconhecido ao gerar a análise da Groq." }, { status: 500 });
  }
}
