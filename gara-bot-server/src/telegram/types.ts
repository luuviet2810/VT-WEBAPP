import type { Context } from 'telegraf'

export interface GaraSession {
  linkedEmployeeId?: string
}

export interface StartLinkContext extends Context {
  session: GaraSession
  from: NonNullable<Context['from']>
  chatId: number
}

export interface LinkedTelegramUser {
  employee_id: string
  telegram_user_id: number
  chat_id: number
  username?: string | null
  first_name?: string | null
  last_name?: string | null
  language_code?: string | null
  is_active: boolean
  last_seen?: string | null
}
