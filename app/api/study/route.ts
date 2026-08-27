import { NextResponse } from 'next/server';
import Groq from 'groq-sdk';
import { createClient } from '@/utils/supabase/server';

export async function POST(request: Request) {
  try {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'A chave GROQ_API_KEY não está configurada.' }, { status: 500 });
    }

    const groq = new Groq({ apiKey });
    const { action, content, context } = await request.json();

    if (!action || !content) {
      return NextResponse.json({ error: 'Ação ou conteúdo não fornecido.' }, { status: 400 });
    }

    let systemPrompt = '';
    
    switch(action) {
      case 'explain':
        systemPrompt = 'Você é um tutor avançado focado em didática profunda. Explique o conteúdo de maneira completa, organizada e progressiva. Não pule etapas importantes.';
        break;
      case 'summarize':
        systemPrompt = 'Você é um tutor avançado. Resuma o texto fornecido, mantendo a clareza e estrutura lógica.';
        break;
      case 'review':
        systemPrompt = 'Você é um tutor criando uma revisão focada no entendimento. Gere a explicação e a revisão consolidada.';
        break;
      case 'schedule':
        systemPrompt = 'Você é um organizador de estudos produtivo. Crie um cronograma de estudos detalhado e realista com base nas disciplinas/temas fornecidos, aplicando a técnica Pomodoro ou repetição espaçada se adequado.';
        break;
      case 'qa':
        systemPrompt = 'Você é um assistente acadêmico pronto para responder perguntas específicas. Forneça uma resposta direta, clara e fundamentada para a pergunta do usuário.';
        break;
      default:
        systemPrompt = 'Você é o assistente educacional do EchoMind.';
    }

    const supabase = await createClient();
    const { data: { session } } = await supabase.auth.getSession();
    
    let studyStyleModifier = '';
    
    if (session?.user) {
      const { data: prefs } = await supabase
        .from('accessibility_preferences')
        .select('*')
        .eq('user_id', session.user.id)
        .single();
        
      if (prefs) {
        if (prefs.study_explanation_style === 'detailed') {
          studyStyleModifier = '\n\nPREFERÊNCIA DO USUÁRIO: O usuário prefere explicações altamente detalhadas e ricas em contexto. Não economize palavras, explique os pormenores.';
        } else if (prefs.study_explanation_style === 'step_by_step') {
          studyStyleModifier = '\n\nPREFERÊNCIA DO USUÁRIO: O usuário prefere conteúdo altamente estruturado. Divida TODA a explicação em pequenos passos numerados lógicos, um conceito por vez.';
        } else if (prefs.study_explanation_style === 'simplified') {
          studyStyleModifier = '\n\nPREFERÊNCIA DO USUÁRIO: O usuário prefere explicações diretas e simplificadas. Remova jargões desnecessários, seja conciso e apresente apenas a essência necessária para a compreensão básica.';
        }
      }
    }

    systemPrompt += `
ESTRUTURA DA EXPLICAÇÃO OBRIGATÓRIA:
Sempre que possível (e especialmente para a ação 'explain'), estruture sua "explicacao" usando os seguintes tópicos em Markdown:
1. O que é (conceito inicial simples)
2. Como funciona (explicação profunda/conceitual)
3. Elementos importantes (principais conceitos)
4. Fórmulas (quando existirem, explicando cada variável)
5. Exemplo resolvido (mostrar passo a passo)
6. Erros comuns (onde estudantes costumam errar)

QUIZ OBRIGATÓRIO (MÚLTIPLA ESCOLHA):
Gere perguntas (min 1, max 4) baseadas EXCLUSIVAMENTE no conteúdo que você acabou de explicar.
Aumente a dificuldade gradualmente (Ex: Nível 1: Compreensão básica, Nível 2: Aplicação).
NÃO crie perguntas sobre informações que não foram apresentadas na explicação.

IMPORTANTE: Você deve responder APENAS com um objeto JSON válido.
Sua resposta deve conter a seguinte estrutura exata:
{
  "explicacao": "Explicação detalhada estruturada com markdown (usar os tópicos).",
  "resumo": "Um resumo consolidado do tema.",
  "conceitos": ["Conceito 1 explicado de forma breve", "Conceito 2..."],
  "quiz": [
    {
      "pergunta": "Texto da pergunta",
      "opcoes": ["Opção 1", "Opção 2", "Opção 3", "Opção 4"],
      "resposta_correta": "O texto exato da opção correta (deve ser idêntico a um item do array opcoes)",
      "explicacao_resposta": "Feedback construtivo explicando por que esta é a resposta correta e apontando para a parte da explicação original.",
      "nivel": 1
    }
  ],
  "tags": {
    "disciplina": "Nome da disciplina, ex: Física, Matemática, História",
    "assunto": "O tema central",
    "palavras_chave": ["palavra1", "palavra2", "palavra3"],
    "nivel": "Fundamental, Médio ou Superior"
  }
}
Não inclua nenhuma introdução ou texto fora do JSON. Certifique-se de que o campo 'quiz' substitui o antigo campo 'exercicios'.${studyStyleModifier}`;

    const userMessage = context ? `Contexto anterior: ${context}\n\nSolicitação/Conteúdo atual: ${content}` : `Solicitação/Conteúdo: ${content}`;

    const chatCompletion = await groq.chat.completions.create({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage }
      ],
      model: 'openai/gpt-oss-20b',
      temperature: 0.4,
      response_format: { type: 'json_object' }
    });

    const responseContent = chatCompletion.choices[0]?.message?.content;
    
    if (!responseContent) {
      throw new Error("Resposta vazia da IA");
    }

    const parsed = JSON.parse(responseContent);

    // Consulta aos vídeos recomendados
    
    let videos = [];
    if (parsed.tags && parsed.tags.disciplina && parsed.tags.assunto) {
      const { data, error } = await supabase
        .from('educational_videos')
        .select('*')
        .eq('ativo', true)
        .or(`disciplina.ilike.%${parsed.tags.disciplina}%,assunto.ilike.%${parsed.tags.assunto}%`)
        .order('prioridade', { ascending: false })
        .limit(3);

      if (!error && data) {
        videos = data;
      }
    }

    return NextResponse.json({ ...parsed, videos });

  } catch (error: any) {
    console.error('Erro no módulo de estudos:', error);
    return NextResponse.json({ error: 'Ocorreu um erro ao processar sua solicitação.' }, { status: 500 });
  }
}
