import { useState } from 'react'
import { Bell, Check, CheckCheck, Info, Settings, Truck } from 'lucide-react'
import { useStore } from '../store/useStore'
import { formatDateTime } from '../utils/format'
import { useIsAdmin } from '../hooks/useIsAdmin'

const TYPE_ICONS: Record<string, { icon: typeof Info; color: string }> = {
  task_created: { icon: Bell, color: 'text-blue-500 bg-blue-50' },
  task_done: { icon: Check, color: 'text-green-600 bg-green-50' },
  vehicle_added: { icon: Truck, color: 'text-brand-600 bg-brand-50' },
  vehicle_status: { icon: Truck, color: 'text-orange-500 bg-orange-50' },
  attendance_edited: { icon: Bell, color: 'text-amber-600 bg-amber-50' },
  system: { icon: Settings, color: 'text-slate-500 bg-slate-50' },
}

export default function NotificationCenter() {
  const notifications = useStore((s) => s.notifications)
  const markNotificationRead = useStore((s) => s.markNotificationRead)
  const markAllNotificationsRead = useStore((s) => s.markAllNotificationsRead)
  const isAdmin = useIsAdmin()
  const [open, setOpen] = useState(false)

  const unread = notifications.filter((n) => !n.read).length

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-700"
      >
        <Bell size={20} />
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="fixed right-0 top-14 z-50 mx-2 w-[calc(100vw-16px)] max-w-sm rounded-2xl border border-slate-200 bg-white shadow-xl sm:mx-4 sm:max-w-sm">
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
              <span className="text-sm font-semibold text-slate-700">Thông báo</span>
              <div className="flex items-center gap-2">
                {unread > 0 && (
                  <button onClick={markAllNotificationsRead} className="flex items-center gap-1 text-xs font-medium text-brand-600 hover:underline">
                    <CheckCheck size={13} />
                    Đọc hết
                  </button>
                )}
              </div>
            </div>
            <div className="max-h-[60vh] overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="px-4 py-8 text-center text-xs text-slate-400">Không có thông báo nào</div>
              ) : (
                notifications.map((n) => {
                  const cfg = TYPE_ICONS[n.type] || TYPE_ICONS.system
                  const Icon = cfg.icon
                  return (
                    <div
                      key={n.id}
                      onClick={() => markNotificationRead(n.id)}
                      className={`flex cursor-pointer gap-3 border-b border-slate-50 px-4 py-3 transition-colors hover:bg-slate-50 ${!n.read ? 'bg-brand-50/40' : ''}`}
                    >
                      <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${cfg.color}`}>
                        <Icon size={15} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <span className={`text-xs font-semibold ${!n.read ? 'text-slate-900' : 'text-slate-500'}`}>{n.title}</span>
                          {!n.read && <span className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-brand-500" />}
                        </div>
                        <p className="mt-0.5 text-xs leading-relaxed text-slate-500">{n.body}</p>
                        <p className="mt-1 text-[10px] text-slate-400">{formatDateTime(n.createdAt)}</p>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
