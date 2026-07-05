// ====== TỔNG QUAN DASHBOARD - Daily Operations View ======

import { Link } from 'react-router-dom'
import { AlertTriangle, Car, CheckCircle, Clock, Image as ImageIcon, Tag, Users, Wrench, TrendingUp, ClipboardList, Activity, ArrowRight, CarFront, Gauge } from 'lucide-react'
import { useStore } from '../../store/useStore'
import { useAuthStore } from '../../store/useAuthStore'
import { formatDateTime, todayISO } from '../../utils/format'
import { Badge } from '../../components/ui'

export default function OverviewDashboard() {
  const vehicles = useStore((s) => s.vehicles)
  const tasks = useStore((s) => s.tasks)
  const positions = useStore((s) => s.positions)
  const employees = useStore((s) => s.employees)
  const attendance = useStore((s) => s.attendance)
  const checkSheets = useStore((s) => s.checkSheets)
  const moveLogs = useStore((s) => s.moveLogs)

  const today = todayISO()
  const currentEmployeeId = useStore((s) => s.currentEmployeeId)
  
  // ===== 1. VIỆC CẦN LÀM HÔM NAY =====
  const todayVehicles = vehicles.filter((v) => {
    // Xe chưa check đầu vào hôm nay
    const hasInSheet = checkSheets.some((c) => c.vehicleId === v.id && c.type === 'in' && c.checkDate === today)
    return !hasInSheet && v.status !== 'sold'
  })
  
  const vehiclesNeedingPolish = vehicles.filter((v) => v.status !== 'sold').slice(0, 3)
  
  // Task cần làm hôm nay
  const todayTasks = tasks.filter((t) => 
    t.status !== 'done' && (
      !t.dueDate || 
      t.dueDate === today || 
      new Date(t.dueDate) <= new Date()
    )
  )
  
  const overdueTasks = todayTasks.filter((t) => t.dueDate && new Date(t.dueDate) < new Date())
  
  // ===== 2. NHÂN VIÊN HÔM NAY =====
  const todayAttendance = attendance.filter((a) => a.date === today)
  const checkedInCount = todayAttendance.filter((a) => a.checkIn).length
  const notCheckedIn = employees.filter((e) => !e.disabled && !todayAttendance.some((a) => a.employeeId === e.id))
  const workingNow = todayAttendance.filter((a) => a.checkIn && !a.checkOut).length
  
  // ===== 3. XE ĐANG XỬ LÝ =====
  const processingVehicles = vehicles.filter((v) => v.status !== 'sold')
  
  // Phân loại theo trạng thái xử lý (giả lập dựa trên task)
  const vehiclesWithTasks = processingVehicles.map((v) => {
    const vehicleTasks = tasks.filter((t) => t.vehicleId === v.id && t.status !== 'done')
    return { ...v, activeTasks: vehicleTasks }
  })
  
  // ===== 4. TASK ƯU TIÊN =====
  const overdueTasksList = tasks
    .filter((t) => t.status !== 'done' && t.dueDate && new Date(t.dueDate) < new Date())
    .slice(0, 3)
  
  const todayTasksList = tasks
    .filter((t) => t.status !== 'done' && t.dueDate === today)
    .slice(0, 3)
  
  const unassignedTasks = tasks
    .filter((t) => t.status !== 'done' && !t.assigneeId)
    .slice(0, 3)
  
  // ===== 5. CẢNH BÁO =====
  const noPhotoCount = vehicles.filter((v) => v.images.length === 0 && v.status !== 'sold').length
  const noPriceCount = vehicles.filter((v) => !v.sellPrice && v.status !== 'sold').length
  const noCheckSheetCount = vehicles.filter((v) => {
    const hasSheet = checkSheets.some((c) => c.vehicleId === v.id)
    return !hasSheet && v.status !== 'sold'
  }).length
  
  // Xe chờ quá lâu (>7 ngày chưa bán)
  const waitingTooLong = vehicles.filter((v) => {
    if (v.status === 'sold') return false
    const daysSinceCreated = Math.floor((Date.now() - new Date(v.createdAt).getTime()) / (1000 * 60 * 60 * 24))
    return daysSinceCreated > 7
  }).length
  
  // ===== 6. HOẠT ĐỘNG GẦN ĐÂY =====
  const recentActivities = [...moveLogs]
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
    .slice(0, 8)

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Tổng quan</h1>
        <p className="mt-1 text-sm text-slate-500">
          {new Date().toLocaleDateString('vi-VN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        </p>
      </div>

      {/* 1. Việc cần làm hôm nay */}
      <div className="mb-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-base font-semibold text-slate-800">
            <AlertTriangle size={18} className="text-amber-500" />
            Việc cần làm hôm nay
          </h2>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="card p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">{todayVehicles.length}</div>
            <div className="mt-1 text-xs text-slate-500">Xe chưa kiểm tra đầu vào</div>
          </div>
          <div className="card p-4 text-center">
            <div className="text-2xl font-bold text-amber-600">{vehiclesNeedingPolish.length}</div>
            <div className="mt-1 text-xs text-slate-500">Xe cần đánh bóng</div>
          </div>
          <div className="card p-4 text-center">
            <div className="text-2xl font-bold text-slate-600">1</div>
            <div className="mt-1 text-xs text-slate-500">Xe đang rửa máy</div>
          </div>
          <div className="card p-4 text-center">
            <div className="text-2xl font-bold text-red-600">{overdueTasks.length}</div>
            <div className="mt-1 text-xs text-slate-500">Task quá hạn</div>
          </div>
        </div>
      </div>

      {/* 2. Nhân viên hôm nay */}
      <div className="mb-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-base font-semibold text-slate-800">
            <Users size={18} className="text-blue-500" />
            Nhân viên hôm nay
          </h2>
          <Link to="/cham-cong" className="text-sm text-brand-600 hover:text-brand-700">
            Chi tiết <ArrowRight size={14} className="inline" />
          </Link>
        </div>
        <div className="card p-4">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-green-600">{checkedInCount}</div>
              <div className="mt-1 text-xs text-slate-500">Đã check-in</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-amber-600">{workingNow}</div>
              <div className="mt-1 text-xs text-slate-500">Đang làm việc</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-slate-400">{notCheckedIn.length}</div>
              <div className="mt-1 text-xs text-slate-500">Chưa check-in</div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Xe đang xử lý */}
      <div className="mb-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-base font-semibold text-slate-800">
            <Car size={18} className="text-brand-500" />
            Xe đang xử lý
          </h2>
          <Link to="/xe" className="text-sm text-brand-600 hover:text-brand-700">
            Xem tất cả <ArrowRight size={14} className="inline" />
          </Link>
        </div>
        <div className="card p-4">
          {processingVehicles.length === 0 ? (
            <p className="text-sm text-slate-400">Không có xe nào đang xử lý</p>
          ) : (
            <div className="space-y-2">
              {processingVehicles.slice(0, 5).map((v) => {
                const vehicleTasks = tasks.filter((t) => t.vehicleId === v.id && t.status !== 'done')
                const mainTask = vehicleTasks[0]
                return (
                  <Link
                    key={v.id}
                    to={`/xe/${v.id}`}
                    className="flex items-center justify-between rounded-lg bg-slate-50 p-3 transition-colors hover:bg-slate-100"
                  >
                    <div className="flex items-center gap-3">
                      <CarFront size={20} className="text-slate-400" />
                      <div>
                        <div className="font-medium text-slate-800">{v.plate}</div>
                        <div className="text-xs text-slate-500">{v.model}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      {mainTask ? (
                        <Badge tone="blue">{mainTask.title}</Badge>
                      ) : (
                        <Badge tone="slate">Đang chờ</Badge>
                      )}
                    </div>
                  </Link>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* 4. Task ưu tiên */}
      <div className="mb-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-base font-semibold text-slate-800">
            <ClipboardList size={18} className="text-purple-500" />
            Task ưu tiên
          </h2>
          <Link to="/nhiem-vu" className="text-sm text-brand-600 hover:text-brand-700">
            Xem tất cả <ArrowRight size={14} className="inline" />
          </Link>
        </div>
        <div className="space-y-2">
          {/* Quá hạn */}
          {overdueTasksList.length > 0 && (
            <div className="card p-4 border-l-4 border-red-400">
              <div className="mb-2 text-xs font-semibold text-red-600 uppercase">Quá hạn</div>
              {overdueTasksList.map((task) => {
                const assignee = employees.find((e) => e.id === task.assigneeId)
                return (
                  <div key={task.id} className="flex items-center justify-between py-1">
                    <span className="text-sm text-slate-700">{task.title}</span>
                    <span className="text-xs text-slate-400">{assignee?.name || 'Chưa giao'}</span>
                  </div>
                )
              })}
            </div>
          )}
          
          {/* Hôm nay */}
          {todayTasksList.length > 0 && (
            <div className="card p-4 border-l-4 border-amber-400">
              <div className="mb-2 text-xs font-semibold text-amber-600 uppercase">Hôm nay</div>
              {todayTasksList.map((task) => {
                const assignee = employees.find((e) => e.id === task.assigneeId)
                return (
                  <div key={task.id} className="flex items-center justify-between py-1">
                    <span className="text-sm text-slate-700">{task.title}</span>
                    <span className="text-xs text-slate-400">{assignee?.name || 'Chưa giao'}</span>
                  </div>
                )
              })}
            </div>
          )}
          
          {/* Chưa nhận */}
          {unassignedTasks.length > 0 && (
            <div className="card p-4 border-l-4 border-slate-400">
              <div className="mb-2 text-xs font-semibold text-slate-600 uppercase">Chưa nhận</div>
              {unassignedTasks.map((task) => (
                <div key={task.id} className="py-1 text-sm text-slate-700">
                  {task.title}
                </div>
              ))}
            </div>
          )}
          
          {overdueTasksList.length === 0 && todayTasksList.length === 0 && unassignedTasks.length === 0 && (
            <div className="card p-6 text-center">
              <CheckCircle size={32} className="mx-auto mb-2 text-green-500" />
              <p className="text-sm text-slate-600">Tất cả task đã hoàn thành!</p>
            </div>
          )}
        </div>
      </div>

      {/* 5. Cảnh báo */}
      <div className="mb-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-base font-semibold text-slate-800">
            <AlertTriangle size={18} className="text-red-500" />
            Cảnh báo
          </h2>
        </div>
        <div className="card p-4">
          <ul className="space-y-2">
            {noCheckSheetCount > 0 && (
              <li className="flex items-center justify-between rounded-lg bg-red-50 px-3 py-2">
                <span className="text-sm text-red-700">Xe thiếu CheckSheet</span>
                <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-600">{noCheckSheetCount}</span>
              </li>
            )}
            {noPhotoCount > 0 && (
              <li className="flex items-center justify-between rounded-lg bg-amber-50 px-3 py-2">
                <span className="text-sm text-amber-700">Xe chưa có ảnh</span>
                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-600">{noPhotoCount}</span>
              </li>
            )}
            {noPriceCount > 0 && (
              <li className="flex items-center justify-between rounded-lg bg-amber-50 px-3 py-2">
                <span className="text-sm text-amber-700">Xe chưa định giá</span>
                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-600">{noPriceCount}</span>
              </li>
            )}
            {waitingTooLong > 0 && (
              <li className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
                <span className="text-sm text-slate-700">Xe chờ quá 7 ngày</span>
                <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs font-semibold text-slate-600">{waitingTooLong}</span>
              </li>
            )}
            {noCheckSheetCount === 0 && noPhotoCount === 0 && noPriceCount === 0 && waitingTooLong === 0 && (
              <li className="flex items-center justify-between rounded-lg bg-green-50 px-3 py-3">
                <span className="text-sm text-green-700">Tất cả hoạt động bình thường</span>
                <CheckCircle size={16} className="text-green-500" />
              </li>
            )}
          </ul>
        </div>
      </div>

      {/* 6. Hoạt động gần đây */}
      <div className="mb-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-base font-semibold text-slate-800">
            <Activity size={18} className="text-slate-500" />
            Hoạt động gần đây
          </h2>
        </div>
        <div className="card p-4">
          {recentActivities.length === 0 ? (
            <p className="text-sm text-slate-400">Chưa có hoạt động nào</p>
          ) : (
            <ul className="space-y-3">
              {recentActivities.map((log) => {
                const vehicle = vehicles.find((v) => v.id === log.vehicleId)
                const fromPos = positions.find((p) => p.id === log.fromPositionId)
                const toPos = positions.find((p) => p.id === log.toPositionId)
                const employee = employees.find((e) => e.id === log.employeeId)
                
                return (
                  <li key={log.id} className="flex items-start gap-3 text-sm">
                    <div className="mt-1 h-2 w-2 shrink-0 rounded-full bg-brand-500" />
                    <div className="flex-1">
                      <span className="font-medium text-slate-700">{vehicle?.plate || '—'}</span>
                      <span className="text-slate-500"> chuyển {fromPos?.name.split(' ')[0] || '—'} → {toPos?.name.split(' ')[0] || '—'}</span>
                      <div className="mt-0.5 text-xs text-slate-400">
                        {employee?.name || '—'} • {formatDateTime(log.createdAt)}
                      </div>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
