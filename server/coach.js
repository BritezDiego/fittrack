import express from 'express'
import cors from 'cors'
import Anthropic from '@anthropic-ai/sdk'

const app = express()
app.use(cors({ origin: ['http://localhost:5173', 'http://localhost:5174'] }))
app.use(express.json())

app.post('/api/coach', async (req, res) => {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return res.status(500).json({ error: 'ANTHROPIC_API_KEY no configurada en .env' })
  }

  const { prompt, imageUrls = [] } = req.body
  if (!prompt || typeof prompt !== 'string' || prompt.length > 8000) {
    return res.status(400).json({ error: 'Prompt inválido' })
  }

  const validImageUrls = imageUrls.slice(0, 4).filter(url => {
    try { new URL(url); return true } catch { return false }
  })

  try {
    const client = new Anthropic({ apiKey })

    const content = []
    for (const url of validImageUrls) {
      content.push({ type: 'image', source: { type: 'url', url } })
    }
    content.push({ type: 'text', text: prompt })

    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 2048,
      messages: [{ role: 'user', content }],
    })

    const responseContent = message.content
      .filter(b => b.type === 'text')
      .map(b => b.text)
      .join('\n')

    res.json({ content: responseContent })
  } catch (err) {
    res.status(500).json({ error: err.message ?? 'Error al llamar a la API de Anthropic' })
  }
})

const PORT = 3001
app.listen(PORT, () => console.log(`[coach-server] http://localhost:${PORT}`))
