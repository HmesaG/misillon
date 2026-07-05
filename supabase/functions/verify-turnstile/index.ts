// verify-turnstile: valida server-side el token del widget Cloudflare
// Turnstile contra la Secret Key. Se llama ANTES de que el usuario tenga
// sesión (flujo de registro), por eso verify_jwt = false en config.toml:
// la invoca la anon key sin usuario autenticado. No expone ni modifica
// datos sensibles — solo confirma que el captcha fue resuelto por un
// humano. El anti-abuso lo aporta el propio Cloudflare (rate limiting y
// tokens de un solo uso con ~5 min de vigencia).

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const SITEVERIFY = 'https://challenges.cloudflare.com/turnstile/v0/siteverify'

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  const secret = Deno.env.get('TURNSTILE_SECRET_KEY')
  if (!secret) {
    console.error('TURNSTILE_SECRET_KEY no está configurada')
    return json({ success: false, error: 'Captcha mal configurado en el servidor.' }, 500)
  }

  let token: unknown
  try {
    const body = await req.json()
    token = body?.token
  } catch {
    return json({ success: false, error: 'Cuerpo inválido.' }, 400)
  }

  if (typeof token !== 'string' || !token) {
    return json({ success: false, error: 'Falta el token del captcha.' }, 400)
  }

  const form = new URLSearchParams()
  form.append('secret', secret)
  form.append('response', token)
  // remoteip es opcional; lo mandamos si el borde lo expone para reforzar la verificación.
  const ip = req.headers.get('CF-Connecting-IP') || req.headers.get('x-forwarded-for')
  if (ip) form.append('remoteip', ip.split(',')[0].trim())

  let outcome: { success?: boolean; 'error-codes'?: string[] }
  try {
    const resp = await fetch(SITEVERIFY, { method: 'POST', body: form })
    outcome = await resp.json()
  } catch (e) {
    console.error('siteverify falló:', e)
    return json({ success: false, error: 'No pudimos verificar el captcha. Intentá de nuevo.' }, 502)
  }

  if (outcome.success) return json({ success: true })

  console.error('captcha rechazado:', outcome['error-codes'])
  return json({ success: false, error: 'La verificación del captcha falló. Resolvelo de nuevo.' }, 200)
})
