import { useState, useMemo, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Bell, X, Search, CheckCheck, ArrowRight } from 'lucide-react'
import { useStore } from '../store/useStore'
import { formatNotification } from '../utils/notificationFormatter'

type EventType = 'all' | 'location' | 'checksheet' | 'tasks' | 'images' | 'documents'

function getDateGroup(dateStr: string): string {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const date = new Date(dateStr)
  const diffDays = Math.floor((today.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))
  if (diffDays === 0) return 'Hôm nay'
  if (diffDays === 1) return 'Hôm qua'
  if (diffDays <= 7) return 'Tuần này'
  if (diffDays <= 14) return 'Tuần trước'
  if (diffDays <= 30) return 'Tháng này'
  return 'Cũ hơn'
}

export default function NotificationCenter() {
  const navigate = useNavigate()
  const notifications = useStore((s) => s.notifications)
  const markNotificationRead = useStore((s) => s.markNotificationRead)
  const markAllNotificationsRead = useStore((s) => s.markAllNotificationsRead)

  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<EventType>('all')
  const panelRef = useRef<HTMLDivElement>(null)

  const unread = notifications.filter((n) => !n.read).length

  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open])

  // Format all notifications
  const formatted = useMemo(() => notifications.map(formatNotification), [notifications])

  // Filter + search
  const filtered = useMemo(() => {
    let items = formatted
    if (filter !== 'all') {
      const typeMap: Partial<Record<EventType, string[]>> = {
        location: ['vehicle_status'],
        checksheet: ['checksheet_in', 'checksheet_out'],
        tasks: ['task_created', 'task_done'],
        images: [],
        documents: [],
      }
      const types = typeMap[filter] || []
      items = items.filter((i) => {
        const n = notifications.find((n) => n.id === i.id)
        return n && types.includes(n.type)
      })
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      items = items.filter((i) => i.title.toLowerCase().includes(q))
    }
    return items
  }, [formatted, filter, search, notifications])

  // Group by date
  const groups = useMemo(() => {
    const map = new Map<string, typeof filtered>()
    for (const item of filtered) {
      const group = getDateGroup(item.createdAt)
      const list = map.get(group) || []
      list.push(item)
      map.set(group, list)
    }
    const order = ['Hôm nay', 'Hôm qua', 'Tuần này', 'Tuần trước', 'Tháng này', 'Cũ hơn']
    return order.filter((g) => map.has(g)).map((label) => ({ label, items: map.get(label)! }))
  }, [filtered])

  return (
    <>
      {/* Bell button */}
      <button onClick={() => setOpen(true)}
        className="relative flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors shadow-sm">
        <Bell size={16} className={unread > 0 ? 'text-blue-500' : 'text-slate-400'} />
        {unread > 0 && <span className="text-slate-700 text-xs font-semibold">{unread} mới</span>}
        {unread > 0 && <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white">{unread > 9 ? '9+' : unread}</span>}
      </button>

      {/* Overlay */}
      {open && <div className="fixed inset-0 z-40 bg-black/30" onClick={() => setOpen(false)} />}

      {/* Panel */}
      {open && (
        <div ref={panelRef} className="fixed right-0 top-0 z-50 flex h-full flex-col bg-white shadow-2xl animate-slide-in-right" style={{ width: 'min(420px, 100vw)' }}>
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <Bell size={16} className="text-blue-500" />
              <h2 className="text-base font-bold text-slate-900">Activity Center</h2>
            </div>
            <div className="flex items-center gap-2">
              {unread > 0 && (
                <button onClick={markAllNotificationsRead} className="flex items-center gap-1 rounded-lg bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-600 hover:bg-blue-100 transition-colors">
                  <CheckCheck size={13} /> Đọc hết
                </button>
              )}
              <button onClick={() => setOpen(false)} className="btn-icon"><X size={18} /></button>
            </div>
          </div>

          {/* Search */}
          <div className="px-5 pt-4 pb-3">
            <div className="relative flex items-center" style={{ height: 44 }}>
              <Search size={15} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input className="w-full h-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition"
                placeholder="Tìm kiếm..." value={search} onChange={(e) => setSearch(e.target.value)} autoFocus />
            </div>
          </div>

          {/* Filter chips */}
          <div className="px-5 pb-3">
            <div className="flex gap-1.5 overflow-x-auto pb-1">
              {([
                { key: 'all' as EventType, label: 'All' },
                { key: 'location' as EventType, label: 'Location' },
                { key: 'checksheet' as EventType, label: 'Checksheet' },
                { key: 'tasks' as EventType, label: 'Tasks' },
              ]).map((chip) => (
                <button key={chip.key} onClick={() => setFilter(chip.key)}
                  className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                    filter === chip.key ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}>
                  {chip.label}
                </button>
              ))}
            </div>
          </div>

          {/* Timeline */}
          <div className="flex-1 overflow-y-auto px-5 pb-4">
            {groups.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <Bell size={32} className="text-slate-300" />
                <p className="mt-3 text-sm font-medium text-slate-400">{search ? 'Không tìm thấy kết quả' : 'Chưa có hoạt động nào'}</p>
              </div>
            ) : (
              <div className="space-y-6">
                {groups.map((group) => (
                  <div key={group.label}>
                    <div className="sticky top-0 z-10 bg-white pb-2 pt-1">
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-400">{group.label}</span>
                    </div>
                    <div className="space-y-1">
                      {group.items.map((item) => (
                        <div key={item.id} onClick={() => {
                          markNotificationRead(item.id)
                          if (item.link) { navigate(item.link); setOpen(false) }
                        }}
                          className={`flex items-start gap-3 rounded-xl px-3 py-3.5 transition-colors cursor-pointer hover:bg-slate-50 ${!item.read ? 'bg-blue-50/40' : ''}`}>
                          {/* Color dot */}
                          <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full" style={{ background: `${item.iconColor}18` }}>
                            <span className="h-2.5 w-2.5 rounded-full" style={{ background: item.iconColor }} />
                          </div>

                          {/* Two-line content */}
                          <div className="min-w-0 flex-1">
                            <div className={`text-sm font-semibold leading-tight ${item.read ? 'text-slate-600' : 'text-slate-900'}`}>{item.title}</div>
                            <div className="text-xs text-slate-400 mt-1">{item.subtitle}</div>
                          </div>
                          {!item.read && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-blue-500" />}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-5 py-3 border-t border-slate-100">
            <Link to="/vi-tri" onClick={() => setOpen(false)} className="flex w-full items-center justify-center gap-1 rounded-xl py-2.5 text-xs font-medium text-blue-600 hover:bg-blue-50 transition-colors">
              Xem tất cả hoạt động <ArrowRight size={12} />
            </Link>
          </div>
        </div>
      )}
    </>
  )
}
