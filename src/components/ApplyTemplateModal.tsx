/**
 * ApplyTemplateModal Component
 *
 * Allows users to select a template and apply it to a vehicle,
 * generating tasks and checklist items in one click.
 */

import { useState, useMemo } from 'react'
import { CheckCircle, Search, Star } from 'lucide-react'
import { useStore } from '../store/useStore'
import { Modal } from './ui'
import type { TaskTemplate } from '../types'

const TEMPLATE_TYPE_SHORT: Record<string, string> = {
  general_inspection: 'KT Tổng',
  oil_change: 'Thay dầu',
  interior_cleaning: 'Vệ sinhNT',
  exterior_detailing: 'Đánh bóng',
  paint_repair: 'Sửa sơn',
  full_service: 'Toàn diện',
  custom: 'Tuỳ chỉnh',
}

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} phút`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m > 0 ? `${h}h ${m}p` : `${h} giờ`
}

interface ApplyTemplateModalProps {
  open: boolean
  onClose: () => void
  vehicleId: string
  vehiclePlate: string
}

export function ApplyTemplateModal({ open, onClose, vehicleId, vehiclePlate }: ApplyTemplateModalProps) {
  const templates = useStore((s) => s.templates)
  const applyTemplate = useStore((s) => s.applyTemplate)
  const existingTasks = useStore((s) => s.tasks.filter((t) => t.vehicleId === vehicleId))
  const existingRuleIds = useMemo(() => new Set(existingTasks.map((t) => t.ruleId)), [existingTasks])

  const [search, setSearch] = useState('')
  const [applied, setApplied] = useState(false)

  const filtered = useMemo(() => {
    if (!search.trim()) return templates
    const q = search.toLowerCase()
    return templates.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q)
    )
  }, [templates, search])

  const handleApply = (templateId: string) => {
    applyTemplate(templateId, vehicleId)
    setApplied(true)
    setTimeout(() => {
      onClose()
      setApplied(false)
    }, 800)
  }

  const handleOpen = () => setApplied(false)

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Áp dụng mẫu công việc"
      subtitle={`Xe ${vehiclePlate}`}
      width="max-w-lg"
    >
      {applied ? (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <CheckCircle size={48} className="text-green-500 mb-3" />
          <p className="text-lg font-medium text-gray-800">Đã áp dụng thành công!</p>
          <p className="text-sm text-gray-500 mt-1">Công việc đã được tạo trong nhiệm vụ.</p>
        </div>
      ) : (
        <>
          <div className="relative mb-3">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              className="input pl-9 w-full"
              placeholder="Tìm mẫu công việc..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              autoFocus
            />
          </div>

          <div className="space-y-2 max-h-96 overflow-y-auto">
            {filtered.length === 0 ? (
              <p className="text-center text-gray-400 py-8">Không tìm thấy mẫu phù hợp.</p>
            ) : (
              filtered.map((tpl) => {
                const willCreate = tpl.tasks.filter(
                  (t) => !existingRuleIds.has(`${tpl.id}:${t.id}`)
                )
                const alreadyApplied = willCreate.length === 0
                return (
                  <button
                    key={tpl.id}
                    onClick={() => handleApply(tpl.id)}
                    disabled={alreadyApplied}
                    className={`w-full text-left rounded-lg border p-3 transition-colors ${
                      alreadyApplied
                        ? 'border-gray-200 bg-gray-50 opacity-60 cursor-not-allowed'
                        : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50 cursor-pointer'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-gray-900 text-sm">{tpl.name}</span>
                          {tpl.isFavorite && (
                            <Star size={12} className="text-yellow-500 fill-yellow-400 flex-shrink-0" />
                          )}
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{tpl.description}</p>
                        <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-400">
                          <span>{TEMPLATE_TYPE_SHORT[tpl.type] ?? tpl.type}</span>
                          <span>{tpl.tasks.length} công việc</span>
                          <span>{formatDuration(tpl.estimatedDurationMinutes)}</span>
                        </div>
                      </div>
                      <div className="flex-shrink-0 text-right">
                        {alreadyApplied ? (
                          <span className="text-xs text-green-600 font-medium">Đã áp dụng</span>
                        ) : (
                          <span className="text-xs text-blue-600 font-medium">
                            +{willCreate.length} công việc
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                )
              })
            )}
          </div>

          <div className="mt-3 pt-3 border-t text-xs text-gray-400 text-center">
            Mẫu đã áp dụng sẽ không tạo công việc trùng lặp.
          </div>
        </>
      )}
    </Modal>
  )
}
