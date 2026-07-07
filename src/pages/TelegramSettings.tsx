/**
 * Telegram Settings Page
 *
 * Admin configuration UI for the Telegram Automation Engine.
 * Frontend never sees the bot token.
 */

import { useState, useEffect, useCallback } from 'react'
import { telegramConfig } from '../services/telegramConfig.service'
import { telegramService } from '../services/telegram.service'
import type {
  TelegramConfig,
  TelegramChatMapping,
  TelegramNotificationRule,
  TelegramEventType,
  TelegramLogEntry,
  TelegramRetryPolicy,
} from '../types/telegram'
import type { Employee } from '../types'
import { useStore } from '../store/useStore'

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

const LOG_LEVEL_COLORS: Record<string, string> = {
  sent: 'text-blue-600',
  delivered: 'text-green-600',
  failed: 'text-red-600',
  retried: 'text-yellow-600',
  received: 'text-purple-600',
  callback: 'text-orange-600',
}

export default function TelegramSettings() {
  const employees = useStore((s) => s.employees)

  const [config, setConfig] = useState<TelegramConfig>(telegramConfig.getConfig())
  const [logs, setLogs] = useState<TelegramLogEntry[]>([])
  const [activeTab, setActiveTab] = useState<'config' | 'mappings' | 'rules' | 'logs'>('config')
  const [newChatId, setNewChatId] = useState('')
  const [newEmployeeId, setNewEmployeeId] = useState('')
  const [saving, setSaving] = useState(false)
  const [backendStatus, setBackendStatus] = useState<Record<string, unknown> | null>(null)
  const [linkedEmployees, setLinkedEmployees] = useState<Record<string, unknown>[]>([])
  const [loadingBackend, setLoadingBackend] = useState(false)

  const reload = useCallback(() => {
    setConfig(telegramConfig.getConfig())
    setLogs(telegramService.getLogs())
    telegramService.getStatus().then(setBackendStatus)
    telegramService.getLinkedEmployees().then(setLinkedEmployees)
  }, [])

  useEffect(() => {
    reload()
  }, [reload])

  const handleSave = useCallback((updated: Partial<TelegramConfig>) => {
    setSaving(true)
    telegramConfig.updateConfig(updated)
    setConfig(telegramConfig.getConfig())
    setSaving(false)
  }, [])

  const handleRetryPolicyChange = useCallback((policy: TelegramRetryPolicy) => {
    telegramConfig.setRetryPolicy(policy)
    setConfig(telegramConfig.getConfig())
  }, [])

  const handleToggleRule = useCallback((eventType: TelegramEventType, enabled: boolean) => {
    telegramConfig.setRuleEnabled(eventType, enabled)
    setConfig(telegramConfig.getConfig())
  }, [])

  const handleAddMapping = useCallback(() => {
    if (!newEmployeeId || !newChatId) return
    telegramConfig.addChatMapping({
      employeeId: newEmployeeId,
      telegramChatId: newChatId,
      enabled: true,
    })
    setNewEmployeeId('')
    setNewChatId('')
    setConfig(telegramConfig.getConfig())
  }, [newEmployeeId, newChatId])

  const handleRemoveMapping = useCallback((employeeId: string) => {
    telegramConfig.removeChatMapping(employeeId)
    setConfig(telegramConfig.getConfig())
  }, [])

  const handleToggleMapping = useCallback((employeeId: string, enabled: boolean) => {
    telegramConfig.toggleChatMapping(employeeId, enabled)
    setConfig(telegramConfig.getConfig())
  }, [])

  const handleClearLogs = useCallback(() => {
    telegramService.clearLogs()
    setLogs([])
  }, [])

  const handleTestMessage = useCallback(async () => {
    const enabledMappings = config.chatMapping.filter((m) => m.enabled)
    if (enabledMappings.length === 0) {
      alert('Không có nhân viên nào được liên kết Telegram để gửi tin nhắn test.')
      return
    }
    setLoadingBackend(true)
    const result = await telegramService.sendTestMessage(enabledMappings[0].telegramChatId)
    if (result) {
      alert('Tin nhắn test đã được gửi!')
      reload()
    } else {
      alert('Gửi thất bại. Kiểm tra backend và kết nối bot.')
    }
    setLoadingBackend(false)
  }, [config.chatMapping, reload])

  const handleRefreshStatus = useCallback(async () => {
    setLoadingBackend(true)
    await reload()
    setLoadingBackend(false)
  }, [reload])

  const mappedEmployeeIds = new Set(config.chatMapping.map((m) => m.employeeId))
  const unmappedEmployees = employees.filter((e: Employee) => !mappedEmployeeIds.has(e.id))

  const backendConnected = Boolean(backendStatus && (backendStatus as any)?.ok)
  const linkedCount = linkedEmployees.length

  const formatTimestamp = (ts: string) => {
    return new Date(ts).toLocaleString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-800">Cài đặt Telegram</h1>
          <p className="text-sm text-slate-500 mt-1">Quản lý thông báo và tích hợp Telegram Bot</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleTestMessage}
            className="btn-secondary text-sm"
            disabled={!config.enabled || linkedCount === 0 || loadingBackend}
          >
            {loadingBackend ? 'Đang gửi...' : 'Gửi test'}
          </button>
          <div className="flex items-center gap-2">
            <span className={`text-sm font-medium ${config.enabled ? 'text-green-600' : 'text-slate-400'}`}>
              {config.enabled ? 'Đang bật' : 'Đã tắt'}
            </span>
            <button
              onClick={() => handleSave({ enabled: !config.enabled })}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                config.enabled ? 'bg-blue-600' : 'bg-slate-300'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  config.enabled ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>
      </div>

      {/* Connection Status */}
      <div className="card p-4 flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-slate-700">
            Kết nối backend: {backendConnected ? '🟢 Đã kết nối' : '🔴 Chưa kết nối'}
          </p>
          <p className="text-xs text-slate-400 mt-1">
            Webhook URL: {config.webhookUrl || 'Chưa cấu hình'} • Nhân viên đã liên kết: {linkedCount}
          </p>
        </div>
        <button onClick={handleRefreshStatus} className="btn-secondary text-xs">
          Làm mới
        </button>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200">
        <nav className="flex gap-4">
          {(['mappings', 'rules', 'logs'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`pb-3 px-1 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              {tab === 'mappings' ? 'Liên kết' : tab === 'rules' ? 'Thông báo' : 'Nhật ký'}
            </button>
          ))}
        </nav>
      </div>

      {/* Mappings Tab */}
      {activeTab === 'mappings' && (
        <div className="space-y-6">
          <div className="card p-6 space-y-4">
            <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">Liên kết nhân viên mới</h3>
            <p className="text-xs text-slate-500">
              Nhân viên tự liên kết bằng cách nhấn /start trên Telegram. Dùng mục này để bật/tắt liên kết đã có.
            </p>
            <div className="flex gap-3 flex-wrap">
              <select
                value={newEmployeeId}
                onChange={(e) => setNewEmployeeId(e.target.value)}
                className="input flex-1 min-w-[180px]"
              >
                <option value="">Chọn nhân viên...</option>
                {unmappedEmployees.map((e: Employee) => (
                  <option key={e.id} value={e.id}>{e.name}</option>
                ))}
              </select>
              <input
                type="text"
                value={newChatId}
                onChange={(e) => setNewChatId(e.target.value)}
                placeholder="Chat ID Telegram (ví dụ: 123456789)"
                className="input flex-1 min-w-[200px]"
              />
              <button
                onClick={handleAddMapping}
                disabled={!newEmployeeId || !newChatId}
                className="btn-primary"
              >
                Thêm liên kết
              </button>
            </div>
          </div>

          <div className="card divide-y divide-slate-100">
            {linkedCount === 0 && config.chatMapping.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-sm">
                Chưa có liên kết nào. Yêu cầu nhân viên nhấn /start trên Telegram để liên kết.
              </div>
            ) : (
              config.chatMapping.map((mapping) => {
                const employee = employees.find((e: Employee) => e.id === mapping.employeeId)
                return (
                  <div key={mapping.employeeId} className="p-4 flex items-center gap-3">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-slate-700">
                        {employee?.name ?? mapping.employeeId}
                      </p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Chat ID: {mapping.telegramChatId}
                        {!employee && <span className="ml-2 text-orange-500">(Không tìm thấy nhân viên)</span>}
                      </p>
                    </div>
                    <button
                      onClick={() => handleToggleMapping(mapping.employeeId, !mapping.enabled)}
                      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                        mapping.enabled ? 'bg-blue-600' : 'bg-slate-300'
                      }`}
                    >
                      <span
                        className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                          mapping.enabled ? 'translate-x-5' : 'translate-x-1'
                        }`}
                      />
                    </button>
                    <button
                      onClick={() => handleRemoveMapping(mapping.employeeId)}
                      className="text-red-500 hover:text-red-700 text-xs font-medium"
                    >
                      Xóa
                    </button>
                  </div>
                )
              })
            )}
          </div>
        </div>
      )}

      {/* Rules Tab */}
      {activeTab === 'rules' && (
        <div className="card divide-y divide-slate-100">
          {config.notificationRules.map((rule) => (
            <div key={rule.eventType} className="p-4 flex items-center gap-3">
              <div className="flex-1">
                <p className="text-sm font-medium text-slate-700">
                  {EVENT_LABELS[rule.eventType]}
                </p>
                <p className="text-xs text-slate-400 mt-0.5">
                  Gửi đến: {rule.targetRole === 'assignee' ? 'Người được giao' : rule.targetRole === 'manager' ? 'Quản lý' : 'Tất cả'}
                  {rule.priorityThreshold && ` • Ngưỡng: ${rule.priorityThreshold}`}
                </p>
              </div>
              <button
                onClick={() => handleToggleRule(rule.eventType, !rule.enabled)}
                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                  rule.enabled ? 'bg-blue-600' : 'bg-slate-300'
                }`}
              >
                <span
                  className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                    rule.enabled ? 'translate-x-5' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Logs Tab */}
      {activeTab === 'logs' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button onClick={handleClearLogs} className="text-xs text-red-500 hover:text-red-700">
              Xóa nhật ký
            </button>
          </div>
          <div className="card overflow-hidden">
            {logs.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-sm">
                Chưa có nhật ký nào.
              </div>
            ) : (
              <div className="max-h-96 overflow-y-auto">
                <table className="w-full text-xs">
                  <thead className="bg-slate-50 sticky top-0">
                    <tr>
                      <th className="text-left p-2 font-medium text-slate-500">Thời gian</th>
                      <th className="text-left p-2 font-medium text-slate-500">Loại</th>
                      <th className="text-left p-2 font-medium text-slate-500">Chat ID</th>
                      <th className="text-left p-2 font-medium text-slate-500">Nội dung</th>
                      <th className="text-left p-2 font-medium text-slate-500">Lỗi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {logs.map((entry) => (
                      <tr key={entry.id} className="hover:bg-slate-50">
                        <td className="p-2 text-slate-500 whitespace-nowrap">{formatTimestamp(entry.timestamp)}</td>
                        <td className={`p-2 font-medium ${LOG_LEVEL_COLORS[entry.level] ?? ''}`}>
                          {entry.level.toUpperCase()}
                          {entry.retryCount ? ` (retry x${entry.retryCount})` : ''}
                        </td>
                        <td className="p-2 text-slate-500">{entry.chatId ?? '—'}</td>
                        <td className="p-2 text-slate-600 max-w-xs truncate">{entry.payload ?? '—'}</td>
                        <td className="p-2 text-red-500 max-w-xs truncate">{entry.error ?? ''}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
