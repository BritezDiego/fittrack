import express from 'express'
import cors from 'cors'
import Anthropic from '@anthropic-ai/sdk'

const app = express()
app.use(cors({ origin: 'http://localhost:5173' }))
app.use(express.json())

app.post('/api/coach', async (req, res) => {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return res.status(500).json({ error: 'ANTHROPIC_API_KEY no configurada en .env' })
  }

  const { prompt } = req.body
  if (!prompt || typeof prompt !== 'string' || prompt.length > 8000) {
    return res.status(400).json({ error: 'Prompt inválido' })
  }

  try {
    const client = new Anthropic({ apiKey })
    const message = await client.messages.create({
      model: 'claude-opus-4-6',
      max_tokens: 2048,
      messages: [{ role: 'user', content: prompt }],
    })
    const content = message.content
      .filter(b => b.type === 'text')
      .map(b => b.text)
      .join('\n')
    res.json({ content })
  } catch (err) {
    res.status(500).json({ error: err.message ?? 'Error al llamar a la API de Anthropic' })
  }
})

const PORT = 3001
app.listen(PORT, () => console.log(`[coach-server] http://localhost:${PORT}`))
