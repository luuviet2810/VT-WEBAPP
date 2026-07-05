import { Link } from 'react-router-dom'
import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { AlertTriangle, BarChart2, Car, CheckCircle, Clock, Image as ImageIcon, Tag, TrendingUp, Users, Wrench, CheckCircle2, XCircle } from 'lucide-react'
import { useStore } from '../store/useStore'
import { useAuthStore } from '../store/useAuthStore'
import { formatDateTime } from '../utils/format'

const MONTH_LABELS = ['08/25', '09/25', '10/25', '11/25', '12/25', '01/26', '02/26', '03/26', '04/26', '05/26', '06/26', '07/26']

export default function Dashboard() {
  const vehicles = useStore((s) => s.vehicles)
  const tasks = useStore((s) => s.tasks)
  const moveLogs = useStore((s) => s.moveLogs)
  const positions = useStore((s) => s.positions)
  const employees = useStore((s) => s.employees)
  const attendance = useStore((s) => s.attendance)
  const { currentUser, isAdmin } = useAuthStore()
  const isAdminUser = isAdmin()

  const sold = vehicles.filter((v) => v.status === 'sold')
  const revenue = sold.reduce((sum, v) => sum + (v.sellPrice || 0), 0) / 1_000_000
  const profit = sold.reduce((sum, v) => sum + ((v.sellPrice || 0) - (v.costPrice || 0)), 0) / 1_000_000

  const revenueData = MONTH_LABELS.map((m, i) => ({ month: m, value: i === 10 ? Number(revenue.toFixed(2)) : 0 }))
  const profitData = MONTH_LABELS.map((m, i) => ({ month: m, value: i === 10 ? Number(profit.toFixed(2)) : 0 }))

  const statusData = [
    { name: 'Chưa bán', value: vehicles.filter((v) => v.status === 'available').length, color: '#94a3b8' },
    { name: 'Đã cọc', value: vehicles.filter((v) => v.status === 'deposited').length, color: '#f59e0b' },
    { name: 'Đã bán', value: vehicles.filter((v) => v.status === 'sold').length, color: '#10b981' },
  ]

  const noPhoto = vehicles.filter((v) => v.images.length === 0).length
  const noPrice = vehicles.filter((v) => !v.sellPrice).length
  const overdue = tasks.filter((t) => t.status !== 'done' && t.dueDate && new Date(t.dueDate) < new Date()).length
  const pending = tasks.filter((t) => t.status !== 'done').length
  const doneToday = tasks.filter((t) => t.status === 'done').length

  const today = new Date().toISOString().slice(0, 10)
  const thisMonth = new Date().toISOString().slice(0, 7)
  const thisWeekStart = new Date()
  thisWeekStart.setDate(thisWeekStart.getDate() - thisWeekStart.getDay())

  const soldThisMonth = vehicles.filter((v) => {
    if (v.status !== 'sold') return false
    const updated = v.updatedAt?.slice(0, 7)
    return updated === thisMonth
  })
  const revenueMonth = soldThisMonth.reduce((s, v) => s + (v.sellPrice || 0), 0) / 1_000_000
  const profitMonth = soldThisMonth.reduce((s, v) => s + ((v.sellPrice || 0) - (v.costPrice || 0)), 0) / 1_000_000

  const deposited = vehicles.filter((v) => v.status === 'deposited').length

  const onlineToday = employees.filter((emp) => {
    return attendance.some((a) => a.employeeId === emp.id && a.date === today)
  }).length

  const doneThisWeek = tasks.filter((t) => {
    if (t.status !== 'done') return false
    return t.createdAt?.slice(0, 10) >= thisWeekStart.toISOString().slice(0, 10)
  }).length

  const recentLogs = [...moveLogs].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)).slice(0, 4)

  // Get users from authStore
  const { users, approveUser, rejectUser, getPendingUsers } = useAuthStore()
  const pendingUsers = getPendingUsers()

  // Get initials for avatar
  const getInitials = (name: string) => {
    const parts = name.trim().split(' ')
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    }
    return name.slice(0, 2).toUpperCase()
  }

  // Format date
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">
          {isAdminUser ? 'Thống kê' : `Xin chào, ${currentUser?.fullName || 'bạn'}`}
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          {isAdminUser ? 'Tổng quan hoạt động gara' : 'Xem nhanh công việc và thông tin của bạn'}
        </p>
      </div>

      {/* KPI Cards - For everyone */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-6">
        <StatCard label="Trong bãi" value={vehicles.filter((v) => v.status !== 'sold').length} icon={<Car size={16} />} />
        <StatCard label="Việc chưa xong" value={pending} icon={<Wrench size={16} />} />
        <StatCard label="Việc quá hạn" value={overdue} tone="text-red-600" icon={<AlertTriangle size={16} />} />
        <StatCard label="Hoàn thành hôm nay" value={doneToday} tone="text-emerald-600" icon={<CheckCircle size={16} />} />
        <StatCard label="Xe cọc" value={deposited} tone="text-amber-600" icon={<Tag size={16} />} />
        <StatCard label="Đang online" value={onlineToday} tone="text-brand-600" icon={<Users size={16} />} />
      </div>

      {/* Pending User Registrations - Admin only */}
      {isAdminUser && pendingUsers.length > 0 && (
        <div className="mt-5 rounded-2xl border-2 border-amber-200 bg-amber-50 p-5">
          <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-amber-700">
            <Clock size={18} />
            Tài khoản chờ duyệt ({pendingUsers.length})
          </div>
          <div className="space-y-3">
            {pendingUsers.map((user) => (
              <div
                key={user.id}
                className="flex flex-wrap items-center gap-3 rounded-xl bg-white p-4 shadow-sm"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100 text-sm font-semibold text-amber-700">
                  {getInitials(user.fullName)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-medium text-slate-800">{user.fullName}</div>
                  <div className="text-xs text-slate-500">{user.email}</div>
                  <div className="mt-1 text-xs text-slate-400">
                    Đăng ký: {formatDate(user.createdAt)}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => approveUser(user.id)}
                    className="flex items-center gap-1 rounded-lg bg-green-100 px-3 py-1.5 text-sm font-medium text-green-700 transition-colors hover:bg-green-200"
                  >
                    <CheckCircle2 size={16} />
                    Duyệt
                  </button>
                  <button
                    onClick={() => rejectUser(user.id)}
                    className="flex items-center gap-1 rounded-lg bg-red-100 px-3 py-1.5 text-sm font-medium text-red-700 transition-colors hover:bg-red-200"
                  >
                    <XCircle size={16} />
                    Từ chối
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Admin-only sections */}
      {isAdminUser && (
        <>
          <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-2">
            <div className="card p-5">
              <div className="text-sm font-semibold text-slate-700">Doanh thu 12 tháng</div>
              <div className="text-xs text-slate-400">Đơn vị: triệu đồng</div>
              <div className="mt-3 h-52">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={revenueData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eef2f7" />
                    <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                    <Tooltip />
                    <Bar dataKey="value" fill="#2584e6" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="card p-5">
              <div className="text-sm font-semibold text-slate-700">Trạng thái xe</div>
              <div className="mt-3 flex items-center gap-6">
                <div className="h-44 w-44 shrink-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={statusData} dataKey="value" innerRadius={45} outerRadius={70} paddingAngle={3}>
                        {statusData.map((d, i) => (
                          <Cell key={i} fill={d.color} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <ul className="space-y-2 text-sm">
                  {statusData.map((d) => (
                    <li key={d.name} className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ background: d.color }} />
                      <span className="text-slate-500">{d.name}</span>
                      <span className="ml-auto font-semibold text-slate-700">{d.value}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          <div className="card mt-5 p-5">
            <div className="text-sm font-semibold text-slate-700">Lợi nhuận 12 tháng</div>
            <div className="text-xs text-slate-400">Đơn vị: triệu đồng — sell - buy</div>
            <div className="mt-3 h-48">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={profitData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eef2f7" />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <Tooltip />
                  <Line type="monotone" dataKey="value" stroke="#8b5cf6" strokeWidth={2.5} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-2">
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
                          <span className="text-slate-400"> chuyển {from?.name.split(' ')[0] || '—'} → {to?.name.split(' ')[0]}</span>
                        </div>
                        <span className="whitespace-nowrap text-xs text-slate-400">{emp?.name} • {formatDateTime(log.createdAt)}</span>
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>

            <div className="card p-5">
              <div className="mb-3 text-sm font-semibold text-slate-700">Cảnh báo quản trị</div>
              <ul className="space-y-2.5">
                <AlertRow icon={<ImageIcon size={15} />} label="Xe chưa có ảnh" count={noPhoto} />
                <AlertRow icon={<Tag size={15} />} label="Xe chưa có giá bán" count={noPrice} />
                <AlertRow icon={<AlertTriangle size={15} />} label="Nhiệm vụ quá hạn" count={overdue} danger />
              </ul>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-4">
            <StatCard label="Xe bán tháng" value={soldThisMonth.length} icon={<TrendingUp size={16} />} />
            <StatCard label="Doanh thu tháng (tr)" value={Number(revenueMonth.toFixed(1))} icon={<BarChart2 size={16} />} />
            <StatCard label="Lợi nhuận tháng (tr)" value={Number(profitMonth.toFixed(1))} tone={profitMonth < 0 ? 'text-red-600' : 'text-emerald-600'} icon={<TrendingUp size={16} />} />
            <StatCard label="Việc tuần này" value={doneThisWeek} icon={<Clock size={16} />} />
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
        <Link to="/vi-tri-xe" className="card flex items-center gap-3 p-4 transition-colors hover:bg-brand-50">
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
        {icon}
        {label}
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
