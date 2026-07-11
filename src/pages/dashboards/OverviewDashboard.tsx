// ====== OVERVIEW DASHBOARD v2 ======

import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Car, Users, AlertTriangle, Activity, MapPin, Bell, ClipboardList,
  CheckCircle, Clock, TrendingUp, ArrowRight,
} from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { Badge } from '../../components/ui'
import { useDashboardViewModel } from './dashboard/DashboardViewModel'
import type {
  KpiData, AttendanceData, LiveFeedItem, LocationItem,
  WarningItem, WorkflowColumn, TaskItem, QuickStats,
} from './dashboard/DashboardViewModel'

// ====== HEADER ======

function DashboardHeader() {
  return (
    <div className="mb-6 flex items-center justify-between">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Tổng quan</h1>
        <p className="mt-1 text-sm text-slate-500">
          {new Date().toLocaleDateString('vi-VN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        </p>
      </div>
    </div>
  )
}

// ====== KPI CARDS ======

const KPI_CARDS = [
  { key: 'noInputCheck', label: 'Xe chưa kiểm tra đầu vào', icon: ClipboardList, color: '#3b82f6' },
  { key: 'needPolish', label: 'Xe cần đánh bóng', icon: Car, color: '#f59e0b' },
  { key: 'washing', label: 'Xe đang rửa máy', icon: Car, color: '#10b981' },
  { key: 'needTasks', label: 'Nhiệm vụ cần xử lý', icon: AlertTriangle, color: '#ef4444' },
]

function TodayKPICards({ kpi }: { kpi: KpiData }) {
  return (
    <div className="flex flex-1 gap-3">
      {KPI_CARDS.map((card) => {
        const value = kpi[card.key as keyof typeof kpi] as number
        return (
          <div key={card.key} className="card flex flex-1 flex-col justify-center p-4">
            <div className="flex items-center justify-between">
              <card.icon size={20} style={{ color: card.color }} />
            </div>
            <div className="mt-2 text-2xl font-bold" style={{ color: card.color }}>{value}</div>
            <div className="mt-0.5 text-xs text-slate-500">{card.label}</div>
          </div>
        )
      })}
    </div>
  )
}

// ====== ATTENDANCE CARD ======

function AttendanceCard({ data }: { data: AttendanceData }) {
  return (
    <div className="card flex flex-1 flex-col p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-800">
          <Users size={16} className="text-blue-500" />
          Nhân viên hôm nay
        </h3>
        <Link to="/cham-cong" className="text-xs text-brand-600 hover:text-brand-700">Chi tiết <ArrowRight size={12} className="inline" /></Link>
      </div>
      <div className="flex flex-1 items-center gap-4">
        <CircularProgress pct={data.percentage} size={72} stroke={5} />
        <div className="flex-1 space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-600">Đã check-in</span>
            <span className="font-semibold text-green-600">{data.checkedIn}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-600">Đang làm việc</span>
            <span className="font-semibold text-amber-600">{data.working}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-600">Chưa check-in</span>
            <span className="font-semibold text-slate-400">{data.notCheckedIn}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

// ====== LIVE FEED CARD ======

function LiveFeedCard({ items }: { items: LiveFeedItem[] }) {
  return (
    <div className="card flex flex-1 flex-col p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-800">
          <Activity size={16} className="text-slate-500" />
          Hoạt động gần đây
        </h3>
        <Link to="/xe" className="text-xs text-brand-600 hover:text-brand-700">Xem tất cả <ArrowRight size={12} className="inline" /></Link>
      </div>
      <div className="max-h-[320px] flex-1 space-y-0 overflow-y-auto">
        {items.length === 0 ? (
          <p className="py-6 text-center text-sm text-slate-400">Chưa có hoạt động</p>
        ) : (
          items.map((item, i) => (
            <div key={item.id} className="flex gap-3 border-b border-slate-50 py-2.5 last:border-0">
              <div className="flex flex-col items-center">
                <div className="h-2 w-2 rounded-full bg-brand-500" />
                {i < items.length - 1 && <div className="mt-1 h-full w-px bg-slate-200" style={{ minHeight: 8 }} />}
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-800">{item.employee}</span>
                  <span className="text-xs text-slate-400">{item.time}</span>
                </div>
                <p className="text-xs text-slate-500">{item.action}</p>
                <p className="text-xs font-medium text-slate-600">{item.vehicle}</p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

// ====== LOCATION SUMMARY CARD ======

function LocationSummaryCard({ locations }: { locations: LocationItem[] }) {
  return (
    <div className="card flex flex-1 flex-col p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-800">
          <MapPin size={16} className="text-slate-500" />
          Số xe theo khu vực
        </h3>
      </div>
      <div className="space-y-2">
        {locations.map((loc) => (
          <button
            key={loc.name}
            onClick={() => console.log('Navigate to location:', loc.name)}
            className="flex w-full items-center justify-between rounded-lg px-3 py-2 transition-colors hover:bg-slate-50"
          >
            <div className="flex items-center gap-2.5">
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: loc.color }} />
              <span className="text-sm text-slate-700">{loc.name}</span>
            </div>
            <span className="text-sm font-semibold text-slate-800">{loc.count}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

// ====== WARNING CARD ======

function WarningCard({ warnings }: { warnings: WarningItem[] }) {
  return (
    <div className="card flex flex-1 flex-col p-4">
      <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-800">
        <Bell size={16} className="text-red-500" />
        Cảnh báo
      </div>
      <div className="space-y-2">
        {warnings.map((w) => (
          <div
            key={w.key}
            className={`flex items-center justify-between rounded-lg px-3 py-2 ${
              w.severity === 'red' ? 'bg-red-50' : 'bg-amber-50'
            }`}
          >
            <span className={`text-sm ${w.severity === 'red' ? 'text-red-700' : 'text-amber-700'}`}>
              {w.label}
            </span>
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                w.severity === 'red'
                  ? 'bg-red-100 text-red-600'
                  : 'bg-amber-100 text-amber-600'
              }`}
            >
              {w.count}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ====== WORKFLOW BOARD ======

function WorkflowBoard({ columns }: { columns: WorkflowColumn[] }) {
  return (
    <div className="card p-4">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-800">
          <Car size={16} className="text-brand-500" />
          Xe theo quy trình
        </h3>
        <Link to="/xe" className="text-xs text-brand-600 hover:text-brand-700">Xem tất cả <ArrowRight size={12} className="inline" /></Link>
      </div>
      <div className="flex gap-4 overflow-x-auto pb-2">
        {columns.map((col) => (
          <div key={col.title} className="min-w-[200px] shrink-0">
            <div className="mb-2 flex items-center justify-between rounded-lg bg-slate-100 px-3 py-2">
              <span className="text-xs font-semibold text-slate-700">{col.title}</span>
              <span className="rounded-full bg-slate-300 px-2 py-0.5 text-xs font-bold text-slate-700">
                {col.vehicles.length + (col.extra > 0 ? col.extra : 0)}
              </span>
            </div>
            <div className="space-y-1.5">
              {col.vehicles.length === 0 ? (
                <p className="py-4 text-center text-xs text-slate-400">Trống</p>
              ) : (
                col.vehicles.map((v) => (
                  <Link
                    key={v.id}
                    to={`/xe/${v.id}`}
                    className="block rounded-lg border border-slate-100 bg-white p-2.5 transition-colors hover:border-brand-200 hover:bg-brand-50"
                  >
                    <div className="text-sm font-semibold text-slate-800">{v.plate}</div>
                    <div className="text-xs text-slate-500">{v.model}</div>
                    <div className="mt-1">
                      <Badge tone="slate">{v.task}</Badge>
                    </div>
                  </Link>
                ))
              )}
              {col.extra > 0 && (
                <p className="py-1 text-center text-xs font-medium text-brand-600">+{col.extra} xe khác</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ====== MY TASKS CARD ======

const TASK_TABS = [
  { key: 'mine', label: 'Nhiệm vụ của tôi' },
  { key: 'assigned', label: 'Giao cho tôi' },
] as const

function MyTasksCard({ mine, assigned }: { mine: TaskItem[]; assigned: TaskItem[] }) {
  const [tab, setTab] = useState<'mine' | 'assigned'>('mine')
  const items = tab === 'mine' ? mine : assigned

  return (
    <div className="card flex flex-1 flex-col p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-800">
          <ClipboardList size={16} className="text-purple-500" />
          Công việc
        </h3>
        <Link to="/nhiem-vu" className="text-xs text-brand-600 hover:text-brand-700">Xem tất cả <ArrowRight size={12} className="inline" /></Link>
      </div>
      <div className="mb-3 flex gap-1 rounded-lg bg-slate-100 p-1">
        {TASK_TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
              tab === t.key ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="max-h-[260px] space-y-1 overflow-y-auto">
        {items.length === 0 ? (
          <p className="py-6 text-center text-sm text-slate-400">Không có nhiệm vụ</p>
        ) : (
          items.map((task) => {
            const statusColor = task.status === 'doing' ? '#f59e0b' : task.status === 'todo' ? '#94a3b8' : '#22c55e'
            const statusLabel = task.status === 'doing' ? 'Đang làm' : task.status === 'todo' ? 'Chờ làm' : 'Hoàn thành'
            return (
              <div key={task.id} className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 transition-colors hover:bg-slate-50">
                <input type="checkbox" className="h-4 w-4 rounded border-slate-300 text-brand-600" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-slate-700">{task.plate || ''}</span>
                    <span className="text-xs text-slate-500">{task.title}</span>
                  </div>
                  {task.location && <div className="text-[10px] text-slate-400">{task.location}</div>}
                </div>
                <span
                  className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium"
                  style={{ background: `${statusColor}1a`, color: statusColor }}
                >
                  {statusLabel}
                </span>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}

// ====== QUICK STATS CARD ======

function QuickStatsCard({ stats }: { stats: QuickStats }) {
  const cards = [
    { label: 'Tổng số xe', value: stats.total, color: '#3b82f6', icon: Car },
    { label: 'Xe đã bán', value: stats.sold, color: '#22c55e', icon: CheckCircle },
    { label: 'Xe sắp bán', value: stats.pending, color: '#f59e0b', icon: Clock },
    { label: 'Xe đang rửa', value: stats.washing, color: '#10b981', icon: Car },
  ]

  return (
    <div className="card flex flex-1 flex-col p-4">
      <div className="flex flex-1 flex-wrap items-center gap-3">
        {cards.map((c) => (
          <div key={c.label} className="flex min-w-[100px] flex-1 flex-col items-center rounded-xl bg-slate-50 p-3 text-center">
            <div className="flex items-center gap-2">
              <c.icon size={18} style={{ color: c.color }} />
              <span className="text-2xl font-bold" style={{ color: c.color }}>{c.value}</span>
            </div>
            <div className="mt-1 text-xs text-slate-500">{c.label}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ====== REVENUE CHART CARD ======

const MOCK_REVENUE = [
  { month: 'T1', revenue: 0, cost: 0 },
  { month: 'T2', revenue: 0, cost: 0 },
  { month: 'T3', revenue: 0, cost: 0 },
  { month: 'T4', revenue: 0, cost: 0 },
  { month: 'T5', revenue: 0, cost: 0 },
  { month: 'T6', revenue: 0, cost: 0 },
  { month: 'T7', revenue: 0, cost: 0 },
  { month: 'T8', revenue: 250, cost: 180 },
  { month: 'T9', revenue: 0, cost: 0 },
  { month: 'T10', revenue: 0, cost: 0 },
  { month: 'T11', revenue: 0, cost: 0 },
  { month: 'T12', revenue: 0, cost: 0 },
]

function RevenueChartCard() {
  return (
    <div className="card flex flex-1 flex-col p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-800">
          <TrendingUp size={16} className="text-emerald-500" />
          Doanh thu
        </h3>
      </div>
      <div className="flex-1">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={MOCK_REVENUE} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
            <Tooltip />
            <Line type="monotone" dataKey="revenue" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} name="Doanh thu" />
            <Line type="monotone" dataKey="cost" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3 }} name="Chi phí" />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

// ====== CIRCULAR PROGRESS ======

function CircularProgress({ pct, size = 60, stroke = 4 }: { pct: number; size?: number; stroke?: number }) {
  const r = (size - stroke) / 2
  const circ = 2 * Math.PI * r
  const dash = (pct / 100) * circ
  return (
    <svg width={size} height={size} className="shrink-0">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#e2e8f0" strokeWidth={stroke} />
      <circle
        cx={size / 2} cy={size / 2} r={r} fill="none"
        stroke={pct >= 75 ? '#22c55e' : pct >= 50 ? '#eab308' : '#ef4444'}
        strokeWidth={stroke}
        strokeDasharray={dash}
        strokeDashoffset={circ - dash}
        strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
      <text x="50%" y="50%" textAnchor="middle" dy="0.35em" fontSize={size * 0.28} fontWeight="700" fill="#334155">
        {pct}%
      </text>
    </svg>
  )
}

// ====== PAGE ======

export default function OverviewDashboard() {
  const vm = useDashboardViewModel()

  return (
    <div className="space-y-7">
      <DashboardHeader />

      {/* ROW 1: KPI + Attendance — equal-height cards */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-5">
        <div className="flex flex-col lg:col-span-4">
          <h2 className="mb-3 flex items-center gap-2 text-base font-semibold text-slate-800">
            <AlertTriangle size={18} className="text-amber-500" />
            Công việc cần làm hôm nay
          </h2>
          <div className="flex flex-1 items-stretch">
            <TodayKPICards kpi={vm.kpi} />
          </div>
        </div>
        <div className="flex flex-col lg:col-span-1">
          <AttendanceCard data={vm.attendanceData} />
        </div>
      </div>

      {/* ROW 2: LiveFeed + Locations + Warnings — equal-height cards */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        <div className="flex flex-col lg:col-span-5">
          <LiveFeedCard items={vm.feedItems} />
        </div>
        <div className="flex flex-col lg:col-span-3">
          <LocationSummaryCard locations={vm.locationData} />
        </div>
        <div className="flex flex-col lg:col-span-4">
          <WarningCard warnings={vm.warnings} />
        </div>
      </div>

      {/* ROW 3: Workflow Board — full width, independent height */}
      <WorkflowBoard columns={vm.workflowColumns} />

      {/* ROW 4: My Tasks + Stats & Revenue — equal-height cards */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-5">
        <div className="flex flex-col lg:col-span-3">
          <MyTasksCard mine={vm.myTasks} assigned={vm.assignedToMe} />
        </div>
        <div className="flex flex-col gap-5 lg:col-span-2">
          <QuickStatsCard stats={vm.quickStats} />
          <RevenueChartCard />
        </div>
      </div>
    </div>
  )
}
