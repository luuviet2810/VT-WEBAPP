// ====== OVERVIEW DASHBOARD v2 ======

import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Car, AlertTriangle, Activity, MapPin, Bell, ClipboardList,
  CheckCircle, Clock, ArrowRight,
} from 'lucide-react'
import { useDashboardViewModel } from './dashboard/DashboardViewModel'
import { useStore } from '../../store/useStore'
import { buildTaskSummary } from '../../utils/taskSummary'
import type {
  KpiData, LiveFeedItem, LocationItem,
  WarningItem, QuickStats,
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
    <div className="grid w-full grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-5">
      {KPI_CARDS.map((card) => {
        const value = kpi[card.key as keyof typeof kpi] as number
        return (
          <div key={card.key} className="card flex flex-col justify-center p-4">
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

// ====== QUICK STATS CARD ======

function QuickStatsCard({ stats }: { stats: QuickStats }) {
  const cards = [
    { label: 'Tổng số xe', value: stats.total, color: '#3b82f6', icon: Car },
    { label: 'Xe đã bán (tháng)', value: stats.soldThisMonth, color: '#22c55e', icon: CheckCircle },
    { label: 'Xe đã cọc', value: stats.deposited, color: '#f59e0b', icon: Clock },
    { label: 'Số xe đã bán', value: stats.totalSold, color: '#10b981', icon: Car },
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

// ====== TASK OVERVIEW (most prominent) ======

function TaskOverviewSection() {
  const tasks = useStore((s) => s.tasks)
  const summaryGroups = buildTaskSummary(tasks)

  return (
    <div>
      {/* Summary — what needs to be done */}
      {summaryGroups.length > 0 && (
        <div className="card border-2 border-brand-100 p-4">
          <div className="mb-3 flex items-center justify-between">
            <span className="flex items-center gap-2 text-sm font-semibold text-slate-700">
              📋 Tổng quan nhiệm vụ
              <span className="rounded-full bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-600">{summaryGroups.length} loại cần làm</span>
            </span>
            <Link to="/nhiem-vu" className="text-xs font-medium text-brand-600 hover:underline">Xem tất cả →</Link>
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {summaryGroups.map((g) => (
              <div key={g.key} className="flex items-center justify-between gap-2 rounded-xl border border-slate-100 bg-slate-50/60 px-3 py-2">
                <div className="flex min-w-0 items-center gap-2">
                  <span className="shrink-0 text-base">{g.icon}</span>
                  <span className="truncate text-sm font-medium text-slate-700">{g.label}</span>
                </div>
                <span className="shrink-0 text-sm font-semibold text-slate-800">{g.count} {g.isManual ? 'việc' : 'xe'}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ====== PAGE ======

export default function OverviewDashboard() {
  const vm = useDashboardViewModel()

  return (
    <div className="space-y-7">
      <DashboardHeader />

      {/* TASK OVERVIEW — most prominent, what needs to be done */}
      <TaskOverviewSection />

      {/* ROW 1: 4 KPI cards — equal width, full row */}
      <div className="flex flex-1 gap-5">
        <TodayKPICards kpi={vm.kpi} />
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

      {/* ROW 3: Quick stats — full width */}
      <QuickStatsCard stats={vm.quickStats} />
    </div>
  )
}
