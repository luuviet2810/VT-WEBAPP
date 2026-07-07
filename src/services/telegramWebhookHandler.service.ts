/**
 * TelegramWebhookHandler
 *
 * Processes inbound updates from Telegram (callback queries + text commands).
 *
 * Flow:
 * 1. Telegram sends update to configured webhookUrl (via bot backend/proxy)
 * 2. The proxy forwards the update to this handler via window.postMessage or fetch
 * 3. This handler parses the command and executes it via the store
 *
 * For a browser SPA, the webhook proxy would call a public endpoint that
 * forwards to this handler. In practice, this is implemented as:
 * - The bot backend receives the webhook from Telegram
 * - The bot backend POSTs the parsed command to the web app's API endpoint
 * - The web app processes the command via this handler
 *
 * SECURITY: Always validate that the sender is a known Telegram user via chat mapping.
 * Unknown users are rejected.
 */

import type { TelegramUpdate, TelegramCommand, TelegramWebhookResult } from '../types/telegram'
import { telegramService } from './telegram.service'
import { telegramConfig } from './telegramConfig.service'

// ---- Action handlers ----

type ActionResult = Promise<{ success: boolean; message?: string }>

async function handleStartTask(taskId: string, employeeId: string): ActionResult {
  // Find the Telegram user in chat mapping by telegram chat id = employeeId field
  // Note: employeeId in this context is the telegram chat ID string
  const mapping = telegramConfig.getChatMapping().find(
    (m) => m.telegramChatId === employeeId && m.enabled
  )

  if (!mapping) {
    return { success: false, message: 'Người dùng chưa được liên kết với tài khoản nhân viên' }
  }

  // Dispatch through store - the store's updateTask will call Supabase
  // We expose this via a custom event that the store can listen to
  const event = new CustomEvent('telegram:start_task', {
    detail: { taskId, employeeId: mapping.employeeId },
  })
  window.dispatchEvent(event)

  return { success: true, message: `Đã bắt đầu nhiệm vụ!` }
}

async function handleCompleteTask(taskId: string, employeeId: string): ActionResult {
  const mapping = telegramConfig.getChatMapping().find(
    (m) => m.telegramChatId === employeeId && m.enabled
  )

  if (!mapping) {
    return { success: false, message: 'Người dùng chưa được liên kết với tài khoản nhân viên' }
  }

  const event = new CustomEvent('telegram:complete_task', {
    detail: { taskId, employeeId: mapping.employeeId },
  })
  window.dispatchEvent(event)

  return { success: true, message: `Đã hoàn thành nhiệm vụ!` }
}

async function handleViewTask(taskId: string): ActionResult {
  // View is handled client-side by opening the URL - no server action needed
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : ''
  const url = `${baseUrl}/nhiem-vu/${taskId}`

  const event = new CustomEvent('telegram:view_task', {
    detail: { taskId, url },
  })
  window.dispatchEvent(event)

  return { success: true }
}

async function handleApprove(entityId: string, employeeId: string): ActionResult {
  const mapping = telegramConfig.getChatMapping().find(
    (m) => m.telegramChatId === employeeId && m.enabled
  )

  if (!mapping) {
    return { success: false, message: 'Người dùng chưa được liên kết với tài khoản nhân viên' }
  }

  const event = new CustomEvent('telegram:approve', {
    detail: { entityId, employeeId: mapping.employeeId },
  })
  window.dispatchEvent(event)

  return { success: true, message: `Đã phê duyệt!` }
}

async function handleReject(entityId: string, employeeId: string): ActionResult {
  const mapping = telegramConfig.getChatMapping().find(
    (m) => m.telegramChatId === employeeId && m.enabled
  )

  if (!mapping) {
    return { success: false, message: 'Người dùng chưa được liên kết với tài khoản nhân viên' }
  }

  const event = new CustomEvent('telegram:reject', {
    detail: { entityId, employeeId: mapping.employeeId },
  })
  window.dispatchEvent(event)

  return { success: true, message: `Đã từ chối.` }
}

async function handleHelp(): ActionResult {
  const helpText = [
    '📋 *Hướng dẫn sử dụng Gara Bot*',
    '',
    '• Nhấn *Bắt đầu* trên nhiệm vụ để bắt đầu làm việc',
    '• Nhấn *Hoàn thành* khi đã xong nhiệm vụ',
    '• Nhấn *Xem* để mở nhiệm vụ trên web',
    '• Nhấn *Phê duyệt/Từ chối* để xử lý yêu cầu',
    '',
    'Liên hệ quản lý nếu cần hỗ trợ.',
  ].join('\n')

  return { success: true, message: helpText }
}

// ---- Command executor ----

async function executeCommand(command: TelegramCommand): Promise<{ success: boolean; message?: string }> {
  switch (command.type) {
    case 'start_task':
      return handleStartTask(command.taskId, command.employeeId)
    case 'complete_task':
      return handleCompleteTask(command.taskId, command.employeeId)
    case 'view_task':
      return handleViewTask(command.taskId)
    case 'approve':
      return handleApprove(command.entityId, command.employeeId)
    case 'reject':
      return handleReject(command.entityId, command.employeeId)
    case 'help':
      return handleHelp()
    case 'unknown':
      return { success: false, message: 'Lệnh không nhận diện được. Gõ /help để xem hướng dẫn.' }
  }
}

// ---- Main handler ----

export async function handleTelegramWebhook(update: TelegramUpdate): Promise<TelegramWebhookResult> {
  const result = telegramService.processUpdate(update)

  if (!result.ok) {
    return result
  }

  if (!result.processed || !result.command) {
    return { ok: true, processed: false }
  }

  // Validate sender is a known mapped user
  const senderId = 'employeeId' in result.command ? result.command.employeeId : undefined
  if (senderId) {
    const isKnownUser = telegramConfig.getChatMapping().some(
      (m) => m.telegramChatId === senderId && m.enabled
    )
    if (!isKnownUser) {
      console.warn(`[TelegramWebhook] Rejected unknown sender: ${senderId}`)
      return {
        ok: true,
        processed: true,
        error: 'Người dùng chưa được phép sử dụng bot',
      }
    }
  }

  const actionResult = await executeCommand(result.command)

  // If there's a callback query, answer it
  if (update.callbackQuery) {
    const queryId = update.callbackQuery.id
    await telegramService.answerCallbackQuery(queryId, actionResult.message)

    // Also edit the original message to reflect the action
    if (update.callbackQuery.message) {
      const chatId = String(update.callbackQuery.message.chat.id)
      const messageId = update.callbackQuery.message.messageId
      const editedText = update.callbackQuery.message.text + `\n\n✅ Đã xử lý: ${actionResult.message}`
      await telegramService.editMessageText(chatId, messageId, editedText)
    }
  }

  return {
    ok: true,
    processed: true,
    command: result.command,
  }
}

// ---- Setup hook ----

type TelegramCommandHandler = (command: TelegramCommand, result: { success: boolean; message?: string }) => void

const handlers: TelegramCommandHandler[] = []

export function onTelegramCommand(handler: TelegramCommandHandler): () => void {
  handlers.push(handler)
  return () => {
    const idx = handlers.indexOf(handler)
    if (idx >= 0) handlers.splice(idx, 1)
  }
}

// ---- Event bridge for Telegram-initiated actions ----

/**
 * Call this from the store or a custom event listener to handle
 * Telegram-initiated task actions. The store listens to window events
 * dispatched by the webhook handler.
 */
export function setupTelegramEventBridge(
  onStartTask: (taskId: string, employeeId: string) => void,
  onCompleteTask: (taskId: string, employeeId: string) => void,
  onViewTask: (taskId: string, url: string) => void,
  onApprove: (entityId: string, employeeId: string) => void,
  onReject: (entityId: string, employeeId: string) => void
): () => void {
  const handlers: Array<[string, (e: Event) => void]> = [
    ['telegram:start_task', (e) => {
      const detail = (e as CustomEvent).detail as { taskId: string; employeeId: string }
      onStartTask(detail.taskId, detail.employeeId)
    }],
    ['telegram:complete_task', (e) => {
      const detail = (e as CustomEvent).detail as { taskId: string; employeeId: string }
      onCompleteTask(detail.taskId, detail.employeeId)
    }],
    ['telegram:view_task', (e) => {
      const detail = (e as CustomEvent).detail as { taskId: string; url: string }
      onViewTask(detail.taskId, detail.url)
    }],
    ['telegram:approve', (e) => {
      const detail = (e as CustomEvent).detail as { entityId: string; employeeId: string }
      onApprove(detail.entityId, detail.employeeId)
    }],
    ['telegram:reject', (e) => {
      const detail = (e as CustomEvent).detail as { entityId: string; employeeId: string }
      onReject(detail.entityId, detail.employeeId)
    }],
  ]

  handlers.forEach(([eventName, handler]) => {
    window.addEventListener(eventName, handler)
  })

  return () => {
    handlers.forEach(([eventName, handler]) => {
      window.removeEventListener(eventName, handler)
    })
  }
}
