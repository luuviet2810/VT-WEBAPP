import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import telegramRoutes from './api/telegram.routes.js'
import { setupTelegramBot, startBotPolling } from './telegram/bot.js'

const app = express()
app.use(cors())
app.use(express.json())

app.get('/health', (req, res) => {
  res.json({ ok: true, service: 'gara-bot-server' })
})

app.use('/api/telegram', telegramRoutes)

const port = Number(process.env.PORT || 3001)
app.listen(port, async () => {
  console.log(`[bot-server] listening on :${port}`)
  await setupTelegramBot()
  await startBotPolling()
})
