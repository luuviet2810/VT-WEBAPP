import type { LinkedTelegramUser } from './types.js'
import { supabaseAdmin } from '../supabase.js'

export async function findLinkedUser(telegramUserId: number): Promise<LinkedTelegramUser | null> {
  const { data, error } = await supabaseAdmin
    .from('telegram_users')
    .select('*')
    .eq('telegram_user_id', telegramUserId)
    .eq('is_active', true)
    .maybeSingle()

  if (error || !data) return null
  return data as LinkedTelegramUser
}

export async function linkTelegramToEmployee(params: {
  employeeId: string
  telegramUserId: number
  chatId: number
  username?: string
  firstName?: string
  lastName?: string
  languageCode?: string
}): Promise<{ ok: boolean; error?: string }> {
  const payload = {
    employee_id: params.employeeId,
    telegram_user_id: params.telegramUserId,
    chat_id: params.chatId,
    username: params.username ?? null,
    first_name: params.firstName ?? null,
    last_name: params.lastName ?? null,
    language_code: params.languageCode ?? null,
    is_active: true,
    last_seen: new Date().toISOString(),
  }

  const { data: existing } = await supabaseAdmin
    .from('telegram_users')
    .select('employee_id, telegram_user_id')
    .eq('telegram_user_id', params.telegramUserId)
    .maybeSingle()

  if (existing) {
    const { error } = await supabaseAdmin
      .from('telegram_users')
      .update(payload)
      .eq('telegram_user_id', params.telegramUserId)
    return { ok: !error, error: error?.message }
  }

  const { error } = await supabaseAdmin
    .from('telegram_users')
    .insert(payload)
    .select('employee_id')
    .single()

  return { ok: !error, error: error?.message }
}

export async function getLinkedEmployeeIdForChatId(chatId: number): Promise<string | null> {
  const { data, error } = await supabaseAdmin
    .from('telegram_users')
    .select('employee_id')
    .eq('chat_id', chatId)
    .eq('is_active', true)
    .maybeSingle()

  if (error || !data) return null
  return data.employee_id as string
}

export async function markLastSeen(chatId: number): Promise<void> {
  await supabaseAdmin
    .from('telegram_users')
    .update({ last_seen: new Date().toISOString() })
    .eq('chat_id', chatId)
}

export async function getLinkedEmployees(): Promise<LinkedTelegramUser[]> {
  const { data, error } = await supabaseAdmin
    .from('telegram_users')
    .select('*')
    .order('created_at', { ascending: false })

  if (error || !data) return []
  return data as LinkedTelegramUser[]
}

export async function ensureLinkedFromStart(ctx: { from?: { id: number; username?: string; first_name?: string; last_name?: string; language_code?: string }; chat: { id: number } }): Promise<{ linked: boolean; employeeId?: string }> {
  const telegramUserId = ctx.from?.id
  if (!telegramUserId) {
    return { linked: false }
  }

  const linked = await findLinkedUser(telegramUserId)
  if (linked) {
    await markLastSeen(linked.chat_id)
    return { linked: true, employeeId: linked.employee_id }
  }

  return { linked: false }
}

export async function buildStartLinkPayload(ctx: { from?: { id: number; username?: string; first_name?: string; last_name?: string; language_code?: string }; chat: { id: number } }) {
  const telegramUserId = ctx.from?.id
  const chatId = ctx.chat.id
  if (!telegramUserId || !ctx.from) return null

  const from = ctx.from
  const linkPayload = {
    employee_id: `TG:${telegramUserId}`,
    telegram_user_id: telegramUserId,
    chat_id: chatId,
    username: from.username ?? null,
    first_name: from.first_name ?? null,
    last_name: from.last_name ?? null,
    language_code: from.language_code ?? null,
    is_active: true,
    last_seen: new Date().toISOString(),
  }

  return linkPayload
}
