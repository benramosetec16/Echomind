import { NextResponse } from 'next/server';
import { Groq } from 'groq-sdk';

export const maxDuration = 30;

export interface LibrasInterpretResult {
  recognized: boolean;
  text: string | null;
  confidence: 'high' | 'medium' | 'low' | null;
  error?: string;
}

// GET → lista modelos disponíveis (diagnóstico)
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

function extractJson(raw: string): LibrasInterpretResult | null {
  try {
    const cleaned = raw.replace(/```json/gi, '').replace(/```/g, '').trim();
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (!match) return null;
    return JSON.parse(match[0]) as LibrasInterpretResult;
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { imageBase64, landmarks } = body;

    const hasImage = !!imageBase64 && typeof imageBase64 === 'string' && imageBase64.length > 100;
    const hasLandmarks = Array.isArray(landmarks) && landmarks.length > 0;

    console.log('[libras] hasImage:', hasImage, 'landmarkFrames:', hasLandmarks ? landmarks.length : 0);

    if (!hasImage && !hasLandmarks) {
      return NextResponse.json<LibrasInterpretResult>({
        recognized: false,
        text: null,
        confidence: null,
        error: 'Nenhum dado capturado. Posicione suas maos na frente da camera e tente novamente.',
      }, { status: 400 });
    }

    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      return NextResponse.json<LibrasInterpretResult>({
        recognized: false, text: null, confidence: null,
        error: 'Servico de IA nao configurado no servidor.',
      }, { status: 500 });
    }

    const groq = new Groq({ apiKey });

    const systemPrompt = `Voce e um especialista em Libras (Lingua Brasileira de Sinais).
Analise os dados fornecidos e identifique qual sinal esta sendo feito.
Responda SOMENTE com um JSON valido neste formato exato (sem texto adicional):
{"recognized": true, "text": "palavra", "confidence": "high"}
ou se nao conseguir identificar:
{"recognized": false, "text": null, "confidence": null}`;

    let rawResponse: string | null = null;

    // ESTRATEGIA 1: Visão — manda a imagem direto para o modelo ver as mãos
    if (hasImage) {
      try {
        console.log('[libras] trying vision with image...');
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
          model: 'llama-3.2-11b-vision-preview',
          temperature: 0.1,
          max_tokens: 150,
        });
        rawResponse = completion.choices[0]?.message?.content ?? null;
        console.log('[libras] vision raw:', rawResponse);
      } catch (e: any) {
        console.warn('[libras] vision failed:', e?.status, e?.error?.error?.message || e?.message || e);
      }
    }

    // ESTRATEGIA 2: Texto com landmarks — como fallback se visão falhou ou não tem imagem
    if (!rawResponse && hasLandmarks) {
      try {
        console.log('[libras] trying text with landmarks...');

        // Simplifica os landmarks para texto legível
        const frames = landmarks as any[];
        const firstHand = frames[0]?.[0]; // primeiro frame, primeira mão
        const lastHand = frames[frames.length - 1]?.[0]; // último frame, primeira mão

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
          model: 'llama-3.3-70b-versatile',
          temperature: 0.1,
          max_tokens: 150,
        });
        rawResponse = completion.choices[0]?.message?.content ?? null;
        console.log('[libras] text raw:', rawResponse);
      } catch (e: any) {
        console.warn('[libras] text failed:', e?.status, e?.error?.error?.message || e?.message || e);
      }
    }

    if (!rawResponse) {
      return NextResponse.json<LibrasInterpretResult>({
        recognized: false, text: null, confidence: null,
        error: 'Modelo de IA nao retornou resposta. Verifique os logs da Vercel.',
      });
    }

    const parsed = extractJson(rawResponse);
    if (!parsed) {
      console.error('[libras] JSON parse failed. Raw:', rawResponse);
      return NextResponse.json<LibrasInterpretResult>({
        recognized: false, text: null, confidence: null,
        error: 'Resposta inesperada da IA.',
      });
    }

    if (parsed.confidence === 'low') {
      parsed.recognized = false;
      parsed.text = null;
    }

    return NextResponse.json<LibrasInterpretResult>(parsed, { status: 200 });

  } catch (error: any) {
    console.error('[libras] erro:', error);
    return NextResponse.json<LibrasInterpretResult>({
      recognized: false, text: null, confidence: null,
      error: `Erro: ${error.message || 'Falha no processamento'}`,
    }, { status: 500 });
  }
}
