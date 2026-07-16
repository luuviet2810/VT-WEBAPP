// ====== SOLD VEHICLES PAGE ======

import { useMemo, useState } from 'react'
import { Download, RotateCcw, TrendingUp, DollarSign, ShoppingCart, BarChart3, Trash2 } from 'lucide-react'
import { useStore } from '../store/useStore'
import { formatCurrency, todayISO } from '../utils/format'
import { EmptyState, Badge, ConfirmDialog } from '../components/ui'
import VehicleFormModal from './VehicleFormModal'
import * as XLSX from 'xlsx'

const RETENTION_DAYS = 31
const MS_PER_DAY = 1000 * 60 * 60 * 24

function daysSince(dateStr: string): number {
  const sold = new Date(dateStr)
  const now = new Date()
  return Math.floor((now.getTime() - sold.getTime()) / MS_PER_DAY)
}

function daysLeft(dateStr: string): number {
  return Math.max(0, RETENTION_DAYS - daysSince(dateStr))
}

function isExpired(dateStr: string | undefined | null): boolean {
  if (!dateStr) return false
  return daysSince(dateStr) >= RETENTION_DAYS
}

export default function SoldVehicles() {
  const vehicles = useStore((s) => s.vehicles)
  const employees = useStore((s) => s.employees)
  const updateVehicle = useStore((s) => s.updateVehicle)

  const today = todayISO()
  const currentMonth = today.slice(0, 7)
  const prevMonth = new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1).toISOString().slice(0, 7)

  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [searchPlate, setSearchPlate] = useState('')
  const [searchModel, setSearchModel] = useState('')
  const [sellerFilter, setSellerFilter] = useState('all')
  const [editVehicleId, setEditVehicleId] = useState<string | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [batchCleanupOpen, setBatchCleanupOpen] = useState(false)
  const [infoMsg, setInfoMsg] = useState<string | null>(null)

  const soldVehicles = useMemo(() => vehicles.filter((v) => v.status === 'sold'), [vehicles])

  const filtered = useMemo(() => {
    return soldVehicles.filter((v) => {
      if (dateFrom && v.soldDate && v.soldDate < dateFrom) return false
      if (dateTo && v.soldDate && v.soldDate > dateTo) return false
      if (searchPlate && !v.plate.toLowerCase().includes(searchPlate.toLowerCase())) return false
      if (searchModel && !v.model.toLowerCase().includes(searchModel.toLowerCase())) return false
      if (sellerFilter !== 'all' && v.assigneeId !== sellerFilter) return false
      return true
    }).sort((a, b) => {
      const dateA = a.soldDate || a.updatedAt
      const dateB = b.soldDate || b.updatedAt
      return dateA > dateB ? -1 : 1
    })
  }, [soldVehicles, dateFrom, dateTo, searchPlate, searchModel, sellerFilter])

  const expiredCount = useMemo(() => soldVehicles.filter((v) => isExpired(v.soldDate) && !v.imagesDeletedAt).length, [soldVehicles])

  const stats = useMemo(() => {
    const soldCurrent = soldVehicles.filter((v) => v.soldDate?.startsWith(currentMonth)).length
    const soldPrev = soldVehicles.filter((v) => v.soldDate?.startsWith(prevMonth)).length
    const revenueCurrent = soldVehicles.filter((v) => v.soldDate?.startsWith(currentMonth)).reduce((s, v) => s + (v.sellPrice ?? 0), 0)
    const revenuePrev = soldVehicles.filter((v) => v.soldDate?.startsWith(prevMonth)).reduce((s, v) => s + (v.sellPrice ?? 0), 0)
    const costCurrent = soldVehicles.filter((v) => v.soldDate?.startsWith(currentMonth)).reduce((s, v) => s + (v.costPrice ?? 0), 0)
    const costPrev = soldVehicles.filter((v) => v.soldDate?.startsWith(prevMonth)).reduce((s, v) => s + (v.costPrice ?? 0), 0)
    const profitCurrent = revenueCurrent - costCurrent
    const profitPrev = revenuePrev - costPrev
    return { soldCurrent, soldPrev, revenueCurrent, revenuePrev, costCurrent, costPrev, profitCurrent, profitPrev }
  }, [soldVehicles, currentMonth, prevMonth])

  function exportExcel() {
    const header = ['STT', 'Ngày bán', 'Biển số', 'Model', 'Năm', 'Giá nhập', 'Giá bán', 'Lợi nhuận', 'Nhân viên bán', 'Ghi chú', 'Ảnh sẽ xóa sau']
    const data = filtered.map((v, i) => {
      const seller = employees.find((e) => e.id === v.assigneeId)
      const retentionText = v.imagesDeletedAt ? 'Đã xóa ảnh' : v.soldDate && isExpired(v.soldDate) ? 'Hết hạn' : v.soldDate ? `${daysLeft(v.soldDate)} ngày` : '—'
      return [
        i + 1, v.soldDate || '—', v.plate, v.model, v.year || '—',
        v.costPrice ?? 0, v.sellPrice ?? 0, (v.sellPrice ?? 0) - (v.costPrice ?? 0),
        seller?.name || '—', v.note || '',
        retentionText,
      ]
    })
    const ws = XLSX.utils.aoa_to_sheet([header, ...data])
    ws['!cols'] = [6, 14, 12, 16, 8, 14, 14, 14, 16, 20, 14].map((w) => ({ wch: w }))
    for (let c = 0; c < header.length; c++) {
      const addr = XLSX.utils.encode_cell({ r: 0, c })
      if (ws[addr]) ws[addr].s = { font: { bold: true } }
    }
    ws['!freeze'] = { xSplit: 0, ySplit: 1 }
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Đã bán')
    XLSX.writeFile(wb, `Xe_da_ban_${dateFrom || 'all'}_${dateTo || 'all'}.xlsx`)
  }

  async function handleBatchCleanup() {
    const expired = soldVehicles.filter((v) => isExpired(v.soldDate) && !v.imagesDeletedAt)
    for (const v of expired) {
      await updateVehicle(v.id, { images: [], imagesDeletedAt: new Date().toISOString() })
    }
    setBatchCleanupOpen(false)
  }

  function openEdit(id: string) {
    setEditVehicleId(id)
    setModalOpen(true)
  }

  function closeModal() {
    setModalOpen(false)
    setEditVehicleId(null)
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Xe đã bán</h1>
          <p className="mt-1 text-sm text-slate-500">Quản lý xe đã bán và thống kê doanh số.</p>
        </div>
        <div className="flex items-center gap-3">
          {expiredCount > 0 ? (
            <button className="btn-secondary" onClick={() => setBatchCleanupOpen(true)}>
              <Trash2 size={15} /> Xóa ảnh hết hạn
            </button>
          ) : (
            <button className="btn-secondary" onClick={() => { setInfoMsg('Không có xe nào đã hết hạn lưu ảnh.'); setTimeout(() => setInfoMsg(null), 3000) }}>
              <Trash2 size={15} /> Xóa ảnh hết hạn
            </button>
          )}
          <button className="btn-primary" onClick={exportExcel}>
            <Download size={16} /> Xuất Excel (.xlsx)
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { icon: ShoppingCart, label: 'Đã bán', value: `${stats.soldCurrent} xe`, sub: `Đã bán ${stats.soldPrev} xe tháng trước`, color: 'text-blue-600' },
          { icon: TrendingUp, label: 'Doanh thu', value: formatCurrency(stats.revenueCurrent), sub: `Doanh thu tháng trước ${formatCurrency(stats.revenuePrev)}`, color: 'text-emerald-600' },
          { icon: BarChart3, label: 'Chi phí nhập', value: formatCurrency(stats.costCurrent), sub: `Chi phí nhập tháng trước ${formatCurrency(stats.costPrev)}`, color: 'text-orange-600' },
          { icon: DollarSign, label: 'Lợi nhuận', value: formatCurrency(stats.profitCurrent), sub: `Lợi nhuận tháng trước ${formatCurrency(stats.profitPrev)}`, color: 'text-green-600' },
        ].map((c) => (
          <div key={c.label} className="card flex flex-col justify-center p-4">
            <div className={`flex items-center gap-2 text-sm ${c.color}`}>
              <c.icon size={16} />
              <span className="font-medium">{c.label}</span>
            </div>
            <div className="mt-1 text-2xl font-bold text-slate-900">{c.value}</div>
            <div className="mt-0.5 text-xs text-slate-500">{c.sub}</div>
          </div>
        ))}
      </div>

      {/* Filter Card */}
      <div className="card mb-6 px-5 py-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          <input type="date" className="input h-12 text-sm" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} placeholder="Từ ngày" />
          <input type="date" className="input h-12 text-sm" value={dateTo} onChange={(e) => setDateTo(e.target.value)} placeholder="Đến ngày" />
          <input className="input h-12 text-sm" placeholder="Biển số" value={searchPlate} onChange={(e) => setSearchPlate(e.target.value)} />
          <input className="input h-12 text-sm" placeholder="Model" value={searchModel} onChange={(e) => setSearchModel(e.target.value)} />
          <select className="input h-12 text-sm" value={sellerFilter} onChange={(e) => setSellerFilter(e.target.value)}>
            <option value="all">Nhân viên bán</option>
            {employees.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
          </select>
          <button type="button" title="Đặt lại" onClick={() => { setDateFrom(''); setDateTo(''); setSearchPlate(''); setSearchModel(''); setSellerFilter('all') }} className="flex h-12 w-12 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition-colors hover:border-slate-300 hover:bg-slate-50">
            <RotateCcw size={18} />
          </button>
        </div>
      </div>

      {/* Result counter */}
      <div className="mb-3 text-sm text-slate-500">Hiển thị {filtered.length} xe</div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="card">
          <EmptyState title="Không có xe nào" subtitle="Chưa có xe nào được bán." />
        </div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[1050px] text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-left text-xs font-medium uppercase tracking-wide text-slate-400">
                <th className="px-3 py-3">STT</th>
                <th className="px-3 py-3 whitespace-nowrap">Ngày bán</th>
                <th className="px-3 py-3">Biển số</th>
                <th className="px-3 py-3">Model</th>
                <th className="px-3 py-3">Năm</th>
                <th className="px-3 py-3 whitespace-nowrap">Giá nhập</th>
                <th className="px-3 py-3 whitespace-nowrap">Giá bán</th>
                <th className="px-3 py-3 whitespace-nowrap">Lợi nhuận</th>
                <th className="px-3 py-3 whitespace-nowrap">Nhân viên bán</th>
                <th className="px-3 py-3 whitespace-nowrap">Ảnh sẽ xóa sau</th>
                <th className="px-3 py-3">Ghi chú</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((v, i) => {
                const seller = employees.find((e) => e.id === v.assigneeId)
                const profit = (v.sellPrice ?? 0) - (v.costPrice ?? 0)
                const exp = isExpired(v.soldDate)
                const dl = v.soldDate ? daysLeft(v.soldDate) : 0
                return (
                  <tr key={v.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/70">
                    <td className="px-3 py-2.5 text-slate-400">{i + 1}</td>
                    <td className="px-3 py-2.5 whitespace-nowrap">
                      <input
                        type="date"
                        className="w-32 rounded border border-slate-200 px-1.5 py-0.5 text-xs"
                        value={v.soldDate || ''}
                        onChange={(e) => updateVehicle(v.id, { soldDate: e.target.value || undefined })}
                      />
                    </td>
                    <td className="px-3 py-2.5">
                      <button onClick={() => openEdit(v.id)} className="font-medium text-brand-600 hover:underline whitespace-nowrap">{v.plate}</button>
                    </td>
                    <td className="px-3 py-2.5">
                      <button onClick={() => openEdit(v.id)} className="text-slate-700 hover:text-brand-600 whitespace-nowrap">{v.model}</button>
                    </td>
                    <td className="px-3 py-2.5 text-slate-500">{v.year || '—'}</td>
                    <td className="px-3 py-2.5 text-slate-500 whitespace-nowrap">{formatCurrency(v.costPrice)}</td>
                    <td className="px-3 py-2.5 font-semibold text-slate-800 whitespace-nowrap">{formatCurrency(v.sellPrice)}</td>
                    <td className={`px-3 py-2.5 font-semibold whitespace-nowrap ${profit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                      {formatCurrency(profit)}
                    </td>
                    <td className="px-3 py-2.5 text-slate-500 whitespace-nowrap">{seller?.name || '—'}</td>
                    <td className="px-3 py-2.5 whitespace-nowrap">
                      {v.imagesDeletedAt ? (
                        <span className="text-xs text-slate-400">Đã xóa ảnh</span>
                      ) : exp ? (
                        <Badge tone="red">Hết hạn</Badge>
                      ) : (
                        <span className="text-xs text-slate-500">{dl} ngày</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-slate-500 max-w-[120px] truncate">{v.note || '—'}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      <VehicleFormModal open={modalOpen} onClose={closeModal} editVehicleId={editVehicleId} />

      {/* Toast notification */}
      {infoMsg && (
        <div className="fixed bottom-4 right-4 z-50 rounded-lg bg-slate-800 px-4 py-3 text-sm text-white shadow-lg">
          {infoMsg}
        </div>
      )}

      {/* Batch cleanup confirmation */}
      <ConfirmDialog
        open={batchCleanupOpen}
        title="Dọn ảnh hết hạn"
        message={`Có ${expiredCount} xe đã quá hạn lưu ảnh.\nChỉ ảnh sẽ bị xóa.\nToàn bộ dữ liệu xe vẫn được giữ nguyên.`}
        confirmLabel="Xóa ảnh"
        cancelLabel="Hủy"
        variant="danger"
        onConfirm={handleBatchCleanup}
        onCancel={() => setBatchCleanupOpen(false)}
      />
    </div>
  )
}
