/**
 * TelegramNotificationFormatter
 *
 * Formats business events into Telegram-ready messages.
 * Uses Telegram MarkdownV2 for rich formatting.
 *
 * All messages follow the spec: include Vehicle, Task, Priority, Workflow, Employee.
 */

import type {
  TelegramNotificationPayload,
  TelegramInlineKeyboardButton,
  TelegramEventType,
  TaskPriority,
} from '../types/telegram'

// ---- Vietnamese labels ----

const PRIORITY_LABELS: Record<TaskPriority, string> = {
  urgent: 'Làm gấp',
  priority: 'Ưu tiên hơn',
  normal: 'Cứ từ từ',
}

const STATUS_LABELS: Record<string, string> = {
  todo: 'Chờ làm',
  doing: 'Đang làm',
  done: 'Hoàn thành',
  available: 'Chưa bán',
  deposited: 'Đã cọc',
  sold: 'Đã bán',
  new: 'Mới',
  input: 'Tiếp nhận',
  working: 'Đang xử lý',
  final_check: 'Kiểm tra cuối',
  ready: 'Sẵn sàng',
}

const EVENT_LABELS: Record<TelegramEventType, string> = {
  task_created: 'Nhiệm vụ mới',
  task_assigned: 'Nhiệm vụ được giao',
  task_overdue: 'Nhiệm vụ quá hạn',
  vehicle_ready: 'Xe sẵn sàng',
  vehicle_sold: 'Xe đã bán',
  workflow_changed: 'Cập nhật tiến độ',
  approval_required: 'Cần phê duyệt',
  daily_summary: 'Tổng hợp ngày',
}

// ---- MarkdownV2 escape ----

/**
 * Escape special characters for Telegram MarkdownV2.
 * Characters: _ * [ ] ( ) ~ ` > # + - = | { } . !
 * Note: Does NOT escape newline - use \n explicitly.
 */
function escapeMD2(text: string): string {
  return text.replace(/([_\[\]()~`>#+\-=|{}.!])/g, '\\$1')
}

function escapeText(text: string | undefined | null): string {
  if (!text) return ''
  return escapeMD2(String(text))
}

// ---- Priority emoji ----

function priorityEmoji(priority: TaskPriority): string {
  const map: Record<TaskPriority, string> = {
    urgent: '🔴',
    priority: '🟠',
    normal: '🟡',
  }
  return map[priority]
}

function statusEmoji(status: string): string {
  const map: Record<string, string> = {
    todo: '⏳',
    doing: '🔧',
    done: '✅',
    available: '🟢',
    deposited: '💰',
    sold: '🏁',
    new: '🆕',
    input: '📥',
    working: '🔧',
    final_check: '🔍',
    ready: '✨',
    overdue: '⏰',
  }
  return map[status] ?? '📋'
}

// ---- Base message builder ----

function buildHeader(eventType: TelegramEventType): string {
  const emoji = {
    task_created: '🆕',
    task_assigned: '👤',
    task_overdue: '⏰',
    vehicle_ready: '✨',
    vehicle_sold: '🏁',
    workflow_changed: '🔄',
    approval_required: '⚠️',
    daily_summary: '📊',
  }[eventType] ?? '📋'

  return `${emoji} *${escapeMD2(EVENT_LABELS[eventType])}*\n`
}

function buildField(label: string, value: string): string {
  return `  ▸ ${escapeMD2(label)}: ${escapeMD2(value)}\n`
}

// ---- Formatters ----

export function formatTaskCreated(
  taskTitle: string,
  vehiclePlate: string | undefined,
  vehicleModel: string | undefined,
  priority: TaskPriority,
  assigneeName: string | undefined,
  taskId: string,
  baseUrl: string
): TelegramNotificationPayload {
  const lines = [buildHeader('task_created')]

  if (vehiclePlate) {
    lines.push(buildField('Biển số', vehiclePlate))
  }
  if (vehicleModel) {
    lines.push(buildField('Dòng xe', vehicleModel))
  }
  lines.push(buildField('Nhiệm vụ', taskTitle))
  lines.push(buildField('Ưu tiên', `${priorityEmoji(priority)} ${PRIORITY_LABELS[priority]}`))
  if (assigneeName) {
    lines.push(buildField('Người nhận', assigneeName))
  }

  const messageText = lines.join('').trim()

  const inlineKeyboard: TelegramInlineKeyboardButton[][] = [
    [
      { text: '▶ Bắt đầu', callbackData: `start:${taskId}` },
      { text: '👁 Xem', callbackData: `view:${taskId}` },
    ],
  ]

  return {
    eventType: 'task_created',
    taskId,
    messageText,
    inlineKeyboard,
    priority,
    timestamp: new Date().toISOString(),
  }
}

export function formatTaskAssigned(
  taskTitle: string,
  vehiclePlate: string | undefined,
  vehicleModel: string | undefined,
  priority: TaskPriority,
  assigneeName: string,
  taskId: string
): TelegramNotificationPayload {
  const lines = [buildHeader('task_assigned')]

  if (vehiclePlate) {
    lines.push(buildField('Biển số', vehiclePlate))
  }
  if (vehicleModel) {
    lines.push(buildField('Dòng xe', vehicleModel))
  }
  lines.push(buildField('Nhiệm vụ', taskTitle))
  lines.push(buildField('Ưu tiên', `${priorityEmoji(priority)} ${PRIORITY_LABELS[priority]}`))
  lines.push(buildField('Người nhận', assigneeName))

  const messageText = lines.join('').trim()

  const inlineKeyboard: TelegramInlineKeyboardButton[][] = [
    [
      { text: '▶ Bắt đầu', callbackData: `start:${taskId}` },
      { text: '👁 Xem', callbackData: `view:${taskId}` },
    ],
  ]

  return {
    eventType: 'task_assigned',
    taskId,
    messageText,
    inlineKeyboard,
    priority,
    timestamp: new Date().toISOString(),
  }
}

export function formatTaskOverdue(
  taskTitle: string,
  vehiclePlate: string | undefined,
  vehicleModel: string | undefined,
  priority: TaskPriority,
  daysOverdue: number,
  taskId: string,
  assigneeId?: string
): TelegramNotificationPayload {
  const lines = [buildHeader('task_overdue')]

  if (vehiclePlate) {
    lines.push(buildField('Biển số', vehiclePlate))
  }
  if (vehicleModel) {
    lines.push(buildField('Dòng xe', vehicleModel))
  }
  lines.push(buildField('Nhiệm vụ', taskTitle))
  lines.push(buildField('Quá hạn', `${daysOverdue} ngày`))
  lines.push(buildField('Ưu tiên', `${priorityEmoji(priority)} ${PRIORITY_LABELS[priority]}`))

  const messageText = lines.join('').trim()

  const inlineKeyboard: TelegramInlineKeyboardButton[][] = [
    [
      { text: '▶ Bắt đầu ngay', callbackData: `start:${taskId}` },
      { text: '✅ Hoàn thành', callbackData: `complete:${taskId}` },
    ],
  ]

  return {
    eventType: 'task_overdue',
    taskId,
    employeeId: assigneeId,
    messageText,
    inlineKeyboard,
    priority: priority,
    timestamp: new Date().toISOString(),
  }
}

export function formatVehicleReady(
  vehiclePlate: string,
  vehicleModel: string,
  vehicleId: string,
  baseUrl: string
): TelegramNotificationPayload {
  const lines = [buildHeader('vehicle_ready')]

  lines.push(buildField('Biển số', vehiclePlate))
  lines.push(buildField('Dòng xe', vehicleModel))
  lines.push(buildField('Trạng thái', `${statusEmoji('ready')} Sẵn sàng bán`))

  const messageText = lines.join('').trim()

  const viewUrl = `${baseUrl}/xe/${vehicleId}`

  const inlineKeyboard: TelegramInlineKeyboardButton[][] = [
    [
      { text: '👁 Xem xe', url: viewUrl },
      { text: '💰 Bán xe', callbackData: `sell:${vehicleId}` },
    ],
  ]

  return {
    eventType: 'vehicle_ready',
    vehicleId,
    messageText,
    inlineKeyboard,
    timestamp: new Date().toISOString(),
  }
}

export function formatVehicleSold(
  vehiclePlate: string,
  vehicleModel: string,
  sellPrice: number | undefined,
  vehicleId: string,
  baseUrl: string
): TelegramNotificationPayload {
  const lines = [buildHeader('vehicle_sold')]

  lines.push(buildField('Biển số', vehiclePlate))
  lines.push(buildField('Dòng xe', vehicleModel))
  if (sellPrice !== undefined) {
    lines.push(buildField('Giá bán', new Intl.NumberFormat('vi-VN').format(sellPrice) + ' VNĐ'))
  }
  lines.push(buildField('Trạng thái', `${statusEmoji('sold')} Đã bán`))

  const messageText = lines.join('').trim()

  const viewUrl = `${baseUrl}/xe/${vehicleId}`

  const inlineKeyboard: TelegramInlineKeyboardButton[][] = [
    [{ text: '👁 Xem xe', url: viewUrl }],
  ]

  return {
    eventType: 'vehicle_sold',
    vehicleId,
    messageText,
    inlineKeyboard,
    timestamp: new Date().toISOString(),
  }
}

export function formatWorkflowChanged(
  vehiclePlate: string,
  vehicleModel: string,
  fromStatus: string,
  toStatus: string,
  employeeName: string | undefined,
  vehicleId: string,
  baseUrl: string
): TelegramNotificationPayload {
  const lines = [buildHeader('workflow_changed')]

  lines.push(buildField('Biển số', vehiclePlate))
  lines.push(buildField('Dòng xe', vehicleModel))
  lines.push(buildField('Trạng thái cũ', `${statusEmoji(fromStatus)} ${STATUS_LABELS[fromStatus] ?? fromStatus}`))
  lines.push(buildField('Trạng thái mới', `${statusEmoji(toStatus)} ${STATUS_LABELS[toStatus] ?? toStatus}`))
  if (employeeName) {
    lines.push(buildField('Người cập nhật', employeeName))
  }

  const messageText = lines.join('').trim()

  const viewUrl = `${baseUrl}/xe/${vehicleId}`

  const inlineKeyboard: TelegramInlineKeyboardButton[][] = [
    [{ text: '👁 Xem xe', url: viewUrl }],
  ]

  return {
    eventType: 'workflow_changed',
    vehicleId,
    messageText,
    inlineKeyboard,
    timestamp: new Date().toISOString(),
  }
}

export function formatApprovalRequired(
  entityType: string,
  entityName: string,
  requesterName: string,
  entityId: string,
  baseUrl: string
): TelegramNotificationPayload {
  const lines = [buildHeader('approval_required')]

  lines.push(buildField('Loại', entityType))
  lines.push(buildField('Nội dung', entityName))
  lines.push(buildField('Người yêu cầu', requesterName))

  const messageText = lines.join('').trim()

  const inlineKeyboard: TelegramInlineKeyboardButton[][] = [
    [
      { text: '✅ Phê duyệt', callbackData: `approve:${entityId}` },
      { text: '❌ Từ chối', callbackData: `reject:${entityId}` },
    ],
    [{ text: '👁 Xem chi tiết', url: `${baseUrl}/nhan-vien` }],
  ]

  return {
    eventType: 'approval_required',
    employeeId: entityId,
    messageText,
    inlineKeyboard,
    timestamp: new Date().toISOString(),
  }
}

export function formatTaskComplete(
  taskTitle: string,
  vehiclePlate: string | undefined,
  vehicleModel: string | undefined,
  completedByName: string,
  taskId: string,
  baseUrl: string
): TelegramNotificationPayload {
  const lines: string[] = []
  lines.push('✅ *Hoàn thành nhiệm vụ*\n')

  if (vehiclePlate) {
    lines.push(buildField('Biển số', vehiclePlate))
  }
  if (vehicleModel) {
    lines.push(buildField('Dòng xe', vehicleModel))
  }
  lines.push(buildField('Nhiệm vụ', taskTitle))
  lines.push(buildField('Người thực hiện', completedByName))

  const messageText = lines.join('').trim()

  const inlineKeyboard: TelegramInlineKeyboardButton[][] = [
    [{ text: '👁 Xem nhiệm vụ', callbackData: `view:${taskId}` }],
  ]

  return {
    eventType: 'task_created', // reuse
    taskId,
    messageText,
    inlineKeyboard,
    timestamp: new Date().toISOString(),
  }
}

export function formatDailySummary(
  stats: {
    totalVehicles: number
    newVehicles: number
    soldVehicles: number
    tasksTodo: number
    tasksDoing: number
    tasksDone: number
    tasksOverdue: number
  }
): TelegramNotificationPayload {
  const lines: string[] = []
  lines.push('📊 *Tổng hợp ngày*\n')

  lines.push(buildField('Tổng xe', String(stats.totalVehicles)))
  lines.push(buildField('Xe mới', String(stats.newVehicles)))
  lines.push(buildField('Xe bán', String(stats.soldVehicles)))
  lines.push('─'.repeat(20) + '\n')
  lines.push(buildField('Nhiệm vụ chờ', String(stats.tasksTodo)))
  lines.push(buildField('Đang làm', String(stats.tasksDoing)))
  lines.push(buildField('Hoàn thành', String(stats.tasksDone)))
  if (stats.tasksOverdue > 0) {
    lines.push(buildField('Quá hạn', `🔴 ${stats.tasksOverdue}`))
  }

  const messageText = lines.join('').trim()

  return {
    eventType: 'daily_summary',
    messageText,
    timestamp: new Date().toISOString(),
  }
}

// ---- Generic task message (for generic notifications) ----

export function formatGenericTaskMessage(
  taskTitle: string,
  taskStatus: string,
  vehiclePlate: string | undefined,
  vehicleModel: string | undefined,
  priority: TaskPriority,
  taskId: string,
  baseUrl: string
): string {
  const lines: string[] = []
  lines.push(`📋 *Nhiệm vụ*\n`)

  if (vehiclePlate) lines.push(buildField('Biển số', vehiclePlate))
  if (vehicleModel) lines.push(buildField('Dòng xe', vehicleModel))
  lines.push(buildField('Nhiệm vụ', taskTitle))
  lines.push(buildField('Trạng thái', `${statusEmoji(taskStatus)} ${STATUS_LABELS[taskStatus] ?? taskStatus}`))
  lines.push(buildField('Ưu tiên', `${priorityEmoji(priority)} ${PRIORITY_LABELS[priority]}`))

  return lines.join('').trim()
}
