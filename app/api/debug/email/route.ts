import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const serviceId = 'service_hwdokgj'
  const templateId = 'template_xusbq4m'
  const publicKey = process.env.EMAILJS_PUBLIC_KEY
  const privateKey = process.env.EMAILJS_PRIVATE_KEY

  const envStatus = {
    EMAILJS_PUBLIC_KEY: publicKey ? `✅ Present (${publicKey.substring(0, 6)}...)` : '❌ MISSING',
    EMAILJS_PRIVATE_KEY: privateKey ? `✅ Present (${privateKey.substring(0, 6)}...)` : '❌ MISSING (opcional mas recomendado)',
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || '⚠️ Não definido',
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY ? '✅ Present' : '❌ MISSING',
    NODE_ENV: process.env.NODE_ENV,
  }

  if (!publicKey) {
    return NextResponse.json({
      success: false,
      error: 'EMAILJS_PUBLIC_KEY ausente. Adicione na Vercel e faça Redeploy.',
      envStatus
    }, { status: 500 })
  }

  const testEmail = req.nextUrl.searchParams.get('to') || 'test@example.com'

  const payload = {
    service_id: serviceId,
    template_id: templateId,
    user_id: publicKey,
    accessToken: privateKey,
    template_params: {
      to_email: testEmail,
      title: 'Diagnóstico EchoMind',
      badge: 'TESTE',
      user_name: 'Admin',
      message: 'Este é um e-mail de teste automático do sistema EchoMind para verificar a integração com EmailJS.',
      code_label: 'CÓDIGO DE VERIFICAÇÃO',
      code: '999888',
      code_description: 'Apenas para diagnóstico. Não tem validade.',
      button_text: 'ACESSAR SISTEMA',
      button_link: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
      security_message: 'E-mail enviado para fins de diagnóstico técnico.',
      footer_message: 'EchoMind © Diagnóstico'
    }
  }

  try {
    const response = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })

    if (!response.ok) {
      const text = await response.text()
      throw new Error(text)
    }

    return NextResponse.json({
      success: true,
      status: response.status,
      sentTo: testEmail,
      message: `E-mail enviado! Verifique a caixa de entrada de ${testEmail} (e também o spam).`,
      envStatus
    })
  } catch (err: any) {
    return NextResponse.json({
      success: false,
      error: err?.message || JSON.stringify(err),
      hint: 'Verifique se "Allow non-browser requests" está ativo em EmailJS → Account → Security',
      envStatus,
      sentPayload: {
        ...payload,
        accessToken: payload.accessToken ? `${payload.accessToken.substring(0, 8)}... (length: ${payload.accessToken.length})` : 'MISSING'
      }
    }, { status: 500 })
  }
}
