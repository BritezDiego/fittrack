import Anthropic from '@anthropic-ai/sdk'

async function urlToBase64(url: string): Promise<{ data: string; mediaType: string } | null> {
  try {
    const res = await fetch(url)
    if (!res.ok) return null
    const contentType = res.headers.get('content-type') ?? 'image/jpeg'
    const mediaType = contentType.split(';')[0].trim()
    const buffer = await res.arrayBuffer()
    const data = Buffer.from(buffer).toString('base64')
    return { data, mediaType }
  } catch {
    return null
  }
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 })
  }

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'ANTHROPIC_API_KEY no configurada' }), { status: 500 })
  }

  let body: { prompt?: string; imageUrls?: string[] }
  try {
    body = await req.json()
  } catch {
    return new Response(JSON.stringify({ error: 'Body inválido' }), { status: 400 })
  }

  const { prompt, imageUrls = [] } = body
  if (!prompt || typeof prompt !== 'string' || prompt.length > 8000) {
    return new Response(JSON.stringify({ error: 'Prompt inválido' }), { status: 400 })
  }

  try {
    const client = new Anthropic({ apiKey })

    const content: Anthropic.Messages.ContentBlockParam[] = []

    // Fetch images and convert to base64
    const validUrls = imageUrls.slice(0, 4).filter(url => {
      try { new URL(url); return true } catch { return false }
    })

    for (const url of validUrls) {
      const img = await urlToBase64(url)
      if (img) {
        content.push({
          type: 'image',
          source: {
            type: 'base64',
            media_type: img.mediaType as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp',
            data: img.data,
          },
        })
      }
    }

    content.push({ type: 'text', text: prompt })

    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 2048,
      messages: [{ role: 'user', content }],
    })

    const responseContent = message.content
      .filter(b => b.type === 'text')
      .map(b => (b as Anthropic.Messages.TextBlock).text)
      .join('\n')

    return new Response(JSON.stringify({ content: responseContent }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message ?? 'Error al llamar a la API' }),
      { status: 500 }
    )
  }
}

export const config = { path: '/api/coach', timeout: 26 }
