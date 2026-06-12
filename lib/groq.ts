import Groq from 'groq-sdk';

// A chave precisa estar definida no .env.local
const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

export interface AnaliseEmocional {
  emocao_principal: string;
  emocoes_secundarias: string[];
  nivel_estresse: number;
  nivel_energia: number;
  nivel_motivacao: number;
  resumo: string;
  recomendacao: string;
}

/**
 * Envia um texto de relato emocional para a API do Groq e retorna uma análise JSON.
 * @param texto Relato emocional do usuário
 * @returns Objeto com a análise emocional
 */
export async function sendToGroq(texto: string): Promise<AnaliseEmocional> {
  const systemPrompt = `Você é o EchoMind AI.

Analise emoções e comportamentos.

Retorne apenas JSON válido.

Formato:

{
  "emocao_principal": "",
  "emocoes_secundarias": [],
  "nivel_estresse": 0,
  "nivel_energia": 0,
  "nivel_motivacao": 0,
  "resumo": "",
  "recomendacao": ""
}`;

  try {
    const chatCompletion = await groq.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: systemPrompt,
        },
        {
          role: 'user',
          content: texto,
        },
      ],
      model: 'llama-3.3-70b-versatile',
      response_format: { type: 'json_object' },
      temperature: 0.2, // Temperatura baixa para respostas mais consistentes
    });

    const responseContent = chatCompletion.choices[0]?.message?.content;

    if (!responseContent) {
      throw new Error('Resposta vazia recebida do Groq.');
    }

    const analise: AnaliseEmocional = JSON.parse(responseContent);
    return analise;
  } catch (error) {
    console.error('Erro ao chamar a API do Groq:', error);
    throw error;
  }
}
