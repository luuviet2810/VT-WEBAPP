import { useMemo, useState } from 'react'
import { Download, Edit2, LogIn, LogOut, Save, X } from 'lucide-react'
import { useStore } from '../store/useStore'
import { EmptyState } from '../components/ui'
import { useIsAdminMode } from '../hooks/useAuthRole'
import { formatDateTime } from '../utils/format'
import * as XLSX from 'xlsx'

export default function Attendance() {
  const employees = useStore((s) => s.employees)
  const attendance = useStore((s) => s.attendance)
  const currentEmployeeId = useStore((s) => s.currentEmployeeId)
  const checkIn = useStore((s) => s.checkIn)
  const checkOut = useStore((s) => s.checkOut)
  const updateAttendanceEntry = useStore((s) => s.updateAttendanceEntry)
  const isAdmin = useIsAdminMode()
  const [employeeFilter, setEmployeeFilter] = useState('all')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editCheckIn, setEditCheckIn] = useState('')
  const [editCheckOut, setEditCheckOut] = useState('')

  const today = new Date().toISOString().slice(0, 10)
  const todayEntry = attendance.find((a) => a.employeeId === currentEmployeeId && a.date === today)
  const me = employees.find((e) => e.id === currentEmployeeId)

  const filtered = useMemo(
    () => [...attendance].filter((a) => employeeFilter === 'all' || a.employeeId === employeeFilter).sort((a, b) => (a.date < b.date ? 1 : -1)),
    [attendance, employeeFilter]
  )

  function startEdit(entry: (typeof filtered)[0]) {
    setEditingId(entry.id)
    setEditCheckIn(entry.checkIn || '')
    setEditCheckOut(entry.checkOut || '')
  }

  function saveEdit() {
    if (!editingId) return
    updateAttendanceEntry(editingId, { checkIn: editCheckIn || null, checkOut: editCheckOut || null })
    setEditingId(null)
  }

  function exportExcel() {
    const header = ['STT', 'Nhân viên', 'Ngày', 'Giờ vào', 'Giờ ra', 'Ghi chú']
    const data = filtered.map((a, i) => {
      const emp = employees.find((e) => e.id === a.employeeId)
      return [i + 1, emp?.name || '—', a.date, a.checkIn || '', a.checkOut || '', a.note || '']
    })

    const ws = XLSX.utils.aoa_to_sheet([header, ...data])

    // Auto column width
    const colWidths = [6, 22, 14, 12, 12, 30].map((w) => ({ wch: w }))
    ws['!cols'] = colWidths

    // Bold header row
    for (let col = 0; col < header.length; col++) {
      const addr = XLSX.utils.encode_cell({ r: 0, c: col })
      if (!ws[addr]) continue
      ws[addr].s = { font: { bold: true } }
    }

    // Freeze first row
    ws['!freeze'] = { xSplit: 0, ySplit: 1 }

    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Chấm công')
    XLSX.writeFile(wb, `cham-cong-${new Date().toISOString().slice(0, 10)}.xlsx`)
  }

  return (
    <div>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Chấm công</h1>
          <p className="mt-1 text-sm text-slate-500">
            {isAdmin ? 'Bạn có quyền Admin — có thể chỉnh sửa giờ chấm công và export dữ liệu' : 'Chấm công vào/ra hàng ngày'}
          </p>
        </div>
        {isAdmin && (
          <button className="btn-secondary" onClick={exportExcel}>
            <Download size={16} />
            Export CSV
          </button>
        )}
      </div>

      <div className="card mb-6 p-5">
        <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <div className="text-sm text-slate-500">Xin chào,</div>
            <div className="text-lg font-semibold text-slate-900">{me?.name}</div>
            <div className="mt-1 text-xs text-slate-400">
              Hôm nay: {todayEntry?.checkIn ? `Vào lúc ${todayEntry.checkIn}` : 'Chưa chấm công vào'}
              {todayEntry?.checkOut ? ` • Ra lúc ${todayEntry.checkOut}` : ''}
            </div>
          </div>
          <div className="flex gap-3">
            <button className="btn-primary" onClick={() => checkIn(currentEmployeeId)} disabled={!!todayEntry?.checkIn}>
              <LogIn size={16} />
              Chấm công vào
            </button>
            <button className="btn-secondary" onClick={() => checkOut(currentEmployeeId)} disabled={!todayEntry?.checkIn || !!todayEntry?.checkOut}>
              <LogOut size={16} />
              Chấm công ra
            </button>
          </div>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <select className="input w-52" value={employeeFilter} onChange={(e) => setEmployeeFilter(e.target.value)}>
          <option value="all">Tất cả nhân viên</option>
          {employees.map((e) => (
            <option key={e.id} value={e.id}>
              {e.name}
            </option>
          ))}
        </select>
        <span className="text-xs text-slate-400">
          {filtered.length} bản ghi
        </span>
      </div>

      <div className="card overflow-x-auto">
        {filtered.length === 0 ? (
          <EmptyState title="Chưa có dữ liệu chấm công" subtitle="Bấm 'Chấm công vào' để bắt đầu" />
        ) : (
          <table className="w-full min-w-[600px] text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-left text-xs font-medium uppercase tracking-wide text-slate-400">
                <th className="px-5 py-3">Nhân viên</th>
                <th className="px-5 py-3">Ngày</th>
                <th className="px-5 py-3">Giờ vào</th>
                <th className="px-5 py-3">Giờ ra</th>
                {isAdmin && <th className="px-5 py-3" />}
              </tr>
            </thead>
            <tbody>
              {filtered.map((a) => {
                const emp = employees.find((e) => e.id === a.employeeId)
                const isEditing = editingId === a.id
                return (
                  <tr key={a.id} className="border-b border-slate-50 last:border-0">
                    <td className="px-5 py-3 font-medium text-slate-700">{emp?.name || '—'}</td>
                    <td className="px-5 py-3 text-slate-500">{a.date}</td>
                    {isEditing ? (
                      <>
                        <td className="px-5 py-3">
                          <input type="time" className="input w-28" value={editCheckIn} onChange={(e) => setEditCheckIn(e.target.value)} />
                        </td>
                        <td className="px-5 py-3">
                          <input type="time" className="input w-28" value={editCheckOut} onChange={(e) => setEditCheckOut(e.target.value)} />
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="px-5 py-3 text-slate-500">{a.checkIn || '—'}</td>
                        <td className="px-5 py-3 text-slate-500">{a.checkOut || '—'}</td>
                      </>
                    )}
                    {isAdmin && (
                      <td className="px-5 py-3">
                        {isEditing ? (
                          <div className="flex gap-1">
                            <button className="btn-primary !py-1 !px-2 text-xs" onClick={saveEdit}>
                              <Save size={13} />
                            </button>
                            <button className="btn-secondary !py-1 !px-2 text-xs" onClick={() => setEditingId(null)}>
                              <X size={13} />
                            </button>
                          </div>
                        ) : (
                          <button className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-brand-600" onClick={() => startEdit(a)} title="Sửa giờ">
                            <Edit2 size={14} />
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
