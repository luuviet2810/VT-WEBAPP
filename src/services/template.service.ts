/**
 * Task Template Service
 *
 * Manages TaskTemplate CRUD and application to vehicles.
 * All templates are stored in Zustand (localStorage-persisted) — no DB table needed.
 *
 * Applying a template to a vehicle creates tasks with stable IDs to avoid duplicates
 * on repeated applications. Re-applying the same template merges checklist items
 * into existing tasks (idempotent).
 */

import type { TaskTemplate, TaskTemplateTask, Task, TaskPriority } from '../types'

function uid(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
}

// ====== SEED TEMPLATES ======

function buildSeedTemplates(): TaskTemplate[] {
  const now = new Date().toISOString()
  return [
    {
      id: 'tpl_general_inspection',
      name: 'Kiểm tra tổng quát',
      description: 'Kiểm tra toàn diện tình trạng xe trước khi nhận bán',
      type: 'general_inspection',
      estimatedDurationMinutes: 30,
      defaultAssigneeId: null,
      isFavorite: true,
      usageCount: 12,
      createdAt: now,
      updatedAt: now,
      tasks: [
        {
          id: uid('t'),
          title: 'Kiểm tra ngoại thất',
          description: 'Quan sát và ghi nhận tình trạng sơn, kính, đèn, gương',
          priority: 'medium',
          checklist: [
            { id: uid('i'), text: 'Kiểm tra sơn xe (trầy, móp)' },
            { id: uid('i'), text: 'Kiểm tra kính chắn gió' },
            { id: uid('i'), text: 'Kiểm tra đèn trước/sau' },
            { id: uid('i'), text: 'Kiểm tra gương chiếu hậu' },
          ],
        },
        {
          id: uid('t'),
          title: 'Kiểm tra nội thất',
          description: 'Kiểm tra tình trạng ghế, vô lăng, taplo',
          priority: 'medium',
          checklist: [
            { id: uid('i'), text: 'Kiểm tra ghế lái và ghế phụ' },
            { id: uid('i'), text: 'Kiểm tra vô lăng' },
            { id: uid('i'), text: 'Kiểm tra taplo và màn hình' },
            { id: uid('i'), text: 'Kiểm tra thảm lót sàn' },
          ],
        },
        {
          id: uid('t'),
          title: 'Kiểm tra máy móc',
          description: 'Kiểm tra dầu, nước làm mát, acquy',
          priority: 'high',
          checklist: [
            { id: uid('i'), text: 'Kiểm tra mức dầu máy' },
            { id: uid('i'), text: 'Kiểm tra nước làm mát' },
            { id: uid('i'), text: 'Kiểm tra acquy' },
            { id: uid('i'), text: 'Kiểm tra các còi' },
          ],
        },
      ],
    },

    {
      id: 'tpl_oil_change',
      name: 'Thay dầu máy',
      description: 'Thay dầu nhớt và lọc dầu theo định kỳ',
      type: 'oil_change',
      estimatedDurationMinutes: 20,
      defaultAssigneeId: null,
      isFavorite: true,
      usageCount: 28,
      createdAt: now,
      updatedAt: now,
      tasks: [
        {
          id: uid('t'),
          title: 'Chuẩn bị và nâng xe',
          description: 'Lắp đặt thiết bị và nâng xe an toàn',
          priority: 'high',
          checklist: [
            { id: uid('i'), text: 'Lắp cầu xiết bánh' },
            { id: uid('i'), text: 'Nâng xe bằng kích' },
            { id: uid('i'), text: 'Đặt giá đỡ an toàn' },
          ],
        },
        {
          id: uid('t'),
          title: 'Xả và thay dầu cũ',
          description: 'Xả dầu cũ, thay lọc dầu, đổ dầu mới',
          priority: 'high',
          checklist: [
            { id: uid('i'), text: 'Đặt chậu hứng dầu' },
            { id: uid('i'), text: 'Mở nắp cống xả dầu' },
            { id: uid('i'), text: 'Chờ dầu chảy hết' },
            { id: uid('i'), text: 'Thay lọc dầu mới' },
            { id: uid('i'), text: 'Đổ dầu nhớt mới (đúng loại)' },
            { id: uid('i'), text: 'Kiểm tra mức dầu sau khi đổ' },
          ],
        },
        {
          id: uid('t'),
          title: 'Kiểm tra sau thay dầu',
          description: 'Khởi động xe và kiểm tra rò rỉ',
          priority: 'medium',
          checklist: [
            { id: uid('i'), text: 'Khởi động máy, để chạy 2-3 phút' },
            { id: uid('i'), text: 'Kiểm tra không rò rỉ dầu' },
            { id: uid('i'), text: 'Kiểm tra que thăm dầu' },
            { id: uid('i'), text: 'Ghi nhận km hiện tại' },
          ],
        },
      ],
    },

    {
      id: 'tpl_interior_cleaning',
      name: 'Vệ sinh nội thất',
      description: 'Hút bụi, lau chùi, làm sạch nội thất toàn diện',
      type: 'interior_cleaning',
      estimatedDurationMinutes: 45,
      defaultAssigneeId: null,
      isFavorite: false,
      usageCount: 15,
      createdAt: now,
      updatedAt: now,
      tasks: [
        {
          id: uid('t'),
          title: 'Dọn dẹp và hút bụi',
          description: 'Loại bỏ rác và hút bụi toàn bộ nội thất',
          priority: 'medium',
          checklist: [
            { id: uid('i'), text: 'Lấy hết rác trong xe' },
            { id: uid('i'), text: 'Hút bụi ghế trước và sau' },
            { id: uid('i'), text: 'Hút bụi sàn và cốp' },
            { id: uid('i'), text: 'Lật thảm lót rửa sạch' },
          ],
        },
        {
          id: uid('t'),
          title: 'Lau chùi bề mặt',
          description: 'Lau nội thất bằng dung dịch chuyên dụng',
          priority: 'medium',
          checklist: [
            { id: uid('i'), text: 'Lau taplo và màn hình' },
            { id: uid('i'), text: 'Lau vô lăng và cần số' },
            { id: uid('i'), text: 'Lau cửa và viền cửa' },
            { id: uid('i'), text: 'Lau khe điều hòa' },
          ],
        },
        {
          id: uid('t'),
          title: 'Làm sạch ghế và thảm',
          description: 'Xịt hóa chất và vệ sinh ghế, thảm',
          priority: 'medium',
          checklist: [
            { id: uid('i'), text: 'Xịt dung dịch lên ghế' },
            { id: uid('i'), text: 'Chải và lau sạch ghế' },
            { id: uid('i'), text: 'Phủi và làm khô thảm' },
            { id: uid('i'), text: 'Xịt khử mùi nội thất' },
          ],
        },
      ],
    },

    {
      id: 'tpl_exterior_detailing',
      name: 'Đánh bóng ngoại thất',
      description: 'Rửa xe, đánh bóng, phủ bảo vệ sơn toàn thân',
      type: 'exterior_detailing',
      estimatedDurationMinutes: 90,
      defaultAssigneeId: null,
      isFavorite: false,
      usageCount: 8,
      createdAt: now,
      updatedAt: now,
      tasks: [
        {
          id: uid('t'),
          title: 'Rửa xe sơ bộ',
          description: 'Xịt nước và rửa bùn đất toàn thân xe',
          priority: 'medium',
          checklist: [
            { id: uid('i'), text: 'Xịt nước toàn thân' },
            { id: uid('i'), text: 'Phun dung dịch rửa xe' },
            { id: uid('i'), text: 'Chà sạch từ trên xuống dưới' },
            { id: uid('i'), text: 'Xả nước sạch' },
            { id: uid('i'), text: 'Lau khô bằng khăn microfiber' },
          ],
        },
        {
          id: uid('t'),
          title: 'Đánh bóng sơn',
          description: 'Đánh bóng và phủ bảo vệ lớp sơn xe',
          priority: 'medium',
          checklist: [
            { id: uid('i'), text: 'Xịt clay bar toàn thân' },
            { id: uid('i'), text: 'Đánh bóng bằng máy đánh' },
            { id: uid('i'), text: 'Lau sạch lớp đánh bóng' },
            { id: uid('i'), text: 'Phủ sealent hoặc wax bảo vệ' },
          ],
        },
        {
          id: uid('t'),
          title: 'Làm sạch và phủ lốp',
          description: 'Làm sạch lốp và phủ bóng lốp',
          priority: 'low',
          checklist: [
            { id: uid('i'), text: 'Xịt dung dịch làm sạch lốp' },
            { id: uid('i'), text: 'Chải sạch lốp' },
            { id: uid('i'), text: 'Phủ kem bóng lốp' },
          ],
        },
        {
          id: uid('t'),
          title: 'Làm sạch kính và lazang',
          description: 'Lau kính và làm sạch lazang',
          priority: 'medium',
          checklist: [
            { id: uid('i'), text: 'Lau kính trước và sau' },
            { id: uid('i'), text: 'Lau kính chiếu hậu' },
            { id: uid('i'), text: 'Làm sạch lazang' },
            { id: uid('i'), text: 'Xịt chống nước kính' },
          ],
        },
        {
          id: uid('t'),
          title: 'Làm sạch khoang máy',
          description: 'Xịt rửa và làm khô khoang máy',
          priority: 'low',
          checklist: [
            { id: uid('i'), text: 'Xịt nước khoang máy' },
            { id: uid('i'), text: 'Chải sạch bụi bẩn' },
            { id: uid('i'), text: 'Lau khô các chi tiết' },
            { id: uid('i'), text: 'Xịt dung dịch bảo vệ nhựa' },
          ],
        },
      ],
    },

    {
      id: 'tpl_paint_repair',
      name: 'Sửa chữa sơn',
      description: 'Kiểm tra, sửa chữa và sơn lại các vị trí hỏng sơn',
      type: 'paint_repair',
      estimatedDurationMinutes: 180,
      defaultAssigneeId: null,
      isFavorite: false,
      usageCount: 5,
      createdAt: now,
      updatedAt: now,
      tasks: [
        {
          id: uid('t'),
          title: 'Kiểm tra và đánh dấu',
          description: 'Xác định các vị trí cần sửa sơn',
          priority: 'high',
          checklist: [
            { id: uid('i'), text: 'Rửa xe sạch' },
            { id: uid('i'), text: 'Kiểm tra toàn thân dưới ánh sáng' },
            { id: uid('i'), text: 'Đánh dấu các vị trí cần sửa' },
            { id: uid('i'), text: 'Chụp ảnh trước sửa' },
          ],
        },
        {
          id: uid('t'),
          title: 'Mài và sửa bề mặt',
          description: 'Mài phẳng, sửa móp và tạo lớp nền',
          priority: 'high',
          checklist: [
            { id: uid('i'), text: 'Mài giấy #800 vùng hỏng' },
            { id: uid('i'), text: 'Đắp putty nếu cần' },
            { id: uid('i'), text: 'Mài lại putty phẳng' },
            { id: uid('i'), text: 'Mài lên #1000, #1500, #2000' },
          ],
        },
        {
          id: uid('t'),
          title: 'Sơn lót và sơn màu',
          description: 'Phun sơn lót, sơn màu đúng mã màu',
          priority: 'high',
          checklist: [
            { id: uid('i'), text: 'Che chắn kỹ vùng không sơn' },
            { id: uid('i'), text: 'Xịt sơn lót 2 lớp' },
            { id: uid('i'), text: 'Phun sơn màu 2-3 lớp' },
            { id: uid('i'), text: 'Để khô tự nhiên hoặc sấy' },
          ],
        },
        {
          id: uid('t'),
          title: 'Đánh bóng hoàn thiện',
          description: 'Mài mờ, đánh bóng và kiểm tra cuối',
          priority: 'medium',
          checklist: [
            { id: uid('i'), text: 'Mài mờ bề mặt sơn' },
            { id: uid('i'), text: 'Đánh bóng hoàn thiện' },
            { id: uid('i'), text: 'Kiểm tra độ bóng và màu' },
            { id: uid('i'), text: 'Chụp ảnh sau sửa' },
          ],
        },
      ],
    },

    {
      id: 'tpl_full_service',
      name: 'Dịch vụ toàn diện',
      description: 'Kiểm tra và bảo dưỡng toàn diện trước khi bán',
      type: 'full_service',
      estimatedDurationMinutes: 120,
      defaultAssigneeId: null,
      isFavorite: false,
      usageCount: 20,
      createdAt: now,
      updatedAt: now,
      tasks: [
        {
          id: uid('t'),
          title: 'Kiểm tra tổng quát',
          description: 'Đánh giá tổng thể tình trạng xe',
          priority: 'high',
          checklist: [
            { id: uid('i'), text: 'Kiểm tra ngoại thất' },
            { id: uid('i'), text: 'Kiểm tra nội thất' },
            { id: uid('i'), text: 'Kiểm tra máy móc' },
            { id: uid('i'), text: 'Kiểm tra điện và điện tử' },
            { id: uid('i'), text: 'Ghi nhận các hư hỏng' },
          ],
        },
        {
          id: uid('t'),
          title: 'Bảo dưỡng cơ bản',
          description: 'Thay dầu, kiểm tra ắc quy, nước làm mát',
          priority: 'high',
          checklist: [
            { id: uid('i'), text: 'Thay dầu máy nếu cần' },
            { id: uid('i'), text: 'Kiểm tra acquy' },
            { id: uid('i'), text: 'Kiểm tra nước làm mát' },
            { id: uid('i'), text: 'Kiểm tra dầu phanh' },
            { id: uid('i'), text: 'Kiểm tra lốp và áp suất' },
          ],
        },
        {
          id: uid('t'),
          title: 'Vệ sinh và đánh bóng',
          description: 'Làm sạch toàn diện cả nội và ngoại thất',
          priority: 'medium',
          checklist: [
            { id: uid('i'), text: 'Hút bụi và vệ sinh nội thất' },
            { id: uid('i'), text: 'Rửa xe ngoại thất' },
            { id: uid('i'), text: 'Đánh bóng sơn nếu cần' },
            { id: uid('i'), text: 'Làm sạch khoang máy' },
            { id: uid('i'), text: 'Phủ bảo vệ sơn' },
          ],
        },
        {
          id: uid('t'),
          title: 'Kiểm tra pháp lý',
          description: 'Kiểm tra giấy tờ và tài liệu xe',
          priority: 'high',
          checklist: [
            { id: uid('i'), text: 'Kiểm tra đăng ký xe' },
            { id: uid('i'), text: 'Kiểm tra bảo hiểm' },
            { id: uid('i'), text: 'Kiểm tra tem kiểm định' },
            { id: uid('i'), text: 'Đối chiếu số khung, số máy' },
          ],
        },
      ],
    },

    {
      id: 'tpl_custom_base',
      name: 'Mẫu tuỳ chỉnh',
      description: 'Tạo mẫu công việc tuỳ theo nhu cầu riêng',
      type: 'custom',
      estimatedDurationMinutes: 30,
      defaultAssigneeId: null,
      isFavorite: false,
      usageCount: 3,
      createdAt: now,
      updatedAt: now,
      tasks: [
        {
          id: uid('t'),
          title: 'Công việc 1',
          description: 'Mô tả công việc cần thực hiện',
          priority: 'medium',
          checklist: [
            { id: uid('i'), text: 'Bước 1' },
            { id: uid('i'), text: 'Bước 2' },
          ],
        },
      ],
    },
  ]
}

// ====== SERVICE ======

const STORAGE_KEY = 'gara-templates-v1'

function loadFromStorage(): TaskTemplate[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as TaskTemplate[]
      if (Array.isArray(parsed) && parsed.length > 0) return parsed
    }
  } catch {
    // ignore
  }
  return buildSeedTemplates()
}

function saveToStorage(templates: TaskTemplate[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(templates))
  } catch {
    // ignore
  }
}

export const templateService = {
  getTemplates(): TaskTemplate[] {
    return loadFromStorage()
  },

  createTemplate(data: Omit<TaskTemplate, 'id' | 'usageCount' | 'createdAt' | 'updatedAt'>): TaskTemplate {
    const now = new Date().toISOString()
    const template: TaskTemplate = {
      ...data,
      id: uid('tpl'),
      usageCount: 0,
      createdAt: now,
      updatedAt: now,
    }
    const templates = loadFromStorage()
    templates.push(template)
    saveToStorage(templates)
    return template
  },

  updateTemplate(id: string, patch: Partial<Omit<TaskTemplate, 'id' | 'createdAt'>>): TaskTemplate | null {
    const templates = loadFromStorage()
    const idx = templates.findIndex((t) => t.id === id)
    if (idx < 0) return null
    templates[idx] = { ...templates[idx], ...patch, updatedAt: new Date().toISOString() }
    saveToStorage(templates)
    return templates[idx]
  },

  deleteTemplate(id: string): boolean {
    const templates = loadFromStorage()
    const next = templates.filter((t) => t.id !== id)
    if (next.length === templates.length) return false
    saveToStorage(next)
    return true
  },

  duplicateTemplate(id: string): TaskTemplate | null {
    const templates = loadFromStorage()
    const src = templates.find((t) => t.id === id)
    if (!src) return null
    const now = new Date().toISOString()
    const copy: TaskTemplate = {
      ...src,
      id: uid('tpl'),
      name: `${src.name} (copy)`,
      usageCount: 0,
      createdAt: now,
      updatedAt: now,
      tasks: src.tasks.map((task) => ({
        ...task,
        id: uid('t'),
        checklist: task.checklist.map((item) => ({ ...item, id: uid('i') })),
      })),
    }
    templates.push(copy)
    saveToStorage(templates)
    return copy
  },

  toggleFavorite(id: string): TaskTemplate | null {
    const templates = loadFromStorage()
    const idx = templates.findIndex((t) => t.id === id)
    if (idx < 0) return null
    templates[idx] = {
      ...templates[idx],
      isFavorite: !templates[idx].isFavorite,
      updatedAt: new Date().toISOString(),
    }
    saveToStorage(templates)
    return templates[idx]
  },

  incrementUsage(id: string): void {
    const templates = loadFromStorage()
    const idx = templates.findIndex((t) => t.id === id)
    if (idx < 0) return
    templates[idx] = { ...templates[idx], usageCount: templates[idx].usageCount + 1, updatedAt: new Date().toISOString() }
    saveToStorage(templates)
  },

  /**
   * Converts template tasks into real Task[] for a given vehicle.
   * Each checklist item from the template becomes a checklist item on the task.
   * Tasks get stable `ruleId` derived from the template ID so re-applying
   * merges correctly with existing tasks.
   */
  applyTemplateToVehicle(template: TaskTemplate, vehicleId: string): Task[] {
    const now = new Date().toISOString()
    return template.tasks.map((tplTask) => {
      const taskId = uid('task')
      return {
        id: taskId,
        title: tplTask.title,
        description: tplTask.description,
        priority: tplTask.priority,
        status: 'todo' as const,
        assigneeId: template.defaultAssigneeId,
        vehicleId,
        checklist: tplTask.checklist.map((item) => ({
          id: item.id,
          text: item.text,
          done: false,
        })),
        ruleId: `${template.id}:${tplTask.id}`,
        createdAt: now,
      }
    })
  },
}

export { buildSeedTemplates }
