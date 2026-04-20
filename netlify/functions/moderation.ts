import Anthropic from '@anthropic-ai/sdk'

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 })
  }

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'API key no configurada' }), { status: 500 })
  }

  let body: { image: string; mediaType: string }
  try {
    body = await req.json()
  } catch {
    return new Response(JSON.stringify({ error: 'Body inválido' }), { status: 400 })
  }

  const client = new Anthropic({ apiKey })

  try {
    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 10,
      messages: [{
        role: 'user',
        content: [
          {
            type: 'image',
            source: {
              type: 'base64',
              media_type: body.mediaType as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp',
              data: body.image,
            },
          },
          {
            type: 'text',
            text: 'Eres un sistema de moderación de contenido para una app de fitness. Analizá esta imagen y determiná si contiene desnudez explícita (genitales o zona púbica expuesta). Una foto de torso sin ropa, en corpiño, o ropa deportiva ajustada NO es desnudez explícita. Respondé ÚNICAMENTE con "SI" o "NO".',
          },
        ],
      }],
    })

    const text = ((response.content[0] as any).text ?? '').trim().toUpperCase()
    const nude = text.startsWith('SI') || text.startsWith('SÍ')

    return new Response(JSON.stringify({ nude }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch {
    // Si Claude rechaza analizar la imagen, la bloqueamos por precaución
    return new Response(JSON.stringify({ nude: true }), { status: 200 })
  }
}

export const config = { path: '/api/moderation', timeout: 15 }
