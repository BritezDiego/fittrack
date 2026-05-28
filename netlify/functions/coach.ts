import Anthropic from '@anthropic-ai/sdk'

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

  const client = new Anthropic({ apiKey })

  const content: Anthropic.Messages.ContentBlockParam[] = []

  const validUrls = imageUrls.slice(0, 10).filter(url => {
    try { new URL(url); return true } catch { return false }
  })

  // Descargar imágenes y convertir a base64 para evitar errores de acceso
  // (Anthropic no puede acceder a URLs privadas/protegidas de Supabase)
  for (const url of validUrls) {
    try {
      const res = await fetch(url)
      if (!res.ok) continue
      const buffer = await res.arrayBuffer()
      const base64 = Buffer.from(buffer).toString('base64')
      const rawType = res.headers.get('content-type') ?? 'image/jpeg'
      const mediaType = rawType.split(';')[0].trim() as
        | 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp'
      content.push({
        type: 'image',
        source: { type: 'base64', media_type: mediaType, data: base64 },
      })
    } catch {
      // Si la imagen no se puede descargar, se omite silenciosamente
    }
  }

  content.push({ type: 'text', text: prompt })

  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const anthropicStream = client.messages.stream({
          model: 'claude-sonnet-4-6',
          max_tokens: 6000,
          messages: [{ role: 'user', content }],
        })

        for await (const chunk of anthropicStream) {
          if (
            chunk.type === 'content_block_delta' &&
            chunk.delta.type === 'text_delta'
          ) {
            const data = JSON.stringify({ text: chunk.delta.text })
            controller.enqueue(encoder.encode(`data: ${data}\n\n`))
          }
        }

        controller.enqueue(encoder.encode('data: [DONE]\n\n'))
      } catch (err: any) {
        const data = JSON.stringify({ error: err.message ?? 'Error en la API' })
        controller.enqueue(encoder.encode(`data: ${data}\n\n`))
      } finally {
        controller.close()
      }
    },
  })

  return new Response(stream, {
    status: 200,
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  })
}

export const config = { path: '/api/coach', timeout: 26 }
