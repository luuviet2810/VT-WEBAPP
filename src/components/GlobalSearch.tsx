import { useEffect, useRef, useState } from 'react'
import { Search, X } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../store/useStore'
import { Modal } from './ui'

export default function GlobalSearch() {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const navigate = useNavigate()
  const vehicles = useStore((s) => s.vehicles)
  const tasks = useStore((s) => s.tasks)
  const employees = useStore((s) => s.employees)

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setOpen(true)
      }
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50)
    } else {
      setQuery('')
    }
  }, [open])

  const q = query.toLowerCase().trim()

  const vehicleResults = q
    ? vehicles.filter((v) => v.model.toLowerCase().includes(q) || v.plate.toLowerCase().includes(q) || v.color?.toLowerCase().includes(q)).slice(0, 5)
    : []

  const taskResults = q
    ? tasks.filter((t) => t.title.toLowerCase().includes(q) || t.description?.toLowerCase().includes(q)).slice(0, 5)
    : []

  const employeeResults = q
    ? employees.filter((e) => e.name.toLowerCase().includes(q)).slice(0, 3)
    : []

  const hasResults = vehicleResults.length + taskResults.length + employeeResults.length > 0

  function go(result: { type: string; id?: string }) {
    setOpen(false)
    if (result.type === 'vehicle') navigate(`/xe/${result.id}`)
    if (result.type === 'task') navigate(`/nhiem-vu/${result.id}`)
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-400 shadow-sm hover:border-slate-300"
      >
        <Search size={14} />
        <span className="hidden sm:inline">Tìm kiếm...</span>
        <kbd className="hidden rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[10px] font-medium text-slate-400 sm:inline">⌘K</kbd>
      </button>

      <Modal open={open} onClose={() => setOpen(false)} title="Tìm kiếm toàn hệ thống" width="max-w-xl">
        <div className="space-y-3">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              ref={inputRef}
              className="input w-full pl-9"
              placeholder="Tìm xe, biển số, nhiệm vụ, nhân viên..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            {query && (
              <button className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600" onClick={() => setQuery('')}>
                <X size={15} />
              </button>
            )}
          </div>

          {!q && (
            <div className="py-6 text-center text-sm text-slate-400">Nhập từ khoá để tìm kiếm...</div>
          )}

          {q && !hasResults && (
            <div className="py-6 text-center text-sm text-slate-400">Không tìm thấy kết quả nào</div>
          )}

          {vehicleResults.length > 0 && (
            <div>
              <div className="mb-1 text-xs font-semibold text-slate-400 uppercase">Xe</div>
              {vehicleResults.map((v) => (
                <button
                  key={v.id}
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm hover:bg-slate-50"
                  onClick={() => go({ type: 'vehicle', id: v.id })}
                >
                  <div className="h-8 w-10 overflow-hidden rounded-lg bg-slate-100">
                    {v.images[0] && <img src={v.images[0]} className="h-full w-full object-cover" />}
                  </div>
                  <div>
                    <div className="font-medium text-slate-800">{v.model}</div>
                    <div className="text-xs text-slate-400">{v.plate} • {v.color || ''}</div>
                  </div>
                </button>
              ))}
            </div>
          )}

          {taskResults.length > 0 && (
            <div>
              <div className="mb-1 text-xs font-semibold text-slate-400 uppercase">Nhiệm vụ</div>
              {taskResults.map((t) => (
                <button
                  key={t.id}
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm hover:bg-slate-50"
                  onClick={() => go({ type: 'task', id: t.id })}
                >
                  <div className="text-sm font-medium text-slate-700">{t.title}</div>
                </button>
              ))}
            </div>
          )}

          {employeeResults.length > 0 && (
            <div>
              <div className="mb-1 text-xs font-semibold text-slate-400 uppercase">Nhân viên</div>
              {employeeResults.map((e) => (
                <div key={e.id} className="flex items-center gap-3 rounded-lg px-3 py-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-100 text-sm font-semibold text-brand-700">{e.name[0]}</div>
                  <div className="text-sm font-medium text-slate-700">{e.name}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Modal>
    </>
  )
}
