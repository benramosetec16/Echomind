import { NextResponse } from 'next/server';
import Groq from 'groq-sdk';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

export async function GET(request: Request) {
  try {
    const cookieStore = await cookies();
    
    // Configurar o cliente Supabase do lado do servidor
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) => {
                cookieStore.set(name, value, options);
              });
            } catch (error) {
              // The `set` method was called from a Server Component.
              // This can be ignored if you have middleware refreshing user sessions.
            }
          },
        },
      }
    );

    const { data: userData, error: authError } = await supabase.auth.getUser();

    if (authError || !userData?.user) {
      return NextResponse.json({ error: 'N├úo autorizado' }, { status: 401 });
    }

    // Buscar os ├║ltimos 14 registros para an├ílise
    const { data: biometrics, error: dbError } = await supabase
      .from('biometrics')
      .select('*')
      .eq('user_id', userData.user.id)
      .order('created_at', { ascending: false })
      .limit(14);

    if (dbError) {
      throw new Error(`Erro ao buscar dados: ${dbError.message}`);
    }

    if (!biometrics || biometrics.length === 0) {
      return NextResponse.json({ 
        message: 'Sem dados suficientes para an├ílise. Registre alguns dados biom├®tricos primeiro.' 
      }, { status: 200 });
    }

    const dataSummary = biometrics.map(b => 
      `Data: ${new Date(b.created_at).toLocaleDateString('pt-BR')}, BPM: ${b.heart_rate}, Sono: ${b.sleep_hours}h, Energia: ${b.energy_level}, Humor: ${b.mood}`
    ).join('\n');

    const prompt = `Analise os dados biom├®tricos abaixo do usu├írio:

${dataSummary}

Forne├ºa:
1. Interpreta├º├úo geral
2. Poss├¡veis padr├Áes
3. Recomenda├º├Áes
4. Alertas relevantes

As respostas devem ser informativas, emp├íticas e n├úo devem fornecer diagn├│stico m├®dico. Formate a resposta usando Markdown, separando cada uma das 4 se├º├Áes com cabe├ºalhos "### 1. Interpreta├º├úo geral" etc. Seja conciso, mas com um tom futurista e focado no bem-estar.`;

    const chatCompletion = await groq.chat.completions.create({
      messages: [{ role: 'user', content: prompt }],
      model: 'llama-3.3-70b-versatile', // Ou o modelo groq de prefer├¬ncia
      temperature: 0.5,
    });

    const analysis = chatCompletion.choices[0]?.message?.content || 'N├úo foi poss├¡vel gerar an├ílise no momento.';

    return NextResponse.json({ analysis });

  } catch (error: any) {
    console.error('Erro na an├ílise biom├®trica:', error);
    return NextResponse.json({ error: error.message || 'Erro interno no servidor' }, { status: 500 });
  }
}
