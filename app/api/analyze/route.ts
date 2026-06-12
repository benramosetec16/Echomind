import { NextResponse } from 'next/server';
import { sendToGroq } from '@/lib/groq';
import { supabase } from '@/lib/supabase';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { texto } = body;

    if (!texto || typeof texto !== 'string' || texto.trim().length === 0) {
      return NextResponse.json(
        { error: 'Texto inválido ou ausente. Forneça um relato válido.' },
        { status: 400 }
      );
    }

    // 1. Enviar para a API do Groq
    const analise = await sendToGroq(texto);

    // 2. Salvar no banco de dados (Supabase)
    const { error: dbError } = await supabase
      .from('analyses')
      .insert([
        {
          original_text: texto,
          emocao_principal: analise.emocao_principal,
          emocoes_secundarias: analise.emocoes_secundarias,
          nivel_estresse: analise.nivel_estresse,
          nivel_energia: analise.nivel_energia,
          nivel_motivacao: analise.nivel_motivacao,
          resumo: analise.resumo,
          recomendacao: analise.recomendacao,
          // created_at já recebe NOW() automaticamente no PostgreSQL
        }
      ]);

    if (dbError) {
      console.error('Erro ao salvar no Supabase:', dbError);
      return NextResponse.json(
        { error: 'Análise concluída, mas falhou ao salvar no banco de dados.', details: dbError.message },
        { status: 500 }
      );
    }

    // 3. Retornar resposta
    return NextResponse.json(analise, { status: 200 });

  } catch (error: any) {
    console.error('Erro na rota /api/analyze:', error);
    return NextResponse.json(
      { error: error.message || 'Erro interno no servidor' },
      { status: 500 }
    );
  }
}
