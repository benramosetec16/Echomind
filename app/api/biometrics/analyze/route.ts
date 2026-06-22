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
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    // Buscar os últimos 14 registros para análise
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
        message: 'Sem dados suficientes para análise. Registre alguns dados biométricos primeiro.' 
      }, { status: 200 });
    }

    const dataSummary = biometrics.map(b => 
      `Data: ${new Date(b.created_at).toLocaleDateString('pt-BR')}, BPM: ${b.heart_rate}, Sono: ${b.sleep_hours}h, Energia: ${b.energy_level}, Humor: ${b.mood}`
    ).join('\n');

    const prompt = `Analise os dados biométricos abaixo do usuário:

${dataSummary}

Forneça:
1. Interpretação geral
2. Possíveis padrões
3. Recomendações
4. Alertas relevantes

As respostas devem ser informativas, empáticas e não devem fornecer diagnóstico médico. Formate a resposta usando Markdown, separando cada uma das 4 seções com cabeçalhos "### 1. Interpretação geral" etc. Seja conciso, mas com um tom futurista e focado no bem-estar.`;

    const chatCompletion = await groq.chat.completions.create({
      messages: [{ role: 'user', content: prompt }],
      model: 'llama3-70b-8192', // Ou o modelo groq de preferência
      temperature: 0.5,
    });

    const analysis = chatCompletion.choices[0]?.message?.content || 'Não foi possível gerar análise no momento.';

    return NextResponse.json({ analysis });

  } catch (error: any) {
    console.error('Erro na análise biométrica:', error);
    return NextResponse.json({ error: error.message || 'Erro interno no servidor' }, { status: 500 });
  }
}
