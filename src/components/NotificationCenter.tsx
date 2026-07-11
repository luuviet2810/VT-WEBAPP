import { useState, useEffect, useRef } from 'react'
import { Bell, X } from 'lucide-react'

export default function NotificationCenter() {
  const [open, setOpen] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open])

  return (
    <>
      <button onClick={() => setOpen(true)}
        className="relative flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors shadow-sm">
        <Bell size={16} className="text-slate-400" />
      </button>

      {open && <div className="fixed inset-0 z-40 bg-black/30" onClick={() => setOpen(false)} />}

      {open && (
        <div ref={panelRef} className="fixed right-0 top-0 z-50 flex h-full flex-col bg-white shadow-2xl animate-slide-in-right" style={{ width: 'min(420px, 100vw)' }}>
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <Bell size={16} className="text-slate-400" />
              <h2 className="text-base font-bold text-slate-900">Thông báo</h2>
            </div>
            <button onClick={() => setOpen(false)} className="btn-icon"><X size={18} /></button>
          </div>
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center px-4">
              <Bell size={40} className="mx-auto text-slate-200" />
              <p className="mt-3 text-sm font-medium text-slate-400">Tính năng đang tạm tắt</p>
              <p className="mt-1 text-xs text-slate-300">Sẽ được xây dựng lại sau</p>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
