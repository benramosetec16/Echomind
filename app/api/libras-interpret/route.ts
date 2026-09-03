import { NextResponse } from 'next/server';
import { Groq } from 'groq-sdk';

export const maxDuration = 30;

// ─── Tipos de resposta estruturada ────────────────────────────────────────────

export type LibrasErrorType =
  | 'NO_AI_MODEL'
  | 'AI_PROCESSING_FAILED'
  | 'NOT_RECOGNIZED'
  | 'LOW_CONFIDENCE'
  | 'NO_DATA';

export interface LibrasSuccessResponse {
  success: true;
  result: string;
  confidence: 'high' | 'medium' | 'low';
}

export interface LibrasErrorResponse {
  success: false;
  errorType: LibrasErrorType;
}

export type LibrasResponse = LibrasSuccessResponse | LibrasErrorResponse;

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Extrai o primeiro objeto JSON válido de uma string bruta do LLM. */
function extractJson(raw: string): { recognized: boolean; text: string | null; confidence: string | null } | null {
  try {
    const cleaned = raw.replace(/```json/gi, '').replace(/```/g, '').trim();
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (!match) return null;
    return JSON.parse(match[0]);
  } catch {
    return null;
  }
}

/** Verifica se um erro da Groq indica que o modelo não existe / não está disponível. */
function isModelNotFoundError(e: any): boolean {
  const status = e?.status ?? e?.statusCode;
  if (status === 404) return true;
  const msg: string = (e?.error?.error?.message ?? e?.message ?? '').toLowerCase();
  return (
    msg.includes('model not found') ||
    msg.includes('does not exist') ||
    msg.includes('model_not_found') ||
    msg.includes('deprecated') ||
    msg.includes('deactivated') ||
    msg.includes('not available')
  );
}

// ─── GET — diagnóstico: lista modelos disponíveis ─────────────────────────────

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

// ─── POST — reconhecimento principal ──────────────────────────────────────────

export async function POST(request: Request) {
  console.log('[libras] === inicio do processamento ===');

  try {
    const body = await request.json();
    const { imageBase64, landmarks } = body;

    const hasImage = !!imageBase64 && typeof imageBase64 === 'string' && imageBase64.length > 100;
    const hasLandmarks = Array.isArray(landmarks) && landmarks.length > 0;

    console.log('[libras] hasImage:', hasImage, '| landmarkFrames:', hasLandmarks ? landmarks.length : 0);

    // Nenhum dado capturado
    if (!hasImage && !hasLandmarks) {
      console.log('[libras] sem dados — abortando');
      return NextResponse.json<LibrasErrorResponse>(
        { success: false, errorType: 'NO_DATA' },
        { status: 400 }
      );
    }

    // Chave de API ausente — sem modelo disponível
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      console.error('[libras] GROQ_API_KEY nao configurada');
      return NextResponse.json<LibrasErrorResponse>(
        { success: false, errorType: 'NO_AI_MODEL' },
        { status: 503 }
      );
    }

    const groq = new Groq({ apiKey });

    const systemPrompt = `Voce e um especialista em Libras (Lingua Brasileira de Sinais).
Analise os dados fornecidos e identifique qual sinal esta sendo feito.
Responda SOMENTE com um JSON valido neste formato exato (sem texto adicional):
{"recognized": true, "text": "palavra", "confidence": "high"}
ou se nao conseguir identificar:
{"recognized": false, "text": null, "confidence": null}`;

    let rawResponse: string | null = null;
    // Rastreia se ao menos UM modelo foi tentado e falhou por indisponibilidade
    let allTriedModelsUnavailable = true;

    // ── ESTRATÉGIA 1: Visão com imagem ────────────────────────────────────────
    // Modelos de visão disponíveis na Groq (do mais recente ao mais antigo como fallback)
    const visionModels = [
      'meta-llama/llama-4-scout-17b-16e-instruct',
      'meta-llama/llama-4-maverick-17b-128e-instruct',
      'llama-3.2-90b-vision-preview',
      'llama-3.2-11b-vision-preview',
    ];

    if (hasImage) {
      for (const visionModel of visionModels) {
        console.log('[libras] tentando visao com modelo:', visionModel);
        try {
          const completion = await (groq.chat.completions.create as any)({
            messages: [
              { role: 'system', content: systemPrompt },
              {
                role: 'user',
                content: [
                  {
                    type: 'text',
                    text: 'Veja esta imagem e identifique o sinal em Libras que as maos estao fazendo. Retorne apenas o JSON.',
                  },
                  {
                    type: 'image_url',
                    image_url: { url: imageBase64 },
                  },
                ],
              },
            ],
            model: visionModel,
            temperature: 0.1,
            max_tokens: 150,
          });
          rawResponse = completion.choices[0]?.message?.content ?? null;
          console.log('[libras] visao OK — modelo:', visionModel, '| resposta bruta:', rawResponse);
          allTriedModelsUnavailable = false; // modelo funcionou
          break; // sucesso — sai do loop
        } catch (e: any) {
          const notFound = isModelNotFoundError(e);
          console.warn(
            '[libras] visao falhou — modelo:', visionModel,
            '| indisponivel:', notFound,
            '| status:', e?.status,
            '| erro:', e?.error?.error?.message || e?.message || String(e)
          );
          if (!notFound) {
            // Modelo existe mas falhou durante processamento — não tenta os próximos modelos de visão
            allTriedModelsUnavailable = false;
            break;
          }
          // Modelo não encontrado — tenta o próximo da lista
        }
      }
    }

    // ── ESTRATÉGIA 2: Texto com landmarks (fallback) ───────────────────────────
    if (!rawResponse && hasLandmarks) {
      const textModel = 'llama-3.3-70b-versatile';
      console.log('[libras] tentando texto com landmarks — modelo:', textModel);
      try {
        const frames = landmarks as any[];
        const firstHand = frames[0]?.[0];
        const lastHand = frames[frames.length - 1]?.[0];

        const describeHand = (hand: any[]) => {
          if (!hand || !Array.isArray(hand)) return 'sem dados';
          const wrist = hand[0];
          const indexTip = hand[8];
          const thumbTip = hand[4];
          const pinkyTip = hand[20];
          return `pulso(${wrist?.x?.toFixed(2)},${wrist?.y?.toFixed(2)}) polegar(${thumbTip?.x?.toFixed(2)},${thumbTip?.y?.toFixed(2)}) indicador(${indexTip?.x?.toFixed(2)},${indexTip?.y?.toFixed(2)}) mindinho(${pinkyTip?.x?.toFixed(2)},${pinkyTip?.y?.toFixed(2)})`;
        };

        const prompt = `Sinal em Libras — ${frames.length} frames capturados.
Posicao inicial da mao: ${describeHand(firstHand)}
Posicao final da mao: ${describeHand(lastHand)}
Identifique o sinal e retorne o JSON.`;

        const completion = await groq.chat.completions.create({
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: prompt },
          ],
          model: textModel,
          temperature: 0.1,
          max_tokens: 150,
        });
        rawResponse = completion.choices[0]?.message?.content ?? null;
        console.log('[libras] texto OK — modelo:', textModel, '| resposta bruta:', rawResponse);
        allTriedModelsUnavailable = false;
      } catch (e: any) {
        const notFound = isModelNotFoundError(e);
        console.error(
          '[libras] texto falhou — modelo:', textModel,
          '| indisponivel:', notFound,
          '| status:', e?.status,
          '| erro:', e?.error?.error?.message || e?.message || String(e)
        );
        if (!notFound) {
          allTriedModelsUnavailable = false;
        }
      }
    }

    // ── Nenhuma estratégia retornou resposta ──────────────────────────────────
    if (!rawResponse) {
      const errorType: LibrasErrorType = allTriedModelsUnavailable
        ? 'NO_AI_MODEL'
        : 'AI_PROCESSING_FAILED';
      console.log('[libras] sem resposta — errorType:', errorType, '| allUnavailable:', allTriedModelsUnavailable);
      return NextResponse.json<LibrasErrorResponse>({ success: false, errorType }, { status: 503 });
    }

    // ── Parsing da resposta ───────────────────────────────────────────────────
    const parsed = extractJson(rawResponse);
    if (!parsed) {
      console.error('[libras] parsing JSON falhou — resposta bruta:', rawResponse);
      return NextResponse.json<LibrasErrorResponse>(
        { success: false, errorType: 'AI_PROCESSING_FAILED' },
        { status: 502 }
      );
    }

    console.log('[libras] parsed:', JSON.stringify(parsed));

    // Confiança baixa — não reconhecido
    if (!parsed.recognized || parsed.confidence === 'low' || !parsed.text) {
      const errorType: LibrasErrorType = parsed.confidence === 'low' ? 'LOW_CONFIDENCE' : 'NOT_RECOGNIZED';
      console.log('[libras] sinal nao reconhecido — errorType:', errorType);
      return NextResponse.json<LibrasErrorResponse>({ success: false, errorType }, { status: 200 });
    }

    // Sucesso!
    console.log('[libras] === conclusao bem-sucedida — texto:', parsed.text, '| confianca:', parsed.confidence, '===');
    return NextResponse.json<LibrasSuccessResponse>(
      {
        success: true,
        result: parsed.text,
        confidence: (parsed.confidence as 'high' | 'medium' | 'low') ?? 'medium',
      },
      { status: 200 }
    );

  } catch (error: any) {
    console.error('[libras] erro nao tratado:', error?.message || String(error));
    return NextResponse.json<LibrasErrorResponse>(
      { success: false, errorType: 'AI_PROCESSING_FAILED' },
      { status: 500 }
    );
  }
}
