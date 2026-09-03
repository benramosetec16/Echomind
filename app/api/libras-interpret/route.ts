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

/**
 * Verifica se um erro da Groq indica que o modelo não existe / foi depreciado.
 * CONSERVADOR: apenas status 404 real ou mensagens estritamente sobre modelo não encontrado.
 * Erros 401 (auth), 403 (forbidden), 429 (rate limit), 400 (bad request), 500 (server error)
 * NÃO são tratados como modelo indisponível — o modelo existe, algo mais falhou.
 */
function isModelNotFoundError(e: any): boolean {
  const status = e?.status ?? e?.statusCode;
  // Apenas 404 genuíno — qualquer outro status significa que o endpoint respondeu
  if (status === 404) return true;
  const msg: string = (e?.error?.error?.message ?? e?.message ?? '').toLowerCase();
  return (
    msg.includes('model not found') ||
    msg.includes('does not exist') ||
    msg.includes('model_not_found') ||
    msg.includes('does not exist') ||
    msg.includes('no such model')
  );
}

/** Loga o tipo de erro de forma clara para facilitar diagnóstico nos logs da Vercel. */
function classifyGroqError(e: any): string {
  const status = e?.status ?? e?.statusCode;
  const msg = e?.error?.error?.message || e?.message || String(e);
  if (status === 401) return `AUTH_ERROR (401) — verifique GROQ_API_KEY: ${msg}`;
  if (status === 403) return `FORBIDDEN (403) — plano sem acesso ao modelo: ${msg}`;
  if (status === 429) return `RATE_LIMIT (429) — limite de requisicoes atingido: ${msg}`;
  if (status === 400) return `BAD_REQUEST (400) — formato invalido: ${msg}`;
  if (status === 404) return `MODEL_NOT_FOUND (404): ${msg}`;
  return `ERRO_${status ?? 'desconhecido'}: ${msg}`;
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

    // Conta quantos modelos foram realmente encontrados (não retornaram 404)
    // para distinguir NO_AI_MODEL de AI_PROCESSING_FAILED no final.
    let modelsFound = 0;

    // ── ESTRATÉGIA 1: Visão com imagem ────────────────────────────────────────
    // Tenta todos os modelos de visão na ordem. Avança para o próximo SEMPRE que
    // o erro for de modelo não encontrado/depreciado (404). Para outros erros
    // (400, 500, timeout), registra que o modelo estava acessível e continua.
    const visionModels = [
      'meta-llama/llama-4-scout-17b-16e-instruct',
      'meta-llama/llama-4-maverick-17b-128e-instruct',
      'llama-3.2-90b-vision-preview',
      'llama-3.2-11b-vision-preview',
    ];

    if (hasImage) {
      for (const visionModel of visionModels) {
        if (rawResponse) break; // já tem resposta — para o loop
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
          modelsFound++;
          console.log('[libras] visao OK — modelo:', visionModel, '| resposta bruta:', rawResponse);
          // Não quebra aqui pois o break no topo do loop vai parar na próxima iteração
        } catch (e: any) {
          const notFound = isModelNotFoundError(e);
          console.warn(
            '[libras] visao falhou — modelo:', visionModel,
            '| indisponivel:', notFound,
            '| erro_detalhado:', classifyGroqError(e)
          );
          if (!notFound) {
            // Modelo existe mas a chamada falhou — conta como "modelo encontrado"
            // mas continua tentando os próximos (pode ser incompatibilidade de formato)
            modelsFound++;
          }
          // Se notFound === true, simplesmente passa para o próximo modelo
        }
      }
    }

    // ── ESTRATÉGIA 2: Texto com landmarks (fallback) ───────────────────────────
    // Executa se ainda não há resposta e há landmarks disponíveis.
    // Tenta múltiplos modelos de texto como fallback.
    const textModels = [
      'llama-3.3-70b-versatile',
      'llama-3.1-70b-versatile',
      'llama-3.1-8b-instant',
      'gemma2-9b-it',
    ];

    if (!rawResponse && hasLandmarks) {
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

      for (const textModel of textModels) {
        if (rawResponse) break;
        console.log('[libras] tentando texto com landmarks — modelo:', textModel);
        try {
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
          modelsFound++;
          console.log('[libras] texto OK — modelo:', textModel, '| resposta bruta:', rawResponse);
        } catch (e: any) {
          const notFound = isModelNotFoundError(e);
          console.warn(
            '[libras] texto falhou — modelo:', textModel,
            '| indisponivel:', notFound,
            '| erro_detalhado:', classifyGroqError(e)
          );
          if (!notFound) {
            modelsFound++;
          }
          // Continua para o próximo modelo de texto
        }
      }
    }

    // ── Nenhuma estratégia retornou resposta ──────────────────────────────────
    if (!rawResponse) {
      // Se nenhum modelo sequer foi encontrado → plataforma sem modelos disponíveis
      // Se algum foi encontrado mas falhou → falha de processamento
      const errorType: LibrasErrorType = modelsFound === 0 ? 'NO_AI_MODEL' : 'AI_PROCESSING_FAILED';
      console.log(
        '[libras] sem resposta — modelsFound:', modelsFound,
        '| errorType:', errorType
      );
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

    // Confiança baixa — não reconhecido com segurança
    if (parsed.confidence === 'low') {
      console.log('[libras] confianca baixa — retornando LOW_CONFIDENCE');
      return NextResponse.json<LibrasErrorResponse>({ success: false, errorType: 'LOW_CONFIDENCE' }, { status: 200 });
    }

    // Não reconhecido
    if (!parsed.recognized || !parsed.text) {
      console.log('[libras] sinal nao reconhecido — retornando NOT_RECOGNIZED');
      return NextResponse.json<LibrasErrorResponse>({ success: false, errorType: 'NOT_RECOGNIZED' }, { status: 200 });
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
