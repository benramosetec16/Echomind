import { NextResponse } from 'next/server';
import { Groq } from 'groq-sdk';

export const maxDuration = 30;

export interface LibrasInterpretResult {
  recognized: boolean;
  text: string | null;
  confidence: 'high' | 'medium' | 'low' | null;
  error?: string;
}

// GET → diagnostic: lista modelos disponíveis na conta Groq
export async function GET() {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'GROQ_API_KEY nao configurada' }, { status: 500 });
  }
  try {
    const res = await fetch('https://api.groq.com/openai/v1/models', {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    const data = await res.json();
    const models = (data.data ?? []).map((m: any) => m.id).sort();
    return NextResponse.json({ total: models.length, models });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

const systemPrompt = `Voce e um sistema especializado em reconhecimento experimental de Libras (Lingua Brasileira de Sinais).

CONTEXTO: Libras usa configuracao das maos, movimentos, orientacao das palmas e localizacao para comunicar.

REGRAS:
1. Analise os dados fornecidos e tente identificar o sinal de Libras.
2. Se nao conseguir identificar com razoavel confianca, retorne recognized: false.
3. Retorne SOMENTE o JSON abaixo, sem texto adicional, sem markdown, sem backticks.

FORMATO DE RESPOSTA OBRIGATORIO:
{"recognized": true, "text": "palavra em portugues", "confidence": "high"}
ou
{"recognized": false, "text": null, "confidence": null}`;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { imageBase64, landmarks } = body;

    console.log('[libras-interpret] received - hasImage:', !!imageBase64, 'landmarksFrames:', Array.isArray(landmarks) ? landmarks.length : 0);

    if (!imageBase64 && (!landmarks || !Array.isArray(landmarks) || landmarks.length === 0)) {
      return NextResponse.json<LibrasInterpretResult>(
        { recognized: false, text: null, confidence: null, error: 'Nenhum dado capturado. Certifique-se de que suas maos estao visiveis na camera durante a gravacao.' },
        { status: 400 }
      );
    }

    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      return NextResponse.json<LibrasInterpretResult>(
        { recognized: false, text: null, confidence: null, error: 'GROQ_API_KEY nao configurada no servidor.' },
        { status: 500 }
      );
    }

    const groq = new Groq({ apiKey });

    // Build prompt from landmarks (most reliable data source)
    let userContent: any = '';
    let useVision = false;

    if (landmarks && Array.isArray(landmarks) && landmarks.length > 0) {
      // Use landmarks as text description — works with any text model
      const isSequence = Array.isArray(landmarks[0]) && Array.isArray(landmarks[0][0]);

      if (isSequence) {
        // Describe movement by comparing first and last frames
        const firstFrame = landmarks[0];
        const lastFrame = landmarks[landmarks.length - 1];
        const midFrame = landmarks[Math.floor(landmarks.length / 2)];

        userContent = `Analise a sequencia de movimentos das maos em Libras.
Total de frames gravados: ${landmarks.length}

Frame inicial (posicao de partida):
${JSON.stringify(firstFrame)}

Frame do meio (transicao):
${JSON.stringify(midFrame)}

Frame final (posicao de chegada):
${JSON.stringify(lastFrame)}

Com base na trajetoria e configuracao das maos nesses 3 momentos-chave, identifique o sinal em Libras.
Se nao for possivel identificar com confianca, retorne recognized: false.`;
      } else {
        userContent = `Identifique o sinal em Libras com base nos landmarks das maos (MediaPipe, coordenadas normalizadas 0-1, 21 pontos por mao):
${JSON.stringify(landmarks)}`;
      }
    } else if (imageBase64) {
      // Fall back to vision if we have an image but no landmarks
      useVision = true;
    }

    let responseContent: string | null = null;

    if (useVision && imageBase64) {
      // Vision call — imageBase64 is already a data URI
      try {
        const completion = await (groq.chat.completions.create as any)({
          messages: [
            { role: 'system', content: systemPrompt },
            {
              role: 'user',
              content: [
                { type: 'text', text: 'Analise a imagem e identifique o sinal em Libras sendo realizado. Retorne o JSON.' },
                { type: 'image_url', image_url: { url: imageBase64 } },
              ],
            },
          ],
          model: 'openai/gpt-oss-20b',
          temperature: 0.1,
          max_tokens: 200,
        });
        responseContent = completion.choices[0]?.message?.content ?? null;
        console.log('[libras-interpret] vision response:', responseContent);
      } catch (e: any) {
        console.warn('[libras-interpret] vision failed:', e?.message);
      }
    } else {
      // Text call with landmarks
      const completion = await groq.chat.completions.create({
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userContent },
        ],
        model: 'openai/gpt-oss-20b',
        temperature: 0.1,
        max_tokens: 300,
      });
      responseContent = completion.choices[0]?.message?.content ?? null;
      console.log('[libras-interpret] text response:', responseContent);
    }

    if (!responseContent) {
      return NextResponse.json<LibrasInterpretResult>({
        recognized: false, text: null, confidence: null,
        error: 'Resposta vazia do modelo. Tente novamente.',
      });
    }

    let parsed: LibrasInterpretResult;
    try {
      // Strip markdown fences
      let clean = responseContent.replace(/```json/gi, '').replace(/```/g, '').trim();
      // Extract first JSON object found in the string (handles models that add extra text)
      const jsonMatch = clean.match(/\{[\s\S]*\}/);
      if (jsonMatch) clean = jsonMatch[0];
      parsed = JSON.parse(clean) as LibrasInterpretResult;
    } catch {
      console.error('[libras-interpret] JSON parse failed. Raw:', responseContent);
      return NextResponse.json<LibrasInterpretResult>({
        recognized: false, text: null, confidence: null,
        error: 'Erro ao interpretar resposta da IA.',
      });
    }

    if (parsed.confidence === 'low') {
      parsed.recognized = false;
      parsed.text = null;
    }

    return NextResponse.json<LibrasInterpretResult>(parsed, { status: 200 });

  } catch (error: any) {
    console.error('[libras-interpret] Erro:', error);
    return NextResponse.json<LibrasInterpretResult>(
      { recognized: false, text: null, confidence: null, error: `Erro Interno: ${error.message || 'Falha no processamento'}` },
      { status: 500 }
    );
  }
}
