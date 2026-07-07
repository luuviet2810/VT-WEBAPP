/**
 * TelegramService
 *
 * Frontend client for the gara-bot-server backend API.
 *
 * Security:
 * - Bot token is NEVER stored in frontend
 * - All Telegram API calls go through backend
 * - Frontend only knows backend API URL
 */

import type {
  TelegramSendOptions,
  TelegramLogEntry,
  TelegramWebhookResult,
  TelegramCommand,
  TelegramUpdate,
} from '../types/telegram'
import { telegramConfig } from './telegramConfig.service'

const API_BASE = (() => {
  const config = telegramConfig.getConfig()
  const base = (config.webhookUrl || '').replace(/\/$/, '')
  return base ? `${base}/api/telegram` : ''
})()

function isBackendConfigured(): boolean {
  return telegramConfig.isEnabled() && !!API_BASE
}

async function apiCall(method: string, body: Record<string, unknown>): Promise<Record<string, unknown>> {
  const response = await fetch(`${API_BASE}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    throw new Error(`Backend API error: ${response.status} ${response.statusText}`)
  }

  return (await response.json()) as Promise<Record<string, unknown>>
}

export class TelegramService {
  private static instance: TelegramService

  static getInstance(): TelegramService {
    if (!TelegramService.instance) {
      TelegramService.instance = new TelegramService()
    }
    return TelegramService.instance
  }

  async sendMessage(
    chatId: string,
    text: string,
    options?: TelegramSendOptions
  ): Promise<{ messageId?: number; chatId?: string } | null> {
    if (!isBackendConfigured()) {
      return null
    }

    try {
      const result = await apiCall('notify', {
        chatId,
        title: text,
        body: text,
        eventType: 'custom',
        parseMode: options?.parseMode ?? 'MarkdownV2',
        buttons: options?.inlineKeyboard,
      })

      if ((result as any)?.ok) {
        return { chatId }
      }

      return null
    } catch (err) {
      console.error('[TelegramService] sendMessage failed', err)
      return null
    }
  }

  async sendToEmployee(
    employeeId: string,
    text: string,
    options?: TelegramSendOptions
  ): Promise<{ messageId?: number; chatId?: string } | null> {
    const chatId = telegramConfig.getChatIdByEmployee(employeeId)
    if (!chatId) {
      return null
    }
    return this.sendMessage(chatId, text, options)
  }

  async broadcastToAll(
    text: string,
    options?: TelegramSendOptions
  ): Promise<{ sent: number; failed: number }> {
    const mappings = telegramConfig.getChatMapping().filter((m) => m.enabled)
    let sent = 0
    let failed = 0

    for (const mapping of mappings) {
      const result = await this.sendMessage(mapping.telegramChatId, text, options)
      if (result) sent++
      else failed++
    }

    return { sent, failed }
  }

  async answerCallbackQuery(callbackQueryId: string, text?: string): Promise<boolean> {
    if (!isBackendConfigured()) {
      return false
    }

    try {
      const result = await apiCall('answer', { callbackQueryId, text })
      return (result as any)?.ok === true
    } catch (err) {
      console.error('[TelegramService] answerCallbackQuery failed', err)
      return false
    }
  }

  async editMessageText(_chatId: string, _messageId: number, _text: string): Promise<boolean> {
    return false
  }

  processUpdate(_update: TelegramUpdate): TelegramWebhookResult {
    return { ok: true, processed: false }
  }

  processCallbackQuery(_query: any): TelegramCommand {
    // Callback query parsing is handled by backend.
    return { type: 'unknown', raw: '' }
  }

  getLogs(): TelegramLogEntry[] {
    // Logs are stored/managed by backend. Frontend can fetch from backend if needed.
    return []
  }

  clearLogs(): void {
    // No-op: frontend no longer stores Telegram logs.
  }

  isConfigured(): boolean {
    return isBackendConfigured()
  }

  async getStatus(): Promise<Record<string, unknown>> {
    if (!isBackendConfigured()) {
      return { ok: false, configured: false }
    }

    try {
      const response = await fetch(`${API_BASE}/status`)
      if (!response.ok) {
        return { ok: false, configured: false }
      }
      return (await response.json()) as Promise<Record<string, unknown>>
    } catch {
      return { ok: false, configured: false }
    }
  }

  async getLinkedEmployees(): Promise<Record<string, unknown>[]> {
    if (!isBackendConfigured()) {
      return []
    }

    try {
      const response = await fetch(`${API_BASE}/linked`)
      if (!response.ok) {
        return []
      }
      const data = (await response.json()) as { ok: boolean; data: Record<string, unknown>[] }
      return data.data ?? []
    } catch {
      return []
    }
  }

  async sendTestMessage(chatId: string): Promise<boolean> {
    if (!isBackendConfigured()) {
      return false
    }

    try {
      const result = await apiCall('test', { chatId })
      return (result as any)?.ok === true
    } catch (err) {
      console.error('[TelegramService] sendTestMessage failed', err)
      return false
    }
  }
}

export const telegramService = TelegramService.getInstance()
