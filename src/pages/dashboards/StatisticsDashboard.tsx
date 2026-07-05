// ====== THỐNG KÊ DASHBOARD - Analytics View ======

import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { BarChart2, Car, CheckCircle, Clock, TrendingUp, Users, DollarSign, CheckSquare, ArrowRight } from 'lucide-react'
import { useStore } from '../../store/useStore'
import { formatCurrency, formatDateTime, todayISO } from '../../utils/format'

type TimeRange = 'month' | 'year'

export default function StatisticsDashboard() {
  const vehicles = useStore((s) => s.vehicles)
  const tasks = useStore((s) => s.tasks)
  const employees = useStore((s) => s.employees)
  const attendance = useStore((s) => s.attendance)
  const checkSheets = useStore((s) => s.checkSheets)
  const moveLogs = useStore((s) => s.moveLogs)

  const [timeRange, setTimeRange] = useState<TimeRange>('month')

  // Calculate date range
  const today = new Date()
  const getDateRange = () => {
    const end = today.toISOString().slice(0, 10)
    let start: string
    switch (timeRange) {
      case 'month':
        const monthAgo = new Date(today)
        monthAgo.setDate(monthAgo.getDate() - 30)
        start = monthAgo.toISOString().slice(0, 10)
        break
      case 'year':
        const yearAgo = new Date(today)
        yearAgo.setFullYear(yearAgo.getFullYear() - 1)
        start = yearAgo.toISOString().slice(0, 10)
        break
    }
    return { start, end }
  }
  const dateRange = getDateRange()

  // Filter data by date range
  const filteredVehicles = vehicles.filter((v) => {
    if (v.status !== 'sold') return false
    return v.updatedAt?.slice(0, 10) >= dateRange.start && v.updatedAt?.slice(0, 10) <= dateRange.end
  })

  const filteredTasks = tasks.filter((t) => {
    return t.createdAt?.slice(0, 10) >= dateRange.start && t.createdAt?.slice(0, 10) <= dateRange.end
  })

  const filteredCheckSheets = checkSheets.filter((c) => {
    return c.checkDate >= dateRange.start && c.checkDate <= dateRange.end
  })

  // Stats calculations
  const totalVehicles = vehicles.length
  const soldVehicles = filteredVehicles.length
  const revenue = filteredVehicles.reduce((sum, v) => sum + (v.sellPrice || 0), 0) / 1_000_000
  const profit = filteredVehicles.reduce((sum, v) => sum + ((v.sellPrice || 0) - (v.costPrice || 0)), 0) / 1_000_000

  const tasksCompleted = filteredTasks.filter((t) => t.status === 'done').length
  const tasksCreated = filteredTasks.length
  const checkSheetCount = filteredCheckSheets.length

  // Employee performance
  const employeePerformance = employees
    .filter((e) => !e.disabled)
    .map((e) => {
      const empTasks = tasks.filter((t) => t.assigneeId === e.id && t.status === 'done')
      const empCheckIns = attendance.filter((a) => a.employeeId === e.id && a.date >= dateRange.start && a.date <= dateRange.end)
      return {
        name: e.name,
        tasks: empTasks.length,
        checkIns: empCheckIns.length,
      }
    })
    .sort((a, b) => b.tasks - a.tasks)

  // Vehicle status pie chart
  const statusData = [
    { name: 'Chưa bán', value: vehicles.filter((v) => v.status === 'available').length, color: '#94a3b8' },
    { name: 'Đã cọc', value: vehicles.filter((v) => v.status === 'deposited').length, color: '#f59e0b' },
    { name: 'Đã bán', value: vehicles.filter((v) => v.status === 'sold').length, color: '#10b981' },
  ]

  // Revenue bar chart (mock data for demo)
  const revenueData = [
    { month: 'T1', revenue: 0 },
    { month: 'T2', revenue: 0 },
    { month: 'T3', revenue: 0 },
    { month: 'T4', revenue: 0 },
    { month: 'T5', revenue: 0 },
    { month: 'T6', revenue: revenue > 0 ? revenue : 0 },
    { month: 'T7', revenue: 0 },
    { month: 'T8', revenue: 0 },
    { month: 'T9', revenue: 0 },
    { month: 'T10', revenue: 0 },
    { month: 'T11', revenue: 0 },
    { month: 'T12', revenue: 0 },
  ]

  // Task completion line chart (mock data)
  const taskData = [
    { week: 'W1', completed: 0 },
    { week: 'W2', completed: 0 },
    { week: 'W3', completed: 0 },
    { week: 'W4', completed: tasksCompleted > 0 ? tasksCompleted : 0 },
  ]

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Thống kê</h1>
        <p className="mt-1 text-sm text-slate-500">Phân tích dữ liệu theo thời gian</p>
      </div>

      {/* Time Range Selector */}
      <div className="mb-6 flex gap-2">
        {(['month', 'year'] as TimeRange[]).map((range) => (
          <button
            key={range}
            onClick={() => setTimeRange(range)}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              timeRange === range
                ? 'bg-brand-600 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {range === 'month' ? 'Theo tháng' : 'Theo năm'}
          </button>
        ))}
      </div>

      {/* KPI Cards */}
      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="card p-5">
          <div className="mb-2 flex items-center gap-2 text-sm text-slate-500">
            <Car size={16} />
            Tổng xe
          </div>
          <div className="text-3xl font-bold text-slate-800">{totalVehicles}</div>
        </div>
        <div className="card p-5">
          <div className="mb-2 flex items-center gap-2 text-sm text-slate-500">
            <TrendingUp size={16} />
            Xe bán
          </div>
          <div className="text-3xl font-bold text-green-600">{soldVehicles}</div>
        </div>
        <div className="card p-5">
          <div className="mb-2 flex items-center gap-2 text-sm text-slate-500">
            <DollarSign size={16} />
            Doanh thu (tr)
          </div>
          <div className="text-3xl font-bold text-brand-600">{Number(revenue.toFixed(1))}</div>
        </div>
        <div className="card p-5">
          <div className="mb-2 flex items-center gap-2 text-sm text-slate-500">
            <BarChart2 size={16} />
            Lợi nhuận (tr)
          </div>
          <div className={`text-3xl font-bold ${profit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
            {Number(profit.toFixed(1))}
          </div>
        </div>
      </div>

      {/* More Stats */}
      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-3">
        <div className="card p-4 text-center">
          <div className="text-2xl font-bold text-purple-600">{checkSheetCount}</div>
          <div className="mt-1 text-xs text-slate-500">CheckSheet</div>
        </div>
        <div className="card p-4 text-center">
          <div className="text-2xl font-bold text-amber-600">{tasksCompleted}</div>
          <div className="mt-1 text-xs text-slate-500">Task hoàn thành</div>
        </div>
        <div className="card p-4 text-center">
          <div className="text-2xl font-bold text-blue-600">{tasksCreated}</div>
          <div className="mt-1 text-xs text-slate-500">Task tạo mới</div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Revenue Chart */}
        <div className="card p-5">
          <div className="mb-4 text-sm font-semibold text-slate-700">Doanh thu theo tháng</div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={revenueData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eef2f7" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <Tooltip />
                <Bar dataKey="revenue" fill="#2584e6" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Vehicle Status Pie */}
        <div className="card p-5">
          <div className="mb-4 text-sm font-semibold text-slate-700">Tình trạng xe</div>
          <div className="flex items-center gap-6">
            <div className="h-52 w-52 shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusData}
                    dataKey="value"
                    innerRadius={45}
                    outerRadius={70}
                    paddingAngle={3}
                  >
                    {statusData.map((d, i) => (
                      <Cell key={i} fill={d.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
            <ul className="space-y-3">
              {statusData.map((d) => (
                <li key={d.name} className="flex items-center gap-2 text-sm">
                  <span className="h-3 w-3 rounded-full" style={{ background: d.color }} />
                  <span className="text-slate-600">{d.name}</span>
                  <span className="ml-auto font-semibold text-slate-800">{d.value}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Task Completion Chart */}
      <div className="mb-6 card p-5">
        <div className="mb-4 text-sm font-semibold text-slate-700">Tiến độ task theo tuần</div>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={taskData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eef2f7" />
              <XAxis dataKey="week" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <Tooltip />
              <Line type="monotone" dataKey="completed" stroke="#8b5cf6" strokeWidth={2.5} dot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Employee Performance */}
      <div className="mb-6 card p-5">
        <div className="mb-4 flex items-center justify-between">
          <div className="text-sm font-semibold text-slate-700">Hiệu suất nhân viên</div>
          <Link to="/nhan-vien" className="text-sm text-brand-600 hover:text-brand-700">
            Xem chi tiết <ArrowRight size={14} className="inline" />
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="py-2 text-left font-medium text-slate-500">Nhân viên</th>
                <th className="py-2 text-right font-medium text-slate-500">Task hoàn thành</th>
                <th className="py-2 text-right font-medium text-slate-500">Check-in</th>
              </tr>
            </thead>
            <tbody>
              {employeePerformance.slice(0, 5).map((emp, i) => (
                <tr key={i} className="border-b border-slate-50 last:border-0">
                  <td className="py-3 font-medium text-slate-700">{emp.name}</td>
                  <td className="py-3 text-right text-slate-600">{emp.tasks}</td>
                  <td className="py-3 text-right text-slate-600">{emp.checkIns}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
