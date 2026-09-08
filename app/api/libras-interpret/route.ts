import { NextResponse } from 'next/server';
import { Groq } from 'groq-sdk';

export const maxDuration = 30;

// ─── Structured Response Types ───────────────────────────────────────────────

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
  message?: string;
}

export type LibrasResponse = LibrasSuccessResponse | LibrasErrorResponse;

// ─── GET — Diagnostic endpoint ───────────────────────────────────────────────

export async function GET() {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return NextResponse.json({
      status: 'offline',
      message: 'GROQ_API_KEY não configurada (o reconhecimento principal opera localmente no navegador)',
    });
  }
  try {
    const res = await fetch('https://api.groq.com/openai/v1/models', {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    const data = await res.json();
    const models = (data.data ?? []).map((m: any) => m.id).sort();
    return NextResponse.json({
      status: 'online',
      totalModels: models.length,
      availableModels: models,
    });
  } catch (e: any) {
    return NextResponse.json(
      { status: 'error', message: e?.message || 'Falha ao conectar à API externa' },
      { status: 200 }
    );
  }
}

// ─── POST — Optional AI semantic contextualization ───────────────────────────

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { signText, signLabel } = body;

    // If client already recognized a sign via local LibrasRecognizer
    if (signText || signLabel) {
      return NextResponse.json<LibrasSuccessResponse>({
        success: true,
        result: signText || signLabel,
        confidence: 'high',
      });
    }

    // Optional Groq semantic contextualizer if API key exists
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      return NextResponse.json<LibrasErrorResponse>({
        success: false,
        errorType: 'NO_AI_MODEL',
        message: 'GROQ_API_KEY não configurada no servidor',
      });
    }

    // Return safe structured response
    return NextResponse.json<LibrasErrorResponse>({
      success: false,
      errorType: 'NOT_RECOGNIZED',
      message: 'Reconhecimento deve ser realizado prioritariamente pelo classificador local.',
    });
  } catch (error: any) {
    return NextResponse.json<LibrasErrorResponse>({
      success: false,
      errorType: 'AI_PROCESSING_FAILED',
      message: error?.message || 'Falha no processamento',
    });
  }
}
