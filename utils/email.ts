export async function sendOtpEmail(email: string, otp: string) {
  const serviceId = 'service_hwdokgj'
  const templateId = 'template_xusbq4m'
  const publicKey = process.env.EMAILJS_PUBLIC_KEY
  const privateKey = process.env.EMAILJS_PRIVATE_KEY

  if (!publicKey) {
    throw new Error('EMAILJS_PUBLIC_KEY environment variable is missing')
  }

  const payload = {
    service_id: serviceId,
    template_id: templateId,
    user_id: publicKey,
    accessToken: privateKey, // Optional, depending on EmailJS settings, mas recomendado para server-side
    template_params: {
      to_email: email,
      otp_code: otp
    }
  }

  const response = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload)
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`EmailJS Error: ${text}`)
  }

  return true
}
