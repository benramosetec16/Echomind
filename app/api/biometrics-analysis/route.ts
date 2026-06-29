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

    // Busca os últimos 7 registros de biometria
    const { data: history } = await supabase
      .from("biometrics")
      .select("*")
      .eq("user_id", userData.user.id)
      .order("created_at", { ascending: false })
      .limit(7);

    if (!history || history.length === 0) {
      return NextResponse.json({ insight: "Não há dados biométricos suficientes para uma análise. Por favor, faça um registro primeiro." });
    }

    const prompt = `Analise os seguintes dados biométricos recentes do usuário (últimos registros de humor, horas de sono, energia e batimentos cardíacos):\n\n${JSON.stringify(history, null, 2)}\n\nForneça um insight conciso (máximo 2 parágrafos), empático e acionável sobre o estado geral do usuário e o que ele pode fazer para melhorar sua saúde e bem-estar hoje.`;

    const chatCompletion = await groq.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      model: "llama-3.3-70b-versatile", // More robust model
      temperature: 0.7,
      max_tokens: 400,
    });

    return NextResponse.json({ insight: chatCompletion.choices[0]?.message?.content || "Análise retornada em branco." });
  } catch (error: any) {
    console.error("Biometrics AI Analysis Error:", error);
    return NextResponse.json({ error: error.message || "Erro desconhecido ao gerar a análise da Groq." }, { status: 500 });
  }
}
