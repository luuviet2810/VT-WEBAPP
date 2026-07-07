import { Telegraf, Markup } from 'telegraf'
import type { GaraSession } from './types.js'
import { buildStartLinkPayload, ensureLinkedFromStart, linkTelegramToEmployee, markLastSeen } from './link.service.js'

export const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN as string)

bot.use((ctx, next) => next())

bot.on('text', async (ctx) => {
  await markLastSeen(ctx.chat.id)
  await ctx.reply('Xin chào! Dùng menu bên dưới hoặc gửi /help để xem hướng dẫn.')
})

bot.command('start', async (ctx) => {
  const linked = await ensureLinkedFromStart(ctx)

  if (linked.linked && linked.employeeId) {
    await ctx.reply(
      `✅ Tài khoản đã liên kết với nhân viên: ${linked.employeeId}\nBạn sẽ nhận thông báo công việc từ bot này.`,
      Markup.keyboard([
        Markup.button.callback('📋 Việc của tôi', 'menu:my_tasks'),
        Markup.button.callback('ℹ️ Trạng thái', 'menu:status'),
      ]).resize()
    )
    return
  }

  const payload = await buildStartLinkPayload(ctx)
  if (!payload) {
    await ctx.reply('Không thể đọc thông tin Telegram. Vui lòng thử lại sau.')
    return
  }

  await ctx.reply(
    '🔗 Liên kết tài khoản nhân viên\n\nNhấn nút bên dưới để liên kết tài khoản Telegram này với nhân viên của bạn.',
    Markup.inlineKeyboard([
      Markup.button.callback('Liên kết tài khoản', `link_start:${payload.employee_id};${payload.telegram_user_id};${payload.chat_id}`),
    ])
  )
})

bot.action(/^link_start:.+/, async (ctx) => {
  const callbackQuery = ctx.callbackQuery
  if (!callbackQuery || !('data' in callbackQuery)) {
    await ctx.answerCbQuery('Dữ liệu không hợp lệ')
    return
  }

  const raw = callbackQuery.data.split(':')[1]
  const [employeeId, telegramUserIdStr, chatIdStr] = raw.split(';')

  const telegramUserId = Number(telegramUserIdStr)
  const chatId = Number(chatIdStr)
  if (!employeeId || Number.isNaN(telegramUserId) || Number.isNaN(chatId)) {
    await ctx.answerCbQuery('Dữ liệu liên kết không hợp lệ')
    return
  }

  const from = ctx.from
  if (!from) {
    await ctx.answerCbQuery('Không thể đọc thông tin Telegram người dùng')
    return
  }

  const result = await linkTelegramToEmployee({
    employeeId,
    telegramUserId,
    chatId,
    username: from.username ?? undefined,
    firstName: from.first_name ?? undefined,
    lastName: from.last_name ?? undefined,
    languageCode: from.language_code ?? undefined,
  })

  if (!result.ok) {
    await ctx.answerCbQuery(`Liên kết thất bại: ${result.error}`)
    return
  }

  await ctx.answerCbQuery('Đã liên kết!')
  await ctx.editMessageText('✅ Liên kết thành công! Bạn sẽ nhận thông báo công việc từ bot.')
})

bot.action('menu:my_tasks', async (ctx) => {
  await ctx.answerCbQuery('Mở danh sách việc của bạn trên web...')
  await ctx.reply('Mở danh sách việc của bạn tại trang web.')
})

bot.action('menu:status', async (ctx) => {
  await ctx.answerCbQuery('Đang kiểm tra trạng thái...')
  await ctx.reply('Trạng thái liên kết: ✅ Đã liên kết')
})

bot.command('help', async (ctx) => {
  await ctx.reply(
    [
      '📋 Hướng dẫn sử dụng Gara Bot',
      '',
      '• Gửi /start để liên kết tài khoản',
      '• Nhấn Bắt đầu để bắt đầu công việc',
      '• Nhấn Hoàn thành khi xong',
      '• Nhấn Xem để mở trang web',
      '',
      'Liên hệ quản lý nếu cần hỗ trợ.',
    ].join('\n')
  )
})

export async function setupTelegramBot() {
  const webhookUrl = process.env.TELEGRAM_WEBHOOK_URL
    ? `${process.env.TELEGRAM_WEBHOOK_URL}/api/telegram/webhook`
    : undefined

  if (webhookUrl) {
    await bot.telegram.setWebhook(webhookUrl, { secret_token: process.env.TELEGRAM_WEBHOOK_SECRET })
    console.log(`[bot] webhook set to ${webhookUrl}`)
  } else {
    console.log('[bot] TELEGRAM_WEBHOOK_URL not set; using polling in development')
  }
}

export async function startBotPolling() {
  await bot.launch()
}

export async function stopBot() {
  await bot.stop()
}

export async function sendTaskNotification(params: { chatId: number; title: string; body: string; buttons?: string[] }) {
  await bot.telegram.sendMessage(params.chatId, `${params.title}\n\n${params.body}`)
}

export async function sendCallbackAnswer(callbackQueryId: string, text?: string) {
  await bot.telegram.answerCbQuery(callbackQueryId, text)
}
