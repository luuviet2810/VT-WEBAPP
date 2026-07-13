/**
 * TemplateLibrary Component
 *
 * Displays a searchable list of task templates.
 * Admin/Manager can CRUD templates; Staff can only browse and apply.
 */

import { useState, useMemo } from 'react'
import {
  Copy,
  Edit2,
  Heart,
  Plus,
  Search,
  Star,
  Trash2,
} from 'lucide-react'
import { useStore } from '../store/useStore'
import { Modal } from './ui'
import { useTemplatePermissions } from '../rbac/usePermissions'
import type { TaskTemplate, TaskTemplateType, TaskPriority } from '../types'

// ====== HELPERS ======

const TEMPLATE_TYPE_LABELS: Record<TaskTemplateType, string> = {
  general_inspection: 'Kiểm tra tổng quát',
  oil_change: 'Thay dầu máy',
  interior_cleaning: 'Vệ sinh nội thất',
  exterior_detailing: 'Đánh bóng ngoại thất',
  paint_repair: 'Sửa chống sơn',
  full_service: 'Dịch vụ toàn diện',
  custom: 'Tuỳ chỉnh',
}

const TEMPLATE_TYPE_COLORS: Record<TaskTemplateType, string> = {
  general_inspection: 'bg-blue-100 text-blue-700',
  oil_change: 'bg-orange-100 text-orange-700',
  interior_cleaning: 'bg-green-100 text-green-700',
  exterior_detailing: 'bg-yellow-100 text-yellow-700',
  paint_repair: 'bg-purple-100 text-purple-700',
  full_service: 'bg-indigo-100 text-indigo-700',
  custom: 'bg-gray-100 text-gray-700',
}

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}p`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m > 0 ? `${h}h ${m}p` : `${h}h`
}

type SortKey = 'usageCount' | 'name' | 'updatedAt'

function sortTemplates(templates: TaskTemplate[], key: SortKey, asc: boolean): TaskTemplate[] {
  return [...templates].sort((a, b) => {
    let cmp = 0
    if (key === 'usageCount') cmp = a.usageCount - b.usageCount
    else if (key === 'name') cmp = a.name.localeCompare(b.name)
    else if (key === 'updatedAt') cmp = a.updatedAt.localeCompare(b.updatedAt)
    return asc ? cmp : -cmp
  })
}

// ====== TEMPLATE ROW ======

interface TemplateRowProps {
  template: TaskTemplate
  onEdit: (t: TaskTemplate) => void
  onDelete: (id: string) => void
  onDuplicate: (id: string) => void
  onToggleFavorite: (id: string) => void
  canManage: boolean
}

function TemplateRow({
  template,
  onEdit,
  onDelete,
  onDuplicate,
  onToggleFavorite,
  canManage,
}: TemplateRowProps) {
  return (
    <div className="flex items-start gap-3 rounded-lg border border-gray-200 bg-white p-4">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium text-gray-900">{template.name}</span>
          <span
            className={`text-xs px-2 py-0.5 rounded-full font-medium ${TEMPLATE_TYPE_COLORS[template.type]}`}
          >
            {TEMPLATE_TYPE_LABELS[template.type]}
          </span>
          {template.isFavorite && (
            <Star size={14} className="text-yellow-500 fill-yellow-400 flex-shrink-0" />
          )}
        </div>
        {template.description && (
          <p className="text-sm text-gray-500 mt-1">{template.description}</p>
        )}
        <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
          <span>{template.tasks.length} công việc</span>
          <span>{formatDuration(template.estimatedDurationMinutes)}</span>
          <span>Đã dùng {template.usageCount} lần</span>
        </div>
      </div>
      {canManage && (
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            onClick={() => onToggleFavorite(template.id)}
            className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-yellow-500"
            title={template.isFavorite ? 'Bỏ yêu thích' : 'Yêu thích'}
          >
            {template.isFavorite ? <Star size={15} className="fill-yellow-400 text-yellow-500" /> : <Heart size={15} />}
          </button>
          <button
            onClick={() => onDuplicate(template.id)}
            className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-blue-600"
            title="Nhân bản"
          >
            <Copy size={15} />
          </button>
          <button
            onClick={() => onEdit(template)}
            className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-700"
            title="Sửa"
          >
            <Edit2 size={15} />
          </button>
          <button
            onClick={() => onDelete(template.id)}
            className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-red-500"
            title="Xoá"
          >
            <Trash2 size={15} />
          </button>
        </div>
      )}
    </div>
  )
}

// ====== EDIT TEMPLATE FORM ======

interface TemplateFormData {
  name: string
  description: string
  type: TaskTemplateType
  estimatedDurationMinutes: number
  tasks: {
    id: string
    title: string
    description: string
    priority: TaskPriority
    checklist: { id: string; text: string; done: boolean }[]
  }[]
}

function buildEmptyTask(): TemplateFormData['tasks'][0] {
  return {
    id: `t_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    title: '',
    description: '',
    priority: 'normal',
    checklist: [],
  }
}

interface EditTemplateModalProps {
  open: boolean
  onClose: () => void
  template?: TaskTemplate | null
  onSave: (data: Omit<TaskTemplate, 'id' | 'usageCount' | 'createdAt' | 'updatedAt'>) => void
}

function EditTemplateModal({ open, onClose, template, onSave }: EditTemplateModalProps) {
  const [form, setForm] = useState<TemplateFormData>(() =>
    template
      ? {
          name: template.name,
          description: template.description,
          type: template.type,
          estimatedDurationMinutes: template.estimatedDurationMinutes,
          tasks: template.tasks.map((t) => ({
            id: t.id,
            title: t.title,
            description: t.description ?? '',
            priority: t.priority,
            checklist: t.checklist.map(({ id, text, done }) => ({ id, text, done })),
          })),
        }
      : {
          name: '',
          description: '',
          type: 'custom' as TaskTemplateType,
          estimatedDurationMinutes: 30,
          tasks: [buildEmptyTask()],
        }
  )

  const setField = <K extends keyof TemplateFormData>(key: K, value: TemplateFormData[K]) =>
    setForm((f) => ({ ...f, [key]: value }))

  const addTask = () => setField('tasks', [...form.tasks, buildEmptyTask()])

  const removeTask = (idx: number) =>
    setField('tasks', form.tasks.filter((_, i) => i !== idx))

  const updateTask = (idx: number, patch: Partial<TemplateFormData['tasks'][0]>) =>
    setField(
      'tasks',
      form.tasks.map((t, i) => (i === idx ? { ...t, ...patch } : t))
    )

  const addChecklistItem = (taskIdx: number) =>
    updateTask(taskIdx, {
      checklist: [
        ...form.tasks[taskIdx].checklist,
        { id: `i_${Date.now()}`, text: '', done: false },
      ],
    })

  const removeChecklistItem = (taskIdx: number, itemIdx: number) =>
    updateTask(taskIdx, {
      checklist: form.tasks[taskIdx].checklist.filter((_, i) => i !== itemIdx),
    })

  const updateChecklistItem = (taskIdx: number, itemIdx: number, text: string) =>
    updateTask(taskIdx, {
      checklist: form.tasks[taskIdx].checklist.map((c, i) =>
        i === itemIdx ? { ...c, text } : c
      ),
    })

  const handleSave = () => {
    if (!form.name.trim()) return
    onSave({
      name: form.name.trim(),
      description: form.description.trim(),
      type: form.type,
      estimatedDurationMinutes: form.estimatedDurationMinutes,
      tasks: form.tasks
        .filter((t) => t.title.trim())
        .map((t) => ({
          id: t.id,
          title: t.title.trim(),
          description: t.description.trim(),
          priority: t.priority,
          checklist: t.checklist
            .filter((c) => c.text.trim())
            .map((c) => ({ id: c.id, text: c.text.trim(), done: c.done })),
        })),
      defaultAssigneeId: null,
      isFavorite: template?.isFavorite ?? false,
    })
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={template ? 'Sửa mẫu công việc' : 'Tạo mẫu công việc'}
      width="max-w-2xl"
    >
      <div className="space-y-4 max-h-[70vh] overflow-y-auto p-1">
        {/* Name */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Tên mẫu</label>
          <input
            className="w-full input"
            value={form.name}
            onChange={(e) => setField('name', e.target.value)}
            placeholder="VD: Thay dầu máy"
          />
        </div>

        {/* Type + Duration */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Loại</label>
            <select
              className="w-full input"
              value={form.type}
              onChange={(e) => setField('type', e.target.value as TaskTemplateType)}
            >
              {Object.entries(TEMPLATE_TYPE_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Thời gian ước tính (phút)
            </label>
            <input
              type="number"
              className="w-full input"
              value={form.estimatedDurationMinutes}
              min={5}
              onChange={(e) => setField('estimatedDurationMinutes', parseInt(e.target.value) || 30)}
            />
          </div>
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Mô tả</label>
          <textarea
            className="w-full input resize-none"
            rows={2}
            value={form.description}
            onChange={(e) => setField('description', e.target.value)}
            placeholder="Mô tả ngắn về mẫu công việc..."
          />
        </div>

        {/* Tasks */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-medium text-gray-700">Công việc</label>
            <button className="btn-secondary text-sm" onClick={addTask}>
              <Plus size={14} />
              Thêm công việc
            </button>
          </div>
          <div className="space-y-3">
            {form.tasks.map((task, ti) => (
              <div key={task.id} className="rounded-lg border border-gray-200 bg-gray-50 p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <input
                    className="flex-1 input text-sm"
                    value={task.title}
                    onChange={(e) => updateTask(ti, { title: e.target.value })}
                    placeholder={`Công việc ${ti + 1}`}
                  />
                  <select
                    className="input text-sm w-28"
                    value={task.priority}
                    onChange={(e) => updateTask(ti, { priority: e.target.value as TaskPriority })}
                  >
                    <option value="low">Thấp</option>
                    <option value="medium">Trung bình</option>
                    <option value="high">Cao</option>
                    <option value="urgent">Khẩn cấp</option>
                  </select>
                  {form.tasks.length > 1 && (
                    <button
                      className="text-gray-400 hover:text-red-500 p-1"
                      onClick={() => removeTask(ti)}
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
                <input
                  className="w-full input text-sm"
                  value={task.description}
                  onChange={(e) => updateTask(ti, { description: e.target.value })}
                  placeholder="Mô tả công việc..."
                />

                {/* Checklist items */}
                <div className="ml-3 space-y-1">
                  <div className="flex items-center gap-1 flex-wrap">
                    {task.checklist.map((item, ii) => (
                      <div key={item.id} className="flex items-center gap-1">
                        <input
                          className="input text-xs w-40"
                          value={item.text}
                          onChange={(e) => updateChecklistItem(ti, ii, e.target.value)}
                          placeholder="Bước..."
                        />
                        <button
                          className="text-gray-400 hover:text-red-400 p-0.5"
                          onClick={() => removeChecklistItem(ti, ii)}
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                  <button
                    className="text-xs text-blue-600 hover:text-blue-800"
                    onClick={() => addChecklistItem(ti)}
                  >
                    + Thêm bước
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-2 mt-4 pt-4 border-t">
        <button className="btn-secondary" onClick={onClose}>
          Huỷ
        </button>
        <button className="btn-primary" onClick={handleSave} disabled={!form.name.trim()}>
          {template ? 'Lưu thay đổi' : 'Tạo mẫu'}
        </button>
      </div>
    </Modal>
  )
}

// ====== CONFIRM DELETE ======

interface ConfirmDeleteProps {
  open: boolean
  templateName: string
  onConfirm: () => void
  onCancel: () => void
}

function ConfirmDelete({ open, templateName, onConfirm, onCancel }: ConfirmDeleteProps) {
  if (!open) return null
  return (
    <Modal open={open} onClose={onCancel} title="Xác nhận xoá" width="max-w-sm">
      <p className="text-sm text-gray-600">
        Bạn chắc chắn muốn xoá mẫu <strong>"{templateName}"</strong>? Hành động này không thể hoàn tác.
      </p>
      <div className="flex justify-end gap-2 mt-4">
        <button className="btn-secondary" onClick={onCancel}>
          Huỷ
        </button>
        <button className="btn-danger" onClick={onConfirm}>
          Xoá
        </button>
      </div>
    </Modal>
  )
}

// ====== MAIN COMPONENT ======

interface TemplateLibraryProps {
  /** If provided, shows an "Áp dụng" button on each row */
  onApply?: (templateId: string) => void
  /** If true, hides the create button (e.g., for inline use in VehicleDetail) */
  hideCreate?: boolean
}

export function TemplateLibrary({ onApply, hideCreate = false }: TemplateLibraryProps) {
  const templates = useStore((s) => s.templates)
  const createTemplate = useStore((s) => s.createTemplate)
  const updateTemplate = useStore((s) => s.updateTemplate)
  const deleteTemplate = useStore((s) => s.deleteTemplate)
  const duplicateTemplate = useStore((s) => s.duplicateTemplate)
  const toggleTemplateFavorite = useStore((s) => s.toggleTemplateFavorite)

  const [search, setSearch] = useState('')
  const [sortKey, setSortKey] = useState<SortKey>('usageCount')
  const [sortAsc, setSortAsc] = useState(false)
  const [typeFilter, setTypeFilter] = useState<TaskTemplateType | 'all'>('all')

  const [editOpen, setEditOpen] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<TaskTemplate | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null)

  const templatePerms = useTemplatePermissions()
  const canManage = templatePerms.canWrite

  const filtered = useMemo(() => {
    let result = templates
    if (typeFilter !== 'all') result = result.filter((t) => t.type === typeFilter)
    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter(
        (t) =>
          t.name.toLowerCase().includes(q) ||
          t.description.toLowerCase().includes(q) ||
          t.tasks.some((task) => task.title.toLowerCase().includes(q))
      )
    }
    return sortTemplates(result, sortKey, sortAsc)
  }, [templates, search, typeFilter, sortKey, sortAsc])

  const handleSave = (
    data: Omit<TaskTemplate, 'id' | 'usageCount' | 'createdAt' | 'updatedAt'>
  ) => {
    if (editingTemplate) {
      updateTemplate(editingTemplate.id, data)
    } else {
      createTemplate(data)
    }
    setEditingTemplate(null)
  }

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc((a) => !a)
    else { setSortKey(key); setSortAsc(false) }
  }

  const SortIcon = ({ k }: { k: SortKey }) =>
    sortKey === k ? (
      <span className="text-blue-600">{sortAsc ? '↑' : '↓'}</span>
    ) : null

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            className="input pl-9 w-full"
            placeholder="Tìm mẫu công việc..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          className="input w-44"
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value as TaskTemplateType | 'all')}
        >
          <option value="all">Tất cả loại</option>
          {Object.entries(TEMPLATE_TYPE_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
        <button
          className="btn-secondary text-sm"
          onClick={() => handleSort('usageCount')}
        >
          Phổ biến <SortIcon k="usageCount" />
        </button>
        <button
          className="btn-secondary text-sm"
          onClick={() => handleSort('name')}
        >
          Tên <SortIcon k="name" />
        </button>
        <button
          className="btn-secondary text-sm"
          onClick={() => handleSort('updatedAt')}
        >
          Mới nhất <SortIcon k="updatedAt" />
        </button>
        {!hideCreate && (
          <button
            className="btn-primary text-sm ml-auto"
            onClick={() => { setEditingTemplate(null); setEditOpen(true) }}
          >
            <Plus size={14} />
            Tạo mẫu
          </button>
        )}
      </div>

      {/* Results */}
      {filtered.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <Search size={32} className="mx-auto mb-2 opacity-40" />
          <p>Không tìm thấy mẫu phù hợp</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((t) => (
            <TemplateRow
              key={t.id}
              template={t}
              onEdit={(tmpl) => { setEditingTemplate(tmpl); setEditOpen(true) }}
              onDelete={(id) => {
                const tmpl = templates.find((x) => x.id === id)
                if (tmpl) setDeleteTarget({ id, name: tmpl.name })
              }}
              onDuplicate={(id) => duplicateTemplate(id)}
              onToggleFavorite={(id) => toggleTemplateFavorite(id)}
              canManage={canManage}
            />
          ))}
        </div>
      )}

      {/* Edit/Create Modal */}
      <EditTemplateModal
        open={editOpen}
        onClose={() => { setEditOpen(false); setEditingTemplate(null) }}
        template={editingTemplate}
        onSave={handleSave}
      />

      {/* Delete Confirm */}
      <ConfirmDelete
        open={!!deleteTarget}
        templateName={deleteTarget?.name ?? ''}
        onConfirm={() => {
          if (deleteTarget) deleteTemplate(deleteTarget.id)
          setDeleteTarget(null)
        }}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  )
}
