export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 })
  }

  const apiUser = process.env.SIGHTENGINE_USER
  const apiSecret = process.env.SIGHTENGINE_SECRET
  if (!apiUser || !apiSecret) {
    return new Response(JSON.stringify({ error: 'Sightengine no configurado' }), { status: 500 })
  }

  let body: { image: string; mediaType: string }
  try {
    body = await req.json()
  } catch {
    return new Response(JSON.stringify({ error: 'Body inválido' }), { status: 400 })
  }

  try {
    const buffer = Buffer.from(body.image, 'base64')
    const blob = new Blob([buffer], { type: body.mediaType || 'image/jpeg' })

    const formData = new FormData()
    formData.append('media', blob, 'image.jpg')
    formData.append('models', 'nudity')
    formData.append('api_user', apiUser)
    formData.append('api_secret', apiSecret)

    const res = await fetch('https://api.sightengine.com/1.0/check.json', {
      method: 'POST',
      body: formData,
    })

    const data = await res.json()

    if (data.status !== 'success') {
      // Si Sightengine falla, permitimos la foto (no bloqueamos por error técnico)
      return new Response(JSON.stringify({ nude: false }), { status: 200 })
    }

    const nudity = data.nudity ?? {}
    const nude =
      (nudity.sexual_activity ?? 0) > 0.5 ||
      (nudity.sexual_display ?? 0) > 0.5 ||
      (nudity.raw ?? 0) > 0.5

    return new Response(JSON.stringify({ nude }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch {
    return new Response(JSON.stringify({ nude: false }), { status: 200 })
  }
}

export const config = { path: '/api/moderation', timeout: 15 }
