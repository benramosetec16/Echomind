import { NextResponse } from 'next/server';
import { Groq } from 'groq-sdk';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function POST(req: Request) {
  try {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "A chave da API Groq n├úo est├í configurada (.env)." }, { status: 500 });
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
      return NextResponse.json({ error: "Usu├írio n├úo autenticado." }, { status: 401 });
    }

    // Busca os ├║ltimos 7 registros de biometria
    const { data: history } = await supabase
      .from("biometrics")
      .select("*")
      .eq("user_id", userData.user.id)
      .order("created_at", { ascending: false })
      .limit(7);

    if (!history || history.length === 0) {
      return NextResponse.json({ insight: "N├úo h├í dados biom├®tricos suficientes para uma an├ílise. Por favor, fa├ºa um registro primeiro." });
    }

    const prompt = `Analise os seguintes dados biom├®tricos recentes do usu├írio (├║ltimos registros de humor, horas de sono, energia e batimentos card├¡acos):\n\n${JSON.stringify(history, null, 2)}\n\nForne├ºa um insight conciso (m├íximo 2 par├ígrafos), emp├ítico e acion├ível sobre o estado geral do usu├írio e o que ele pode fazer para melhorar sua sa├║de e bem-estar hoje.`;

    const chatCompletion = await groq.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      model: "llama-3.3-70b-versatile", // More robust model
      temperature: 0.7,
      max_tokens: 400,
    });

    return NextResponse.json({ insight: chatCompletion.choices[0]?.message?.content || "An├ílise retornada em branco." });
  } catch (error: any) {
    console.error("Biometrics AI Analysis Error:", error);
    return NextResponse.json({ error: error.message || "Erro desconhecido ao gerar a an├ílise da Groq." }, { status: 500 });
  }
}
