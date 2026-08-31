import { NextResponse } from 'next/server';
import { Groq } from 'groq-sdk';

export const maxDuration = 30;

// GET /api/libras-interpret → returns available models for diagnostics
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

export interface LibrasInterpretResult {
  recognized: boolean;
  text: string | null;
  confidence: 'high' | 'medium' | 'low' | null;
  error?: string;
}

// Models tried in order — first success wins, decommissioned ones are skipped automatically
const TEXT_MODELS = [
  'openai/gpt-oss-20b',
  'openai/gpt-oss-120b',
  'llama-3.3-70b-versatile',
  'llama-3.1-8b-instant',
];

const VISION_MODELS = [
  'meta-llama/llama-4-scout-17b-16e-instruct',
  'llama-3.2-90b-vision-preview',
  'llama-3.2-11b-vision-preview',
];

const systemPrompt = `Voce e um sistema especializado em reconhecimento experimental de Libras (Lingua Brasileira de Sinais).

REGRAS ABSOLUTAS:
1. NUNCA invente uma interpretacao. Se nao conseguir identificar um sinal com seguranca, retorne recognized: false.
2. Se a imagem estiver escura, desfocada, sem maos visiveis ou com movimento impossivel de analisar, retorne recognized: false.
3. Reconheca que Libras envolve configuracao das maos, movimento, orientacao, localizacao e expressao facial.
4. Seja honesto sobre o nivel de confianca.
5. Retorne APENAS JSON valido, sem texto adicional, sem markdown, sem backticks.

Retorne EXATAMENTE neste formato JSON:
{
  "recognized": boolean,
  "text": string ou null,
  "confidence": "high" | "medium" | "low" | null
}`;

async function tryTextModels(groq: Groq, userContent: string): Promise<string | null> {
  for (const model of TEXT_MODELS) {
    try {
      const completion = await groq.chat.completions.create({
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userContent },
        ],
        model,
        response_format: { type: 'json_object' },
        temperature: 0.1,
        max_tokens: 200,
      });
      const content = completion.choices[0]?.message?.content ?? null;
      if (content) {
        console.log(`Text model used: ${model}`);
        return content;
      }
    } catch (e: any) {
      console.warn(`Text model ${model} failed: ${e?.message}`);
      // Continue to next model
    }
  }
  return null;
}

async function tryVisionModels(groq: Groq, imageBase64: string): Promise<string | null> {
  for (const model of VISION_MODELS) {
    try {
      const completion = await (groq.chat.completions.create as any)({
        messages: [
          { role: 'system', content: systemPrompt },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Analise esta imagem e identifique se ha um sinal em Libras sendo realizado. Se conseguir identificar com confianca, informe o que foi sinalizado em portugues brasileiro. Se nao conseguir, retorne recognized: false.',
              },
              { type: 'image_url', image_url: { url: imageBase64 } },
            ],
          },
        ],
        model,
        response_format: { type: 'json_object' },
        temperature: 0.1,
        max_tokens: 200,
      });
      const content = completion.choices[0]?.message?.content ?? null;
      if (content) {
        console.log(`Vision model used: ${model}`);
        return content;
      }
    } catch (e: any) {
      console.warn(`Vision model ${model} failed: ${e?.message}`);
    }
  }
  return null;
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
        { recognized: false, text: null, confidence: null, error: 'GROQ_API_KEY nao configurada no servidor.' },
        { status: 500 }
      );
    }

    const groq = new Groq({ apiKey });

    let responseContent: string | null = null;

    // 1. Try vision models first (richer signal)
    if (imageBase64) {
      responseContent = await tryVisionModels(groq, imageBase64);
    }

    // 2. Fall back to text models with landmark data
    if (!responseContent && landmarks) {
      const isSequence =
        Array.isArray(landmarks) &&
        landmarks.length > 0 &&
        Array.isArray(landmarks[0]) &&
        Array.isArray(landmarks[0][0]);

      const contentPrompt = isSequence
        ? `Analise esta sequencia temporal de landmarks de maos gravada ao longo de alguns segundos (cada item do array principal representa um frame com ate 21 pontos do MediaPipe, coordenadas normalizadas 0-1). Tente identificar qual o movimento e o sinal em Libras sendo realizado. Se nao for possivel determinar com confianca, retorne recognized: false.\n\nSequencia Temporal de Landmarks:\n${JSON.stringify(landmarks)}`
        : `Analise estes dados de landmarks de maos (MediaPipe Hands - 21 pontos por mao, coordenadas normalizadas 0-1) e tente identificar um sinal em Libras. Se nao for possivel determinar com confianca, retorne recognized: false.\n\nLandmarks:\n${JSON.stringify(landmarks)}`;

      responseContent = await tryTextModels(groq, contentPrompt);
    }

    if (!responseContent) {
      return NextResponse.json<LibrasInterpretResult>({
        recognized: false,
        text: null,
        confidence: null,
        error: 'Todos os modelos de IA estao indisponiveis. Tente novamente em alguns minutos.',
      });
    }

    let parsed: LibrasInterpretResult;
    try {
      const cleanContent = responseContent
        .replace(/```json/gi, '')
        .replace(/```/g, '')
        .trim();
      parsed = JSON.parse(cleanContent) as LibrasInterpretResult;
    } catch {
      console.error('JSON parse failed. Raw LLM output:', responseContent);
      return NextResponse.json<LibrasInterpretResult>({
        recognized: false,
        text: null,
        confidence: null,
        error: 'Erro ao interpretar a resposta da IA. Tente novamente.',
      });
    }

    // Low confidence = treat as not recognized
    if (parsed.confidence === 'low') {
      parsed.recognized = false;
      parsed.text = null;
    }

    return NextResponse.json<LibrasInterpretResult>(parsed, { status: 200 });
  } catch (error: any) {
    console.error('Erro em /api/libras-interpret:', error);
    return NextResponse.json<LibrasInterpretResult>(
      {
        recognized: false,
        text: null,
        confidence: null,
        error: `Erro Interno: ${error.message || 'Falha no processamento'}`,
      },
      { status: 500 }
    );
  }
}
