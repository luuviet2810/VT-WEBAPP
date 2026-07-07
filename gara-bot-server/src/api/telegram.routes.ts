import { Router } from 'express'
import { sendTaskNotification, sendCallbackAnswer } from '../telegram/bot.js'
import { getLinked, testMessage, getStatus as getBotStatus } from './telegram.service.js'
import { supabaseAdmin } from '../supabase.js'

const router = Router()

router.get('/status', async (req, res) => {
  try {
    const data = await getBotStatus()
    res.json(data)
  } catch (err) {
    console.error('[api] status failed', err)
    res.status(500).json({ ok: false, error: 'status_failed' })
  }
})

router.get('/linked', async (req, res) => {
  try {
    const linked = await getLinked()
    res.json({ ok: true, data: linked })
  } catch (err) {
    console.error('[api] linked failed', err)
    res.status(500).json({ ok: false, error: 'linked_failed' })
  }
})

router.post('/test', async (req, res) => {
  try {
    const { chatId } = req.body ?? {}
    if (!chatId) {
      return res.status(400).json({ ok: false, error: 'missing_chat_id' })
    }

    const result = await testMessage(Number(chatId))
    res.json(result)
  } catch (err) {
    console.error('[api] test failed', err)
    res.status(500).json({ ok: false, error: 'test_failed' })
  }
})

router.post('/notify', async (req, res) => {
  try {
    const { chatId, title, body, buttons, eventType } = req.body ?? {}
    if (!chatId || !title || !body) {
      return res.status(400).json({ ok: false, error: 'missing_fields' })
    }

    const telegramUserId = Number(chatId)
    const linked = await supabaseAdmin
      .from('telegram_users')
      .select('telegram_user_id, chat_id, is_active')
      .eq('chat_id', telegramUserId)
      .eq('is_active', true)
      .maybeSingle()

    if (linked.error || !linked.data) {
      return res.status(404).json({ ok: false, error: 'not_linked' })
    }

    await sendTaskNotification({
      chatId: Number(linked.data.chat_id),
      title,
      body,
      buttons: Array.isArray(buttons) ? buttons : undefined,
    })

    await supabaseAdmin.from('telegram_logs').insert({
      level: 'sent',
      chat_id: linked.data.chat_id,
      event_type: eventType ?? null,
    })

    res.json({ ok: true })
  } catch (err) {
    console.error('[api] notify failed', err)
    res.status(500).json({ ok: false, error: 'notify_failed' })
  }
})

router.post('/answer', async (req, res) => {
  try {
    const { callbackQueryId, text } = req.body ?? {}
    if (!callbackQueryId) {
      return res.status(400).json({ ok: false, error: 'missing_callback_query_id' })
    }

    await sendCallbackAnswer(callbackQueryId, text)
    res.json({ ok: true })
  } catch (err) {
    console.error('[api] answer failed', err)
    res.status(500).json({ ok: false, error: 'answer_failed' })
  }
})

export default router
