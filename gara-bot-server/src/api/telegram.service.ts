import type { LinkedTelegramUser } from '../telegram/types.js'
import { supabaseAdmin } from '../supabase.js'

export async function getStatus() {
  const linked = await getLinked()
  const health = {
    ok: true,
    botConfigured: Boolean(process.env.TELEGRAM_BOT_TOKEN),
    webhookConfigured: Boolean(process.env.TELEGRAM_WEBHOOK_URL),
    linkedUsersCount: linked.length,
  }

  return { ok: true, data: health }
}

export async function getLinked() {
  const rows = await supabaseAdmin
    .from('telegram_users')
    .select('employee_id, telegram_user_id, chat_id, username, first_name, last_name, language_code, is_active, last_seen, created_at')
    .order('created_at', { ascending: false })

  const linked = ((rows.data as LinkedTelegramUser[] | null) ?? []).map((item) => ({
    ...item,
    id: `${item.telegram_user_id}`,
  }))

  return linked
}

export async function testMessage(chatId: number, text = '🧪 Tin nhắn test từ gara-bot-server') {
  const { bot } = await import('../telegram/bot.js')
  await bot.telegram.sendMessage(chatId, text)
  return { ok: true }
}
