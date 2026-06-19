export const config = { runtime: 'edge' }

export default async function handler(request) {
  const url = new URL(request.url)
  const code  = url.searchParams.get('code')
  const state = url.searchParams.get('state') || '/'

  if (!code) {
    return new Response('Missing auth code', { status: 400 })
  }

  // Exchange code for tokens
  const tokenRes = await fetch(
    `https://login.microsoftonline.com/${process.env.AZURE_TENANT_ID}/oauth2/v2.0/token`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id:     process.env.AZURE_CLIENT_ID,
        client_secret: process.env.AZURE_CLIENT_SECRET,
        code,
        redirect_uri:  `${url.origin}/api/auth/callback`,
        grant_type:    'authorization_code',
      }),
    }
  )

  const tokens = await tokenRes.json()
  if (!tokens.id_token) {
    return new Response('Authentication failed', { status: 401 })
  }

  // Decode ID token (no verification needed — we trust Microsoft's endpoint)
  const payload = JSON.parse(atob(tokens.id_token.split('.')[1]))
  const email   = payload.email || payload.preferred_username || ''
  const domain  = email.split('@')[1]?.toLowerCase()

  // Domain allowlist
  const allowed = (process.env.ALLOWED_DOMAINS || '')
    .split(',').map(d => d.trim().toLowerCase()).filter(Boolean)

  if (allowed.length > 0 && !allowed.includes(domain)) {
    return new Response(
      `Access denied. Your domain (${domain}) is not authorised to access this site.`,
      { status: 403 }
    )
  }

  // Create signed session cookie (8 hour expiry)
  const data = btoa(JSON.stringify({ email, exp: Date.now() + 8 * 3600 * 1000 }))
  const sig   = await sign(data, process.env.SESSION_SECRET)

  return new Response(null, {
    status: 302,
    headers: {
      Location:   state.startsWith('/') ? state : '/',
      'Set-Cookie': `__session=${data}|${sig}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${8 * 3600}`,
    },
  })
}

async function sign(data, secret) {
  const key = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  )
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(data))
  return Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('')
}
