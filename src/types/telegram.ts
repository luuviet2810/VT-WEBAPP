/**
 * Telegram Automation Types
 *
 * Central type definitions for the Telegram Automation Engine v1.
 * These types support the notification flow: Web App → Rule Engine → Telegram Bot → Staff.
 */

// ---- Telegram API Types ----

export interface TelegramConfig {
  botToken: string
  webhookUrl: string
  chatMapping: TelegramChatMapping[]
  notificationRules: TelegramNotificationRule[]
  retryPolicy: TelegramRetryPolicy
  enabled: boolean
}

export interface TelegramChatMapping {
  employeeId: string
  telegramChatId: string
  telegramUsername?: string
  enabled: boolean
}

export interface TelegramNotificationRule {
  eventType: TelegramEventType
  enabled: boolean
  targetRole: 'assignee' | 'manager' | 'all'
  priorityThreshold?: TaskPriority
}

export type TelegramEventType =
  | 'task_created'
  | 'task_assigned'
  | 'task_overdue'
  | 'vehicle_ready'
  | 'vehicle_sold'
  | 'workflow_changed'
  | 'approval_required'
  | 'daily_summary'

export interface TelegramRetryPolicy {
  maxRetries: number
  retryDelayMs: number
  exponentialBackoff: boolean
}

// ---- Telegram Send Options ----

export interface TelegramSendOptions {
  parseMode?: 'MarkdownV2' | 'HTML' | 'None'
  disableWebPagePreview?: boolean
  disableNotification?: boolean
  replyToMessageId?: number
  replyMarkup?: TelegramReplyMarkup
  inlineKeyboard?: TelegramInlineKeyboardButton[][]
  chatId?: string
}

export interface TelegramReplyMarkup {
  inlineKeyboard?: TelegramInlineKeyboardButton[][]
  resizeKeyboard?: boolean
  oneTimeKeyboard?: boolean
}

export interface TelegramInlineKeyboardButton {
  text: string
  url?: string
  callbackData?: string
}

// ---- Telegram Inbound Types ----

export interface TelegramUpdate {
  update_id: number
  message?: TelegramMessage
  editedMessage?: TelegramMessage
  callbackQuery?: TelegramCallbackQuery
  channelPost?: TelegramMessage
  editedChannelPost?: TelegramMessage
  inlineQuery?: unknown
  chosenInlineResult?: unknown
  shippingQuery?: unknown
  preCheckoutQuery?: unknown
  poll?: unknown
  pollAnswer?: unknown
}

export interface TelegramMessage {
  messageId: number
  from?: TelegramUser
  chat: TelegramChat
  date: number
  text?: string
  entities?: TelegramMessageEntity[]
  replyMarkup?: TelegramReplyMarkup
}

export interface TelegramUser {
  id: number
  isBot: boolean
  firstName: string
  lastName?: string
  username?: string
  languageCode?: string
}

export interface TelegramChat {
  id: number
  type: 'private' | 'group' | 'supergroup' | 'channel'
  title?: string
  username?: string
  firstName?: string
  lastName?: string
}

export interface TelegramMessageEntity {
  type: string
  offset: number
  length: number
  url?: string
  language?: string
}

export interface TelegramCallbackQuery {
  id: string
  from: TelegramUser
  message?: TelegramMessage
  inlineMessageId?: string
  data?: string
}

// ---- Notification Payload Types ----

export interface TelegramNotificationPayload {
  eventType: TelegramEventType
  employeeId?: string
  taskId?: string
  vehicleId?: string
  messageText: string
  inlineKeyboard?: TelegramInlineKeyboardButton[][]
  priority?: TaskPriority
  timestamp?: string
}

// ---- Command Types ----

export type TelegramCommand =
  | { type: 'start_task'; taskId: string; employeeId: string }
  | { type: 'complete_task'; taskId: string; employeeId: string }
  | { type: 'view_task'; taskId: string }
  | { type: 'approve'; entityId: string; employeeId: string }
  | { type: 'reject'; entityId: string; employeeId: string }
  | { type: 'help' }
  | { type: 'unknown'; raw: string }

// ---- Logging Types ----

export type TelegramLogLevel = 'sent' | 'delivered' | 'failed' | 'retried' | 'received' | 'callback'

export interface TelegramLogEntry {
  id: string
  timestamp: string
  level: TelegramLogLevel
  chatId?: string
  messageId?: number
  eventType?: TelegramEventType
  payload?: string
  error?: string
  retryCount?: number
}

// ---- Rule Engine Event ----

export interface TelegramRuleEngineEvent {
  type: TelegramEventType
  data: Record<string, unknown>
  timestamp: string
}

// ---- Task Priority (shared concept) ----

export type TaskPriority = 'urgent' | 'priority' | 'normal'

// ---- Supabase storage shape for telegram_settings ----

export interface TelegramSettingsRow {
  id: string
  bot_token: string
  webhook_url: string
  enabled: boolean
  created_at: string
  updated_at: string
}

export interface TelegramChatMappingRow {
  id: string
  employee_id: string
  telegram_chat_id: string
  telegram_username: string | null
  enabled: boolean
  created_at: string
}

export interface TelegramLogRow {
  id: string
  level: string
  chat_id: string | null
  message_id: number | null
  event_type: string | null
  payload: string | null
  error: string | null
  retry_count: number | null
  created_at: string
}

// ---- Webhook handler result ----

export interface TelegramWebhookResult {
  ok: boolean
  processed: boolean
  command?: TelegramCommand
  error?: string
}
