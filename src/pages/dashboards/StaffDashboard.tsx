// ====== STAFF DASHBOARD - Personal work view ======

import { Link } from 'react-router-dom'
import { Car, CheckCircle, CheckCircle2, Clock, ClipboardList, Bell, AlertTriangle } from 'lucide-react'
import { useStore } from '../../store/useStore'
import { useAuthStore } from '../../store/useAuthStore'
import { formatDateTime, todayISO } from '../../utils/format'
import { Badge } from '../../components/ui'

export default function StaffDashboard() {
  const vehicles = useStore((s) => s.vehicles)
  const tasks = useStore((s) => s.tasks)
  const positions = useStore((s) => s.positions)
  const attendance = useStore((s) => s.attendance)
  const notifications = useStore((s) => s.notifications)

  const currentUser = useAuthStore((s) => s.currentUser)
  const currentEmployeeId = useStore((s) => s.currentEmployeeId)

  const today = todayISO()
  
  // Get user's assigned vehicles
  const myVehicles = vehicles.filter((v) => v.assigneeId === currentEmployeeId && v.status !== 'sold')
  
  // Get user's tasks
  const myTasks = tasks.filter((t) => t.assigneeId === currentEmployeeId)
  const myPendingTasks = myTasks.filter((t) => t.status !== 'done')
  const myTodayTasks = myPendingTasks.filter((t) => 
    !t.dueDate || t.dueDate === today || new Date(t.dueDate) <= new Date()
  )
  
  // Get today's attendance
  const todayAttendance = attendance.find((a) => a.employeeId === currentEmployeeId && a.date === today)
  const isCheckedIn = !!todayAttendance?.checkIn
  const isCheckedOut = !!todayAttendance?.checkOut
  
  // Recent notifications for user
  const recentNotifications = [...notifications]
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
    .slice(0, 5)

  // Get vehicle position
  const getVehiclePosition = (vehicleId: string) => {
    const vehicle = vehicles.find((v) => v.id === vehicleId)
    if (!vehicle?.positionId) return null
    return positions.find((p) => p.id === vehicle.positionId)
  }

  // Calculate overdue tasks
  const overdueTasks = myPendingTasks.filter((t) => t.dueDate && new Date(t.dueDate) < new Date())

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">
          Xin chào, {currentUser?.fullName || 'bạn'}
        </h1>
        <p className="mt-1 text-sm text-slate-500">Công việc của bạn hôm nay</p>
      </div>

      {/* Check-in Card */}
      <div className="card p-5 mb-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`flex h-12 w-12 items-center justify-center rounded-full ${
              isCheckedIn && !isCheckedOut 
                ? 'bg-green-100 text-green-600' 
                : 'bg-slate-100 text-slate-400'
            }`}>
              {isCheckedIn && !isCheckedOut ? (
                <CheckCircle2 size={24} />
              ) : (
                <Clock size={24} />
              )}
            </div>
            <div>
              <div className="font-semibold text-slate-800">
                {isCheckedIn ? (
                  isCheckedOut ? 'Đã hoàn thành công việc' : 'Đang làm việc'
                ) : (
                  'Chưa check-in'
                )}
              </div>
              <div className="mt-0.5 text-sm text-slate-500">
                {todayAttendance?.checkIn 
                  ? `Check-in: ${new Date(todayAttendance.checkIn).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}`
                  : 'Hôm nay, ' + new Date().toLocaleDateString('vi-VN', { weekday: 'long', day: 'numeric', month: 'numeric' })
                }
              </div>
            </div>
          </div>
          {!isCheckedIn && (
            <Link to="/cham-cong" className="btn-primary">
              Check-in
            </Link>
          )}
          {isCheckedIn && !isCheckedOut && (
            <Link to="/cham-cong" className="btn-secondary">
              Check-out
            </Link>
          )}
        </div>
      </div>

      {/* Việc của tôi hôm nay */}
      <div className="card p-5 mb-5">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
            <ClipboardList size={18} />
            Việc của tôi hôm nay ({myTodayTasks.length})
          </div>
          <Link to="/viec-cua-toi" className="text-sm text-brand-600 hover:text-brand-700">
            Xem tất cả
          </Link>
        </div>
        
        {overdueTasks.length > 0 && (
          <div className="mb-3 flex items-center gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-700">
            <AlertTriangle size={16} />
            Bạn có {overdueTasks.length} task quá hạn
          </div>
        )}
        
        {myTodayTasks.length === 0 ? (
          <div className="rounded-lg bg-slate-50 p-6 text-center">
            <CheckCircle size={32} className="mx-auto mb-2 text-green-500" />
            <p className="text-sm text-slate-600">Tuyệt vời! Bạn không có việc nào cần làm hôm nay.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {myTodayTasks.slice(0, 5).map((task) => (
              <div key={task.id} className="flex items-start gap-3 rounded-lg bg-slate-50 p-3">
                <div className={`mt-0.5 shrink-0 ${
                  task.dueDate && new Date(task.dueDate) < new Date() ? 'text-red-500' : 'text-slate-300'
                }`}>
                  <CheckCircle size={20} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-medium text-slate-800">
                    {task.title}
                  </div>
                  {task.dueTime && (
                    <div className="mt-0.5 flex items-center gap-1 text-xs text-slate-500">
                      <Clock size={12} />
                      {task.dueTime}
                    </div>
                  )}
                </div>
                <Badge tone={
                  task.priority === 'urgent' ? 'red' :
                  task.priority === 'priority' ? 'orange' :
                  'slate'
                }>
                  {task.priority === 'urgent' ? 'Làm gấp' :
                   task.priority === 'priority' ? 'Ưu tiên' :
                   'Cứ từ từ'}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Xe tôi phụ trách */}
      <div className="card p-5 mb-5">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
            <Car size={18} />
            Xe tôi phụ trách ({myVehicles.length})
          </div>
          <Link to="/xe" className="text-sm text-brand-600 hover:text-brand-700">
            Xem tất cả
          </Link>
        </div>
        
        {myVehicles.length === 0 ? (
          <p className="text-sm text-slate-400">Bạn chưa được phân công xe nào</p>
        ) : (
          <div className="space-y-3">
            {myVehicles.slice(0, 4).map((vehicle) => {
              const position = getVehiclePosition(vehicle.id)
              return (
                <Link 
                  key={vehicle.id} 
                  to={`/xe/${vehicle.id}`}
                  className="flex items-center justify-between rounded-lg bg-slate-50 p-3 transition-colors hover:bg-slate-100"
                >
                  <div>
                    <div className="font-medium text-slate-800">{vehicle.plate}</div>
                    <div className="mt-0.5 text-xs text-slate-500">{vehicle.model}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    {position && (
                      <Badge tone="blue">{position.name}</Badge>
                    )}
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>

      {/* Thông báo */}
      <div className="card p-5">
        <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-700">
          <Bell size={18} />
          Thông báo ({recentNotifications.length})
        </div>
        
        {recentNotifications.length === 0 ? (
          <p className="text-sm text-slate-400">Không có thông báo nào</p>
        ) : (
          <div className="space-y-3">
            {recentNotifications.map((notif) => (
              <div 
                key={notif.id} 
                className={`rounded-lg p-3 ${notif.read ? 'bg-slate-50' : 'bg-brand-50'}`}
              >
                <div className="font-medium text-slate-800">{notif.title}</div>
                <div className="mt-0.5 text-sm text-slate-600">{notif.body}</div>
                <div className="mt-1 text-xs text-slate-400">
                  {formatDateTime(notif.createdAt)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
