export type EmailTemplateParams = {
  to_email: string;
  title: string;
  badge?: string;
  user_name?: string;
  message: string;
  code_label?: string;
  code?: string;
  code_description?: string;
  button_text?: string;
  button_link?: string;
  security_message?: string;
  footer_message?: string;
}

export async function sendSystemEmail(params: EmailTemplateParams) {
  const serviceId = 'service_hwdokgj'
  const templateId = 'template_xusbq4m'
  const publicKey = process.env.EMAILJS_PUBLIC_KEY
  const privateKey = process.env.EMAILJS_PRIVATE_KEY
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

  if (!publicKey) {
    throw new Error('EMAILJS_PUBLIC_KEY está ausente nas variáveis de ambiente.')
  }

  if (!params.to_email || !params.title || !params.message) {
    throw new Error('Campos obrigatórios ausentes: to_email, title, message.')
  }

  // Construir link do botão com URL base
  let formattedButtonLink = params.button_link || ''
  if (formattedButtonLink && !formattedButtonLink.startsWith('http')) {
    formattedButtonLink = `${appUrl}${formattedButtonLink.startsWith('/') ? '' : '/'}${formattedButtonLink}`
  }

  const payload = {
    service_id: serviceId,
    template_id: templateId,
    user_id: publicKey,
    accessToken: privateKey,
    template_params: {
      to_email: params.to_email,
      title: params.title,
      badge: params.badge || '',
      user_name: params.user_name || '',
      message: params.message,
      code_label: params.code_label || '',
      code: params.code || '',
      code_description: params.code_description || '',
      button_text: params.button_text || '',
      button_link: formattedButtonLink,
      security_message: params.security_message || 'Caso você não tenha solicitado esta ação, desconsidere esta mensagem. Sua conta permanece segura.',
      footer_message: params.footer_message || 'EchoMind © Todos os direitos reservados.'
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

    console.log(`✅ E-mail enviado com sucesso para ${params.to_email}`)
    return true
  } catch (err: any) {
    console.error('❌ EmailJS erro:', err)
    throw new Error(`Falha no envio de e-mail: ${err.message}`)
  }
}
