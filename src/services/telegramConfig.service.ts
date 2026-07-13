/**
 * TelegramConfigService
 *
 * Manages Telegram bot configuration stored in localStorage.
 * Frontend does NOT store the Bot Token.
 *
 * Centralizes: webhookUrl, chat mapping, notification rules, retry policy.
 *
 * Actual Telegram API calls are made by gara-bot-server.
 */

import type {
  TelegramConfig,
  TelegramChatMapping,
  TelegramNotificationRule,
  TelegramRetryPolicy,
} from '../types/telegram'

const STORAGE_KEY = 'gara_telegram_config'

const DEFAULT_RETRY_POLICY: TelegramRetryPolicy = {
  maxRetries: 3,
  retryDelayMs: 1000,
  exponentialBackoff: true,
}

const DEFAULT_NOTIFICATION_RULES: TelegramNotificationRule[] = [
  { eventType: 'task_created', enabled: true, targetRole: 'assignee' },
  { eventType: 'task_assigned', enabled: true, targetRole: 'assignee' },
  { eventType: 'task_overdue', enabled: true, targetRole: 'assignee', priorityThreshold: 'normal' },
  { eventType: 'vehicle_ready', enabled: true, targetRole: 'manager' },
  { eventType: 'vehicle_sold', enabled: true, targetRole: 'manager' },
  { eventType: 'workflow_changed', enabled: true, targetRole: 'all' },
  { eventType: 'approval_required', enabled: true, targetRole: 'manager' },
  { eventType: 'daily_summary', enabled: false, targetRole: 'manager' },
]

const DEFAULT_CONFIG: TelegramConfig = {
  botToken: '',
  webhookUrl: '',
  chatMapping: [],
  notificationRules: DEFAULT_NOTIFICATION_RULES,
  retryPolicy: DEFAULT_RETRY_POLICY,
  enabled: false,
}

export class TelegramConfigService {
  private config: TelegramConfig

  constructor() {
    this.config = this.load()
  }

  private load(): TelegramConfig {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (!raw) return { ...DEFAULT_CONFIG }
      return { ...DEFAULT_CONFIG, ...JSON.parse(raw) }
    } catch {
      return { ...DEFAULT_CONFIG }
    }
  }

  private save(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.config))
    } catch (err) {
      console.error('[TelegramConfig] Failed to save config:', err)
    }
  }

  getConfig(): TelegramConfig {
    return { ...this.config }
  }

  isEnabled(): boolean {
    return this.config.enabled && !!this.config.webhookUrl
  }

  getWebhookUrl(): string {
    return this.config.webhookUrl
  }

  setEnabled(enabled: boolean): void {
    this.config = { ...this.config, enabled }
    this.save()
  }

  setWebhookUrl(url: string): void {
    this.config = { ...this.config, webhookUrl: url.trim() }
    this.save()
  }

  updateConfig(patch: Partial<TelegramConfig>): void {
    this.config = { ...this.config, ...patch }
    this.save()
  }

  setRetryPolicy(policy: TelegramRetryPolicy): void {
    this.config = { ...this.config, retryPolicy: policy }
    this.save()
  }

  getChatMapping(): TelegramChatMapping[] {
    return [...this.config.chatMapping]
  }

  getChatMappingByEmployee(employeeId: string): TelegramChatMapping | undefined {
    return this.config.chatMapping.find((m) => m.employeeId === employeeId && m.enabled)
  }

  getChatIdByEmployee(employeeId: string): string | undefined {
    return this.getChatMappingByEmployee(employeeId)?.telegramChatId
  }

  addChatMapping(mapping: TelegramChatMapping): void {
    const existing = this.config.chatMapping.findIndex((m) => m.employeeId === mapping.employeeId)
    if (existing >= 0) {
      this.config.chatMapping[existing] = mapping
    } else {
      this.config.chatMapping.push(mapping)
    }
    this.save()
  }

  removeChatMapping(employeeId: string): void {
    this.config.chatMapping = this.config.chatMapping.filter((m) => m.employeeId !== employeeId)
    this.save()
  }

  toggleChatMapping(employeeId: string, enabled: boolean): void {
    const mapping = this.config.chatMapping.find((m) => m.employeeId === employeeId)
    if (mapping) {
      mapping.enabled = enabled
      this.save()
    }
  }

  getNotificationRules(): TelegramNotificationRule[] {
    return [...this.config.notificationRules]
  }

  getRuleForEvent(eventType: TelegramNotificationRule['eventType']): TelegramNotificationRule | undefined {
    return this.config.notificationRules.find((r) => r.eventType === eventType)
  }

  isEventEnabled(eventType: TelegramNotificationRule['eventType']): boolean {
    const rule = this.getRuleForEvent(eventType)
    return rule?.enabled ?? false
  }

  updateNotificationRule(eventType: TelegramNotificationRule['eventType'], patch: Partial<TelegramNotificationRule>): void {
    const rule = this.config.notificationRules.find((r) => r.eventType === eventType)
    if (rule) {
      Object.assign(rule, patch)
      this.save()
    }
  }

  setRuleEnabled(eventType: TelegramNotificationRule['eventType'], enabled: boolean): void {
    this.updateNotificationRule(eventType, { enabled })
  }

  reset(): void {
    this.config = { ...DEFAULT_CONFIG }
    this.save()
  }
}

export const telegramConfig = new TelegramConfigService()
