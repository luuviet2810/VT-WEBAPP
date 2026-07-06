import type { TimelineItem, TimelineItemType } from '../types'

export function formatTimelineTime(time: string) {
  const d = new Date(time)
  if (Number.isNaN(d.getTime())) return time
  return d.toLocaleString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

export function timelineItemTypeLabel(type: TimelineItemType) {
  const labels: Record<TimelineItemType, string> = {
    vehicle_created: 'Tạo xe',
    vehicle_updated: 'Cập nhật xe',
    check_sheet_created: 'Checksheet',
    task_generated: 'Task',
    task_status_changed: 'Task',
    move_log: 'Di chuyển',
    vehicle_status_changed: 'Trạng thái xe',
    photo_uploaded: 'Ảnh',
    document_uploaded: 'Giấy tờ',
    custom: 'Sự kiện',
  }
  return labels[type] ?? type
}
