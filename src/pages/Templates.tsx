/**
 * Templates Page
 *
 * Full-page template library accessible from sidebar.
 * Admin/Manager: CRUD templates
 * Staff: read-only view
 */

import { TemplateLibrary } from '../components/TemplateLibrary'

export default function TemplatesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Mẫu công việc</h1>
        <p className="mt-1 text-sm text-gray-500">
          Tạo và quản lý các mẫu công việc. Áp dụng nhanh vào xe để tạo checklist và nhiệm vụ tự động.
        </p>
      </div>
      <TemplateLibrary />
    </div>
  )
}
