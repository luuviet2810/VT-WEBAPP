// ====== OVERVIEW DASHBOARD v2 ======

import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Car, AlertTriangle, Activity, MapPin, Bell, ClipboardList,
  CheckCircle, Clock, ArrowRight, Camera, FileText, Calendar, AlertCircle,
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
    <>
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
    </>
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

// ====== ERROR IMAGE CARD ======

function ErrorImageCard() {
  const vehicles = useStore((s) => s.vehicles)
  const navigate = useNavigate()
  const [data, setData] = useState<{ vehicles: { vehicleId: string; count: number }[]; totalImages: number } | null>(null)
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)

  useEffect(() => {
    let cancelled = false
    async function load() {
      const { supabase } = await import('../../lib/supabase')
      const { data: images, error } = await supabase
        .from('vehicle_images')
        .select('vehicle_id')
        .eq('category', 'error')
        .eq('resolved', false)
      if (!cancelled && !error && images) {
        // Group by vehicle_id
        const map = new Map<string, number>()
        for (const img of images) {
          map.set(img.vehicle_id, (map.get(img.vehicle_id) || 0) + 1)
        }
        const vehiclesList = Array.from(map.entries()).map(([vehicleId, count]) => ({ vehicleId, count }))
        setData({
          vehicles: vehiclesList,
          totalImages: images.length,
        })
      }
      if (!cancelled) setLoading(false)
    }
    load()
    return () => { cancelled = true }
  }, [])

  if (loading || !data) return null

  return (
    <>
      <div className="card flex flex-col justify-between p-4">
        <div>
          <div className="flex items-center justify-between">
            <Camera size={20} className="text-red-500" />
          </div>
          <div className="mt-2 text-2xl font-bold text-red-500">{data.vehicles.length}</div>
          <div className="mt-0.5 text-xs text-slate-500">{data.vehicles.length} xe · {data.totalImages} ảnh lỗi</div>
        </div>
        {data.vehicles.length > 0 && (
          <button onClick={() => setModalOpen(true)} className="mt-3 self-start text-xs font-medium text-brand-600 hover:text-brand-700">
            Xem ảnh lỗi →
          </button>
        )}
      </div>

      {/* Error Image Detail Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setModalOpen(false)}>
          <div className="mx-4 flex max-h-[70vh] w-full max-w-xl flex-col rounded-xl bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex shrink-0 items-center justify-between border-b px-5 py-3">
              <h3 className="text-sm font-semibold text-slate-800">Ảnh lỗi xe</h3>
              <button onClick={() => setModalOpen(false)} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
                ✕
              </button>
            </div>
            <div className="overflow-y-auto px-5 py-3">
              <p className="mb-3 text-xs text-slate-500">{data.vehicles.length} xe có ảnh lỗi</p>
              <div className="space-y-2">
                {data.vehicles.map((item) => {
                  const v = vehicles.find((x) => x.id === item.vehicleId)
                  if (!v) return null
                  return (
                    <div key={item.vehicleId} className="flex items-center gap-3 rounded-lg border border-slate-100 px-3 py-2.5">
                      {v.images[0] ? (
                        <div className="h-10 w-14 shrink-0 overflow-hidden rounded-md bg-slate-100">
                          <img src={v.images[0]} className="h-full w-full object-cover" loading="lazy" />
                        </div>
                      ) : (
                        <div className="flex h-10 w-14 shrink-0 items-center justify-center rounded-md bg-slate-100 text-slate-300">
                          <Camera size={14} />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-slate-800">{v.model} - {v.plate || '—'}</div>
                        <div className="text-xs text-slate-500">Ảnh lỗi: {item.count}</div>
                      </div>
                      <button
                        onClick={() => navigate(`/xe/${item.vehicleId}`)}
                        className="shrink-0 text-xs font-medium text-brand-600 hover:text-brand-700"
                      >
                        Chi tiết →
                      </button>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

// ====== MISSING IMAGE STATS CARDS ======

function MissingImageCards() {
  const vehicles = useStore((s) => s.vehicles)
  const navigate = useNavigate()
  const [stats, setStats] = useState<{
    missingDocuments: string[]
    missingVehicleImages: string[]
    missingSongNung: string[]
    expiredSongNung: string[]
    expiredRegistration: string[]
  } | null>(null)
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState<{ title: string; vehicleIds: string[]; showExpiry?: boolean } | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      const { supabase } = await import('../../lib/supabase')

      // Get all vehicle images grouped by category
      const { data: images } = await supabase
        .from('vehicle_images')
        .select('vehicle_id, category')

      if (cancelled) { setLoading(false); return }

      // Only count active vehicles (not sold) — consistent with dashboard KPI
      const activeVehicles = vehicles.filter((v) => v.status !== 'sold')
      const activeIds = new Set(activeVehicles.map((v) => v.id))

      const docsVehicles = new Set(images?.filter((i) => i.category === 'documents').map((i) => i.vehicle_id) ?? [])
      const vehicleImageVehicles = new Set(images?.filter((i) => i.category === 'vehicle').map((i) => i.vehicle_id) ?? [])
      const songNungVehicles = new Set(images?.filter((i) => i.category === 'song_nung').map((i) => i.vehicle_id) ?? [])

      const missingDocs: string[] = []
      const missingVehicle: string[] = []
      const missingSongNung: string[] = []
      const expiredSongNung: string[] = []
      const expiredRegistration: string[] = []

      const today = new Date()
      today.setHours(0, 0, 0, 0)

      for (const v of activeVehicles) {
        if (!docsVehicles.has(v.id)) missingDocs.push(v.id)
        if (!vehicleImageVehicles.has(v.id)) missingVehicle.push(v.id)
        if (!songNungVehicles.has(v.id)) missingSongNung.push(v.id)
        // Check expiry from vehicle-level data
        if (v.songNungExpiryDate && new Date(v.songNungExpiryDate) < today) expiredSongNung.push(v.id)
        if (v.registrationExpiryDate && new Date(v.registrationExpiryDate) < today) expiredRegistration.push(v.id)
      }

      if (!cancelled) {
        setStats({ missingDocuments: missingDocs, missingVehicleImages: missingVehicle, missingSongNung, expiredSongNung, expiredRegistration })
        setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [vehicles])

  if (loading || !stats) return null

  const cards = [
    {
      label: 'Xe chưa có ảnh giấy tờ',
      value: stats.missingDocuments.length,
      color: '#8b5cf6',
      icon: FileText,
      ids: stats.missingDocuments,
    },
    {
      label: 'Xe chưa có ảnh xe',
      value: stats.missingVehicleImages.length,
      color: '#06b6d4',
      icon: Camera,
      ids: stats.missingVehicleImages,
    },
    {
      label: 'Xe chưa có ảnh Song nưng',
      value: stats.missingSongNung.length,
      color: '#f59e0b',
      icon: Calendar,
      ids: stats.missingSongNung,
    },
    {
      label: 'Xe có Song nưng hết hạn',
      value: stats.expiredSongNung.length,
      color: '#ef4444',
      icon: AlertCircle,
      ids: stats.expiredSongNung,
    },
    {
      label: 'Xe có đăng kiểm hết hạn',
      value: stats.expiredRegistration.length,
      color: '#dc2626',
      icon: Calendar,
      ids: stats.expiredRegistration,
    },
  ]

  return (
    <>
      {cards.map((c) => (
        <div key={c.label} className="card flex flex-col justify-between p-4">
          <div>
            <div className="flex items-center justify-between">
              <c.icon size={20} style={{ color: c.color }} />
            </div>
            <div className="mt-2 text-2xl font-bold" style={{ color: c.color }}>{c.value}</div>
            <div className="mt-0.5 text-xs text-slate-500">{c.label}</div>
          </div>
          {c.value > 0 && (
            <button
              onClick={() => setModal({ title: c.label, vehicleIds: c.ids })}
              className="mt-3 self-start text-xs font-medium text-brand-600 hover:text-brand-700"
            >
              Chi tiết →
            </button>
          )}
        </div>
      ))}

      {/* Detail Modal */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setModal(null)}>
          <div className="mx-4 flex max-h-[70vh] w-full max-w-xl flex-col rounded-xl bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex shrink-0 items-center justify-between border-b px-5 py-3">
              <h3 className="text-sm font-semibold text-slate-800">{modal.title}</h3>
              <button onClick={() => setModal(null)} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
                ✕
              </button>
            </div>
            <div className="overflow-y-auto px-5 py-3">
              {modal.vehicleIds.length === 0 ? (
                <p className="py-4 text-center text-sm text-slate-400">Không có xe nào</p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-xs font-medium uppercase text-slate-400">
                      <th className="py-2 pr-2">Biển số</th>
                      <th className="py-2 pr-2">Dòng xe</th>
                      {modal.title.includes('Song nưng hết hạn') && <th className="py-2 pr-2">Hạn Song nưng</th>}
                      {modal.title.includes('đăng kiểm hết hạn') && <th className="py-2 pr-2">Hạn đăng kiểm</th>}
                      <th className="py-2 text-right" />
                    </tr>
                  </thead>
                  <tbody>
                    {modal.vehicleIds.map((vid) => {
                      const v = vehicles.find((x) => x.id === vid)
                      if (!v) return null
                      return (
                        <tr key={vid} className="border-b border-slate-50 last:border-0">
                          <td className="py-2 pr-2 font-medium text-brand-600">{v.plate || '—'}</td>
                          <td className="py-2 pr-2 text-slate-600">{v.model}</td>
                          {modal.title.includes('Song nưng hết hạn') && (
                            <td className="py-2 pr-2 text-red-600">{v.songNungExpiryDate ? new Date(v.songNungExpiryDate).toLocaleDateString('vi-VN') : '—'}</td>
                          )}
                          {modal.title.includes('đăng kiểm hết hạn') && (
                            <td className="py-2 pr-2 text-red-600">{v.registrationExpiryDate ? new Date(v.registrationExpiryDate).toLocaleDateString('vi-VN') : '—'}</td>
                          )}
                          <td className="py-2 text-right">
                            <button
                              onClick={() => navigate(`/xe/${vid}`)}
                              className="text-xs font-medium text-brand-600 hover:text-brand-700"
                            >
                              Chi tiết →
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}
    </>
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

      {/* IMAGE STATUS ROW: 6 cards — documents, vehicle, song_nung, expired song_nung, expired registration, error */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 lg:grid-cols-6 sm:gap-5">
        <MissingImageCards />
        <ErrorImageCard />
      </div>

      {/* ROW 1: 4 KPI cards — equal width, full row */}
      <div className="grid w-full grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-5">
        <TodayKPICards kpi={vm.kpi} />
      </div>

      {/* ROW 2: LiveFeed + Locations + Warnings */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        <div className="flex flex-col lg:col-span-5">
          <LiveFeedCard items={vm.feedItems} />
        </div>
        <div className="flex flex-col lg:col-span-3">
          <LocationSummaryCard locations={vm.locationData} />
        </div>
        <div className="flex flex-col gap-5 lg:col-span-4">
          <WarningCard warnings={vm.warnings} />
        </div>
      </div>

      {/* ROW 3: Quick stats — full width */}
      <QuickStatsCard stats={vm.quickStats} />
    </div>
  )
}
