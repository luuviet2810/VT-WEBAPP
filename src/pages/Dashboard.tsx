import { useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AlertTriangle, BarChart2, Car, CheckCircle, Clock, Image as ImageIcon, Tag, TrendingUp, User, Users, Wrench } from 'lucide-react'
import { useStore } from '../store/useStore'
import { useAuthStore } from '../store/useAuthStore'
import { Badge } from '../components/ui'
import { formatDateTime } from '../utils/format'

export default function Dashboard() {
  const navigate = useNavigate()
  const vehicles = useStore((s) => s.vehicles)
  const tasks = useStore((s) => s.tasks)
  const moveLogs = useStore((s) => s.moveLogs)
  const positions = useStore((s) => s.positions)
  const employees = useStore((s) => s.employees)
  const attendance = useStore((s) => s.attendance)
  const currentUser = useAuthStore((s) => s.currentUser)
  const isAdminUser = currentUser?.role === 'admin'

  // ====== KPIs ======
  const sold = vehicles.filter((v) => v.status === 'sold')
  const pending = tasks.filter((t) => t.status !== 'done').length
  const overdue = tasks.filter((t) => t.status !== 'done' && t.dueDate && new Date(t.dueDate) < new Date()).length
  const doneToday = tasks.filter((t) => t.status === 'done').length
  const deposited = vehicles.filter((v) => v.status === 'deposited').length
  const today = new Date().toISOString().slice(0, 10)
  const onlineToday = employees.filter((emp) => attendance.some((a) => a.employeeId === emp.id && a.date === today)).length

  // ====== VEHICLES BY POSITION ======
  const activeVehicles = useMemo(() => vehicles.filter((v) => v.status !== 'sold'), [vehicles])
  const vehiclesByPosition = useMemo(() => {
    const map = new Map<string, typeof vehicles>()
    for (const pos of positions) {
      const vv = activeVehicles.filter((v) => v.positionId === pos.id)
      if (vv.length > 0) map.set(pos.id, vv)
    }
    return map
  }, [positions, activeVehicles])

  const employeesMap = useMemo(() => {
    const m = new Map<string, string>()
    for (const e of employees) m.set(e.id, e.name)
    return m
  }, [employees])

  // ====== TASKS ======
  const myTasks = useMemo(() => tasks.filter((t) => t.assigneeId === currentUser?.id), [tasks, currentUser])
  const unassignedTasks = useMemo(() => tasks.filter((t) => !t.assigneeId), [tasks])
  const vehiclesMap = useMemo(() => {
    const m = new Map<string, string>()
    for (const v of vehicles) m.set(v.id, v.plate)
    return m
  }, [vehicles])

  // ====== RECENT ACTIVITY ======
  const recentLogs = useMemo(() => [...moveLogs].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)).slice(0, 4), [moveLogs])

  // ====== ALERTS ======
  const noPhoto = vehicles.filter((v) => v.images.length === 0).length
  const noPrice = vehicles.filter((v) => !v.sellPrice).length

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">
          {isAdminUser ? 'Tổng quan' : `Xin chào, ${currentUser?.fullName || 'bạn'}`}
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          {isAdminUser ? 'Tổng quan hoạt động gara' : 'Xem nhanh công việc và thông tin của bạn'}
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-6">
        <StatCard label="Trong bãi" value={activeVehicles.length} icon={<Car size={16} />} />
        <StatCard label="Việc chưa xong" value={pending} icon={<Wrench size={16} />} />
        <StatCard label="Việc quá hạn" value={overdue} tone="text-red-600" icon={<AlertTriangle size={16} />} />
        <StatCard label="Hoàn thành hôm nay" value={doneToday} tone="text-emerald-600" icon={<CheckCircle size={16} />} />
        <StatCard label="Xe cọc" value={deposited} tone="text-amber-600" icon={<Tag size={16} />} />
        <StatCard label="Đang online" value={onlineToday} tone="text-brand-600" icon={<Users size={16} />} />
      </div>

      {/* Xe theo quy trình */}
      {vehiclesByPosition.size > 0 && (
        <div className="mt-6">
          <h2 className="mb-3 text-sm font-semibold text-slate-700">Xe theo quy trình</h2>
          <div className="flex gap-4 overflow-x-auto pb-3 snap-x snap-mandatory">
            {positions.filter((p) => vehiclesByPosition.has(p.id)).map((pos) => {
              const vv = vehiclesByPosition.get(pos.id)!
              return (
                <div key={pos.id} className="w-60 shrink-0 snap-start rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="mb-2 flex items-center gap-2">
                    <span className="text-sm font-semibold text-slate-700">{pos.name}</span>
                    <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs font-semibold text-slate-600">{vv.length}</span>
                  </div>
                  <div className="space-y-2">
                    {vv.map((v) => {
                      const assigneeName = v.assigneeId ? employeesMap.get(v.assigneeId) : null
                      return (
                        <div
                          key={v.id}
                          onClick={() => navigate(`/xe/${v.id}`)}
                          className="cursor-pointer rounded-xl border border-slate-100 bg-white px-3 py-2 shadow-sm transition hover:shadow-md hover:-translate-y-0.5"
                        >
                          <div className="text-sm font-bold text-slate-800">{v.plate}</div>
                          <div className="text-xs text-slate-500">{v.model}</div>
                          {assigneeName && (
                            <div className="mt-1 text-[10px] font-medium text-brand-600">{assigneeName}</div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Công việc */}
      <div className="mt-6 grid grid-cols-1 gap-5 lg:grid-cols-2">
        {/* Nhiệm vụ chung */}
        <div className="card p-4">
          <div className="mb-2 flex items-center gap-2">
            <Wrench size={15} className="text-slate-400" />
            <span className="text-sm font-semibold text-slate-700">Nhiệm vụ chung</span>
          </div>
          {unassignedTasks.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-400">Không có nhiệm vụ</p>
          ) : (
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {unassignedTasks.slice(0, 10).map((t) => (
                <div key={t.id} className="rounded-xl border border-slate-100 bg-white px-3 py-2 shadow-sm">
                  <div className="text-sm font-medium text-slate-800">{t.title}</div>
                  <div className="mt-0.5 flex items-center gap-2 text-xs text-slate-400">
                    <span>{vehiclesMap.get(t.vehicleId ?? '') || '—'}</span>
                    <Badge tone={t.ruleId ? 'blue' : 'slate'}>{t.ruleId ? '🤖 Auto' : '✍️ Manual'}</Badge>
                    <Badge tone={t.status === 'done' ? 'green' : t.status === 'doing' ? 'orange' : 'slate'}>
                      {t.status === 'todo' ? 'Chưa làm' : t.status === 'doing' ? 'Đang làm' : 'Hoàn thành'}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Giao cho tôi */}
        <div className="card p-4">
          <div className="mb-2 flex items-center gap-2">
            <User size={15} className="text-slate-400" />
            <span className="text-sm font-semibold text-slate-700">Giao cho tôi</span>
          </div>
          {myTasks.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-400">Không có nhiệm vụ</p>
          ) : (
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {myTasks.slice(0, 10).map((t) => (
                <div key={t.id} className="rounded-xl border border-slate-100 bg-white px-3 py-2 shadow-sm">
                  <div className="text-sm font-medium text-slate-800">{t.title}</div>
                  <div className="mt-0.5 flex items-center gap-2 text-xs text-slate-400">
                    <span>{vehiclesMap.get(t.vehicleId ?? '') || '—'}</span>
                    <Badge tone={t.ruleId ? 'blue' : 'slate'}>{t.ruleId ? '🤖 Auto' : '✍️ Manual'}</Badge>
                    <Badge tone={t.status === 'done' ? 'green' : t.status === 'doing' ? 'orange' : 'slate'}>
                      {t.status === 'todo' ? 'Chưa làm' : t.status === 'doing' ? 'Đang làm' : 'Hoàn thành'}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Admin-only sections */}
      {isAdminUser && (
        <>
          {/* Charts */}
          <div className="mt-6 grid grid-cols-1 gap-5 lg:grid-cols-2">
            <div className="card p-5">
              <div className="text-sm font-semibold text-slate-700">Trạng thái xe</div>
              <div className="mt-2 space-y-2">
                {[
                  { name: 'Chưa bán', value: vehicles.filter((v) => v.status === 'available').length, color: '#94a3b8' },
                  { name: 'Đã cọc', value: vehicles.filter((v) => v.status === 'deposited').length, color: '#f59e0b' },
                  { name: 'Đã bán', value: vehicles.filter((v) => v.status === 'sold').length, color: '#10b981' },
                ].map((d) => (
                  <div key={d.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ background: d.color }} />
                      {d.name}
                    </div>
                    <span className="font-semibold text-slate-700">{d.value}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="card p-5">
              <div className="mb-3 text-sm font-semibold text-slate-700">Hoạt động gần đây</div>
              {recentLogs.length === 0 ? (
                <p className="text-sm text-slate-400">Chưa có hoạt động nào</p>
              ) : (
                <ul className="space-y-3">
                  {recentLogs.map((log) => {
                    const v = vehicles.find((x) => x.id === log.vehicleId)
                    const from = positions.find((p) => p.id === log.fromPositionId)
                    const to = positions.find((p) => p.id === log.toPositionId)
                    const emp = employees.find((e) => e.id === log.employeeId)
                    return (
                      <li key={log.id} className="flex items-start justify-between text-sm">
                        <div>
                          <span className="font-medium text-slate-800">{v?.plate}</span>
                          <span className="text-slate-400"> chuyển {from?.name || '—'} → {to?.name || '—'}</span>
                        </div>
                        <span className="whitespace-nowrap text-xs text-slate-400">{emp?.name} • {formatDateTime(log.createdAt)}</span>
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>
          </div>

          {/* Alerts */}
          <div className="card mt-5 p-5">
            <div className="mb-3 text-sm font-semibold text-slate-700">Cảnh báo quản trị</div>
            <ul className="space-y-2.5">
              <AlertRow icon={<ImageIcon size={15} />} label="Xe chưa có ảnh" count={noPhoto} />
              <AlertRow icon={<Tag size={15} />} label="Xe chưa có giá bán" count={noPrice} />
              <AlertRow icon={<AlertTriangle size={15} />} label="Nhiệm vụ quá hạn" count={overdue} danger />
            </ul>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-4">
            <StatCard label="Xe bán tháng" value={sold.length} icon={<TrendingUp size={16} />} />
            <StatCard label="Doanh thu tháng (tr)" value={Number((sold.reduce((s, v) => s + (v.sellPrice || 0), 0) / 1_000_000).toFixed(1))} icon={<BarChart2 size={16} />} />
            <StatCard label="Lợi nhuận tháng (tr)" value={Number((sold.reduce((s, v) => s + ((v.sellPrice || 0) - (v.costPrice || 0)), 0) / 1_000_000).toFixed(1))} tone="text-emerald-600" icon={<TrendingUp size={16} />} />
            <StatCard label="Việc tuần này" value={tasks.filter((t) => t.status === 'done').length} icon={<Clock size={16} />} />
          </div>
        </>
      )}

      {/* Quick Links */}
      <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        <Link to="/nhiem-vu" className="card flex items-center gap-3 p-4 transition-colors hover:bg-brand-50">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 text-blue-600">
            <Wrench size={20} />
          </div>
          <div>
            <div className="font-medium text-slate-800">Nhiệm vụ</div>
            <div className="text-xs text-slate-500">{pending} việc đang chờ</div>
          </div>
        </Link>
        <Link to="/vi-tri" className="card flex items-center gap-3 p-4 transition-colors hover:bg-brand-50">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-100 text-green-600">
            <Car size={20} />
          </div>
          <div>
            <div className="font-medium text-slate-800">Vị trí xe</div>
            <div className="text-xs text-slate-500">{positions.length} vị trí</div>
          </div>
        </Link>
        <Link to="/bang-gia" className="card flex items-center gap-3 p-4 transition-colors hover:bg-brand-50">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-600">
            <Tag size={20} />
          </div>
          <div>
            <div className="font-medium text-slate-800">Bảng giá</div>
            <div className="text-xs text-slate-500">{vehicles.length} xe trong hệ thống</div>
          </div>
        </Link>
        <Link to="/cham-cong" className="card flex items-center gap-3 p-4 transition-colors hover:bg-brand-50">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-100 text-purple-600">
            <Clock size={20} />
          </div>
          <div>
            <div className="font-medium text-slate-800">Chấm công</div>
            <div className="text-xs text-slate-500">{onlineToday} online hôm nay</div>
          </div>
        </Link>
      </div>
    </div>
  )
}

function AlertRow({ icon, label, count, danger }: { icon: React.ReactNode; label: string; count: number; danger?: boolean }) {
  return (
    <li className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2.5">
      <div className="flex items-center gap-2 text-sm text-slate-600">
        {icon}{label}
      </div>
      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${danger || count > 0 ? 'bg-red-100 text-red-600' : 'bg-slate-200 text-slate-500'}`}>
        {count}
      </span>
    </li>
  )
}

function StatCard({ label, value, tone, icon }: { label: string; value: number; tone?: string; icon?: React.ReactNode }) {
  return (
    <div className="card p-4">
      <div className="flex items-center gap-1.5 text-xs text-slate-400">
        {icon && <span className="text-slate-400">{icon}</span>}
        {label}
      </div>
      <div className={`mt-1 text-2xl font-bold ${tone || 'text-slate-800'}`}>{value}</div>
    </div>
  )
}
