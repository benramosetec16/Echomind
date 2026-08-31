import { NextResponse } from 'next/server';
import { Groq } from 'groq-sdk';

export const maxDuration = 30;

export interface LibrasInterpretResult {
  recognized: boolean;
  text: string | null;
  confidence: 'high' | 'medium' | 'low' | null;
  error?: string;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { imageBase64, landmarks } = body;

    if (!imageBase64 && !landmarks) {
      return NextResponse.json<LibrasInterpretResult>(
        { recognized: false, text: null, confidence: null, error: 'Nenhum dado de entrada fornecido.' },
        { status: 400 }
      );
    }

    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      return NextResponse.json<LibrasInterpretResult>(
        { recognized: false, text: null, confidence: null, error: 'Servico de interpretacao indisponivel.' },
        { status: 500 }
      );
    }

    const groq = new Groq({ apiKey });

    const systemPrompt = `Voce e um sistema especializado em reconhecimento experimental de Libras (Lingua Brasileira de Sinais).

REGRAS ABSOLUTAS:
1. NUNCA invente uma interpretacao. Se nao conseguir identificar um sinal com seguranca, retorne recognized: false.
2. Se a imagem estiver escura, desfocada, sem maos visiveis ou com movimento impossivel de analisar, retorne recognized: false.
3. Reconheca que Libras envolve configuracao das maos, movimento, orientacao, localizacao e expressao facial - uma unica imagem tem limitacoes.
4. Seja honesto sobre o nivel de confianca.
5. Retorne APENAS JSON valido, sem texto adicional.

Retorne EXATAMENTE neste formato JSON:
{
  "recognized": boolean,
  "text": string ou null,
  "confidence": "high" | "medium" | "low" | null
}`;

    let responseContent: string | null = null;

    if (imageBase64) {
      try {
        const chatCompletion = await groq.chat.completions.create({
          messages: [
            { role: 'system', content: systemPrompt },
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: 'Analise esta imagem e identifique se ha um sinal em Libras sendo realizado. Se conseguir identificar com confianca, informe o que foi sinalizado em portugues brasileiro. Se nao conseguir, retorne recognized: false.',
                },
                {
                  type: 'image_url',
                  image_url: { url: imageBase64 },
                },
              ],
            },
          ],
          model: 'llama-3.2-90b-vision-preview',
          response_format: { type: 'json_object' },
          temperature: 0.1,
          max_tokens: 200,
        } as any);
        responseContent = chatCompletion.choices[0]?.message?.content ?? null;
      } catch {
        // Vision model unavailable, fall through to landmarks fallback
      }
    }

    if (!responseContent && landmarks) {
      const isSequence = Array.isArray(landmarks) && landmarks.length > 0 && Array.isArray(landmarks[0]) && Array.isArray(landmarks[0][0]);
      
      const contentPrompt = isSequence 
        ? `Analise esta sequencia temporal de landmarks de maos gravada ao longo de alguns segundos (cada item do array principal representa um frame com ate 21 pontos do MediaPipe, coordenadas normalizadas 0-1). Tente identificar qual o movimento e o sinal em Libras sendo realizado. Se nao for possivel determinar com confianca o movimento/sinal, retorne recognized: false.\n\nSequencia Temporal de Landmarks:\n${JSON.stringify(landmarks)}`
        : `Analise estes dados de landmarks de maos (MediaPipe Hands - 21 pontos por mao, coordenadas normalizadas 0-1) e tente identificar um sinal em Libras. Se nao for possivel determinar com confianca, retorne recognized: false.\n\nLandmarks:\n${JSON.stringify(landmarks)}`;

      const fallbackCompletion = await groq.chat.completions.create({
        messages: [
          { role: 'system', content: systemPrompt },
          {
            role: 'user',
            content: contentPrompt,
          },
        ],
        model: 'llama3-70b-8192',
        response_format: { type: 'json_object' },
        temperature: 0.1,
        max_tokens: 200,
      });
      responseContent = fallbackCompletion.choices[0]?.message?.content ?? null;
    }

    if (!responseContent) {
      return NextResponse.json<LibrasInterpretResult>({
        recognized: false, text: null, confidence: null,
        error: 'Servico de interpretacao indisponivel. Tente novamente.',
      });
    }

    let parsed: LibrasInterpretResult;
    try {
      const cleanContent = responseContent.replace(/```json/gi, '').replace(/```/g, '').trim();
      parsed = JSON.parse(cleanContent) as LibrasInterpretResult;
    } catch (e) {
      console.error('Failed to parse JSON from LLM:', responseContent);
      return NextResponse.json<LibrasInterpretResult>({
        recognized: false, text: null, confidence: null,
        error: 'Erro ao interpretar a resposta da IA. Tente novamente.',
      });
    }

    // Safety: low confidence = not recognized
    if (parsed.confidence === 'low') {
      parsed.recognized = false;
      parsed.text = null;
    }

    return NextResponse.json<LibrasInterpretResult>(parsed, { status: 200 });

  } catch (error: any) {
    console.error('Erro em /api/libras-interpret:', error);
    return NextResponse.json<LibrasInterpretResult>(
      { recognized: false, text: null, confidence: null, error: 'Falha no processamento. Tente novamente.' },
      { status: 500 }
    );
  }
}
