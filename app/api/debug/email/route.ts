import { NextRequest, NextResponse } from 'next/server'

// GET /api/debug/email — testa o EmailJS e retorna o resultado detalhado
export async function GET(req: NextRequest) {
  const serviceId = 'service_hwdokgj'
  const templateId = 'template_xusbq4m'
  const publicKey = process.env.EMAILJS_PUBLIC_KEY
  const privateKey = process.env.EMAILJS_PRIVATE_KEY

  // 1. Checar variáveis de ambiente
  const envStatus = {
    EMAILJS_PUBLIC_KEY: publicKey ? `Present (${publicKey.substring(0, 6)}...)` : 'MISSING ❌',
    EMAILJS_PRIVATE_KEY: privateKey ? `Present (${privateKey.substring(0, 6)}...)` : 'MISSING ❌',
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || 'Not set (usando fallback localhost)',
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY ? 'Present ✅' : 'MISSING ❌',
    NODE_ENV: process.env.NODE_ENV,
  }

  if (!publicKey) {
    return NextResponse.json({ 
      error: 'EMAILJS_PUBLIC_KEY está ausente. Verifique as variáveis de ambiente na Vercel e faça Redeploy.',
      envStatus
    }, { status: 500 })
  }

  // 2. Tentar enviar um e-mail de teste para o e-mail do admin
  const testEmail = req.nextUrl.searchParams.get('to') || 'test@example.com'

  const payload = {
    service_id: serviceId,
    template_id: templateId,
    user_id: publicKey,
    accessToken: privateKey,
    template_params: {
      to_email: testEmail,
      title: 'Teste de Diagnóstico — EchoMind',
      badge: 'DIAGNÓSTICO',
      user_name: 'Administrador',
      message: 'Este é um e-mail de diagnóstico enviado pelo sistema EchoMind para verificar se a integração com EmailJS está funcionando corretamente.',
      code_label: 'CÓDIGO DE TESTE',
      code: '123456',
      code_description: 'Este é apenas um código de teste e não tem validade real.',
      button_text: 'VOLTAR AO SISTEMA',
      button_link: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
      security_message: 'Este e-mail foi enviado para fins de diagnóstico técnico.',
      footer_message: 'EchoMind © Diagnóstico de Sistema'
    }
  }

  try {
    const response = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })

    const responseText = await response.text()

    return NextResponse.json({
      success: response.ok,
      status: response.status,
      statusText: response.statusText,
      emailjsResponse: responseText,
      sentTo: testEmail,
      envStatus,
      payloadUsed: {
        service_id: serviceId,
        template_id: templateId,
        user_id: `${publicKey.substring(0, 6)}...`,
        accessToken: privateKey ? `${privateKey.substring(0, 6)}...` : 'NOT SET',
      }
    })
  } catch (err: any) {
    return NextResponse.json({ 
      error: err.message, 
      envStatus 
    }, { status: 500 })
  }
}
