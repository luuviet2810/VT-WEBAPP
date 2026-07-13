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

import type { Task, TaskTemplate, TaskTemplateTask, TaskTemplateType } from '../types'

function uid(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
}

// Ensure every checklist item has done: false
function makeChecklistItem(text: string): { id: string; text: string; done: false } {
  return { id: uid('i'), text, done: false }
}

// ====== SEED TEMPLATES ======

function buildSeedTemplates(): TaskTemplate[] {
  const now = new Date().toISOString()
  return [
    {
      id: 'tpl_general_inspection',
      name: 'Kiểm tra tổng quát',
      description: 'Kiểm tra toàn diện tình trạng xe trước khi nhận bán',
      type: 'general_inspection' as TaskTemplateType,
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
          priority: 'medium' as const,
          checklist: [
            makeChecklistItem('Kiểm tra sơn xe (trầy, móp)'),
            makeChecklistItem('Kiểm tra kính chắn gió'),
            makeChecklistItem('Kiểm tra đèn trước/sau'),
            makeChecklistItem('Kiểm tra gương chiếu hậu'),
          ],
        },
        {
          id: uid('t'),
          title: 'Kiểm tra nội thất',
          description: 'Kiểm tra tình trạng ghế, vô lăng, taplo',
          priority: 'medium' as const,
          checklist: [
            makeChecklistItem('Kiểm tra ghế lái và ghế phụ'),
            makeChecklistItem('Kiểm tra vô lăng'),
            makeChecklistItem('Kiểm tra taplo và màn hình'),
            makeChecklistItem('Kiểm tra thảm lót sàn'),
          ],
        },
        {
          id: uid('t'),
          title: 'Kiểm tra máy móc',
          description: 'Kiểm tra dầu, nước làm mát, acquy',
          priority: 'high' as const,
          checklist: [
            makeChecklistItem('Kiểm tra mức dầu máy'),
            makeChecklistItem('Kiểm tra nước làm mát'),
            makeChecklistItem('Kiểm tra acquy'),
            makeChecklistItem('Kiểm tra các còi'),
          ],
        },
      ],
    },

    {
      id: 'tpl_oil_change',
      name: 'Thay dầu máy',
      description: 'Thay dầu nhớt và lọc dầu theo định kỳ',
      type: 'oil_change' as TaskTemplateType,
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
          priority: 'high' as const,
          checklist: [
            makeChecklistItem('Lắp cầu xiết bánh'),
            makeChecklistItem('Nâng xe bằng kích'),
            makeChecklistItem('Đặt giá đỡ an toàn'),
          ],
        },
        {
          id: uid('t'),
          title: 'Xả và thay dầu cũ',
          description: 'Xả dầu cũ, thay lọc dầu, đổ dầu mới',
          priority: 'high' as const,
          checklist: [
            makeChecklistItem('Đặt chậu hứng dầu'),
            makeChecklistItem('Mở nắp cống xả dầu'),
            makeChecklistItem('Chờ dầu chảy hết'),
            makeChecklistItem('Thay lọc dầu mới'),
            makeChecklistItem('Đổ dầu nhớt mới (đúng loại)'),
            makeChecklistItem('Kiểm tra mức dầu sau khi đổ'),
          ],
        },
        {
          id: uid('t'),
          title: 'Kiểm tra sau thay dầu',
          description: 'Khởi động xe và kiểm tra rò rỉ',
          priority: 'medium' as const,
          checklist: [
            makeChecklistItem('Khởi động máy, để chạy 2-3 phút'),
            makeChecklistItem('Kiểm tra không rò rỉ dầu'),
            makeChecklistItem('Kiểm tra que thăm dầu'),
            makeChecklistItem('Ghi nhận km hiện tại'),
          ],
        },
      ],
    },

    {
      id: 'tpl_interior_cleaning',
      name: 'Vệ sinh nội thất',
      description: 'Hút bụi, lau chùi, làm sạch nội thất toàn diện',
      type: 'interior_cleaning' as TaskTemplateType,
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
          priority: 'medium' as const,
          checklist: [
            makeChecklistItem('Lấy hết rác trong xe'),
            makeChecklistItem('Hút bụi ghế trước và sau'),
            makeChecklistItem('Hút bụi sàn và cốp'),
            makeChecklistItem('Lật thảm lót rửa sạch'),
          ],
        },
        {
          id: uid('t'),
          title: 'Lau chùi bề mặt',
          description: 'Lau nội thất bằng dung dịch chuyên dụng',
          priority: 'medium' as const,
          checklist: [
            makeChecklistItem('Lau taplo và màn hình'),
            makeChecklistItem('Lau vô lăng và cần số'),
            makeChecklistItem('Lau cửa và viền cửa'),
            makeChecklistItem('Lau khe điều hòa'),
          ],
        },
        {
          id: uid('t'),
          title: 'Làm sạch ghế và thảm',
          description: 'Xịt hóa chất và vệ sinh ghế, thảm',
          priority: 'medium' as const,
          checklist: [
            makeChecklistItem('Xịt dung dịch lên ghế'),
            makeChecklistItem('Chải và lau sạch ghế'),
            makeChecklistItem('Phủi và làm khô thảm'),
            makeChecklistItem('Xịt khử mùi nội thất'),
          ],
        },
      ],
    },

    {
      id: 'tpl_exterior_detailing',
      name: 'Đánh bóng ngoại thất',
      description: 'Rửa xe, đánh bóng, phủ bảo vệ sơn toàn thân',
      type: 'exterior_detailing' as TaskTemplateType,
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
          priority: 'medium' as const,
          checklist: [
            makeChecklistItem('Xịt nước toàn thân'),
            makeChecklistItem('Phun dung dịch rửa xe'),
            makeChecklistItem('Chà sạch từ trên xuống dưới'),
            makeChecklistItem('Xả nước sạch'),
            makeChecklistItem('Lau khô bằng khăn microfiber'),
          ],
        },
        {
          id: uid('t'),
          title: 'Đánh bóng sơn',
          description: 'Đánh bóng và phủ bảo vệ lớp sơn xe',
          priority: 'medium' as const,
          checklist: [
            makeChecklistItem('Xịt clay bar toàn thân'),
            makeChecklistItem('Đánh bóng bằng máy đánh'),
            makeChecklistItem('Lau sạch lớp đánh bóng'),
            makeChecklistItem('Phủ sealent hoặc wax bảo vệ'),
          ],
        },
        {
          id: uid('t'),
          title: 'Làm sạch và phủ lốp',
          description: 'Làm sạch lốp và phủ bóng lốp',
          priority: 'low' as const,
          checklist: [
            makeChecklistItem('Xịt dung dịch làm sạch lốp'),
            makeChecklistItem('Chải sạch lốp'),
            makeChecklistItem('Phủ kem bóng lốp'),
          ],
        },
        {
          id: uid('t'),
          title: 'Làm sạch kính và lazang',
          description: 'Lau kính và làm sạch lazang',
          priority: 'medium' as const,
          checklist: [
            makeChecklistItem('Lau kính trước và sau'),
            makeChecklistItem('Lau kính chiếu hậu'),
            makeChecklistItem('Làm sạch lazang'),
            makeChecklistItem('Xịt chống nước kính'),
          ],
        },
        {
          id: uid('t'),
          title: 'Làm sạch khoang máy',
          description: 'Xịt rửa và làm khô khoang máy',
          priority: 'low' as const,
          checklist: [
            makeChecklistItem('Xịt nước khoang máy'),
            makeChecklistItem('Chải sạch bụi bẩn'),
            makeChecklistItem('Lau khô các chi tiết'),
            makeChecklistItem('Xịt dung dịch bảo vệ nhựa'),
          ],
        },
      ],
    },

    {
      id: 'tpl_paint_repair',
      name: 'Sửa chữa sơn',
      description: 'Kiểm tra, sửa chữa và sơn lại các vị trí hỏng sơn',
      type: 'paint_repair' as TaskTemplateType,
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
          priority: 'high' as const,
          checklist: [
            makeChecklistItem('Rửa xe sạch'),
            makeChecklistItem('Kiểm tra toàn thân dưới ánh sáng'),
            makeChecklistItem('Đánh dấu các vị trí cần sửa'),
            makeChecklistItem('Chụp ảnh trước sửa'),
          ],
        },
        {
          id: uid('t'),
          title: 'Mài và sửa bề mặt',
          description: 'Mài phẳng, sửa móp và tạo lớp nền',
          priority: 'high' as const,
          checklist: [
            makeChecklistItem('Mài giấy #800 vùng hỏng'),
            makeChecklistItem('Đắp putty nếu cần'),
            makeChecklistItem('Mài lại putty phẳng'),
            makeChecklistItem('Mài lên #1000, #1500, #2000'),
          ],
        },
        {
          id: uid('t'),
          title: 'Sơn lót và sơn màu',
          description: 'Phun sơn lót, sơn màu đúng mã màu',
          priority: 'high' as const,
          checklist: [
            makeChecklistItem('Che chắn kỹ vùng không sơn'),
            makeChecklistItem('Xịt sơn lót 2 lớp'),
            makeChecklistItem('Phun sơn màu 2-3 lớp'),
            makeChecklistItem('Để khô tự nhiên hoặc sấy'),
          ],
        },
        {
          id: uid('t'),
          title: 'Đánh bóng hoàn thiện',
          description: 'Mài mờ, đánh bóng và kiểm tra cuối',
          priority: 'medium' as const,
          checklist: [
            makeChecklistItem('Mài mờ bề mặt sơn'),
            makeChecklistItem('Đánh bóng hoàn thiện'),
            makeChecklistItem('Kiểm tra độ bóng và màu'),
            makeChecklistItem('Chụp ảnh sau sửa'),
          ],
        },
      ],
    },

    {
      id: 'tpl_full_service',
      name: 'Dịch vụ toàn diện',
      description: 'Kiểm tra và bảo dưỡng toàn diện trước khi bán',
      type: 'full_service' as TaskTemplateType,
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
          priority: 'high' as const,
          checklist: [
            makeChecklistItem('Kiểm tra ngoại thất'),
            makeChecklistItem('Kiểm tra nội thất'),
            makeChecklistItem('Kiểm tra máy móc'),
            makeChecklistItem('Kiểm tra điện và điện tử'),
            makeChecklistItem('Ghi nhận các hư hỏng'),
          ],
        },
        {
          id: uid('t'),
          title: 'Bảo dưỡng cơ bản',
          description: 'Thay dầu, kiểm tra ắc quy, nước làm mát',
          priority: 'high' as const,
          checklist: [
            makeChecklistItem('Thay dầu máy nếu cần'),
            makeChecklistItem('Kiểm tra acquy'),
            makeChecklistItem('Kiểm tra nước làm mát'),
            makeChecklistItem('Kiểm tra dầu phanh'),
            makeChecklistItem('Kiểm tra lốp và áp suất'),
          ],
        },
        {
          id: uid('t'),
          title: 'Vệ sinh và đánh bóng',
          description: 'Làm sạch toàn diện cả nội và ngoại thất',
          priority: 'medium' as const,
          checklist: [
            makeChecklistItem('Hút bụi và vệ sinh nội thất'),
            makeChecklistItem('Rửa xe ngoại thất'),
            makeChecklistItem('Đánh bóng sơn nếu cần'),
            makeChecklistItem('Làm sạch khoang máy'),
            makeChecklistItem('Phủ bảo vệ sơn'),
          ],
        },
        {
          id: uid('t'),
          title: 'Kiểm tra pháp lý',
          description: 'Kiểm tra giấy tờ và tài liệu xe',
          priority: 'high' as const,
          checklist: [
            makeChecklistItem('Kiểm tra đăng ký xe'),
            makeChecklistItem('Kiểm tra bảo hiểm'),
            makeChecklistItem('Kiểm tra tem kiểm định'),
            makeChecklistItem('Đối chiếu số khung, số máy'),
          ],
        },
      ],
    },

    {
      id: 'tpl_custom_base',
      name: 'Mẫu tuỳ chỉnh',
      description: 'Tạo mẫu công việc tuỳ theo nhu cầu riêng',
      type: 'custom' as TaskTemplateType,
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
          priority: 'medium' as const,
          checklist: [
            makeChecklistItem('Bước 1'),
            makeChecklistItem('Bước 2'),
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
      const parsed: TaskTemplate[] = JSON.parse(raw)
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
    templates[idx] = {
      ...templates[idx],
      usageCount: templates[idx].usageCount + 1,
      updatedAt: new Date().toISOString(),
    }
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
      return {
        id: uid('task'),
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
