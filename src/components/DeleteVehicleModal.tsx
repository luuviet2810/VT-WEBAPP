import React, { useState, useEffect } from 'react'
import { AlertTriangle, Trash2, Loader2, X, CheckCircle2 } from 'lucide-react'
import { Vehicle } from '../types'
import { useStore } from '../store/useStore'

interface DeleteVehicleModalProps {
  open: boolean
  vehicle: Vehicle | null
  onClose: () => void
  onSuccess?: () => void
}

export function DeleteVehicleModal({
  open,
  vehicle,
  onClose,
  onSuccess,
}: DeleteVehicleModalProps) {
  const deleteVehicle = useStore((s) => s.deleteVehicle)

  const [confirmInput, setConfirmInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Reset state when opened
  useEffect(() => {
    if (open) {
      setConfirmInput('')
      setLoading(false)
      setError(null)
    }
  }, [open, vehicle?.id])

  if (!open || !vehicle) return null

  // Trích xuất 4 số cuối của biển số xe
  const rawPlate = vehicle.plate || ''
  // Tìm tất cả các chữ số trong biển số
  const digitsOnly = rawPlate.replace(/\D/g, '')
  // Lấy 4 số cuối (hoặc toàn bộ số nếu < 4 ký tự số)
  const expectedDigits = digitsOnly.length >= 4 ? digitsOnly.slice(-4) : digitsOnly

  // Chuẩn hóa input của người dùng: loại bỏ khoảng trắng, dấu gạch nối, dấu chấm
  const cleanInput = confirmInput.trim().toUpperCase().replace(/[\s-.]/g, '')
  const cleanPlate = rawPlate.trim().toUpperCase().replace(/[\s-.]/g, '')

  // Hợp lệ nếu người dùng gõ đúng 4 số cuối HOẶC gõ đúng toàn bộ biển số xe
  const isMatch =
    (expectedDigits.length > 0 && cleanInput === expectedDigits) ||
    cleanInput === cleanPlate

  async function handleDelete() {
    if (!isMatch || loading || !vehicle) return
    setLoading(true)
    setError(null)

    try {
      await deleteVehicle(vehicle.id)
      onClose()
      if (onSuccess) {
        onSuccess()
      }
    } catch (err: any) {
      console.error('[DeleteVehicleModal] Delete failed:', err)
      setError(err?.message || 'Có lỗi xảy ra khi xóa xe. Vui lòng kiểm tra lại kết nối.')
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="fixed inset-0"
        onClick={() => {
          if (!loading) onClose()
        }}
      />

      <div className="relative z-10 w-full max-w-lg rounded-2xl bg-white shadow-2xl overflow-hidden border border-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 bg-red-50/60 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-100 text-red-600">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">Xác nhận xóa vĩnh viễn xe</h3>
              <p className="text-xs text-red-600 font-medium">Hành động nguy hiểm – Không thể hoàn tác</p>
            </div>
          </div>
          <button
            disabled={loading}
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 disabled:opacity-50"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Thông tin xe */}
          <div className="flex items-center justify-between rounded-xl bg-slate-50 p-4 border border-slate-200">
            <div>
              <div className="text-xs text-slate-500 font-medium">Xe cần xóa:</div>
              <div className="text-lg font-black text-slate-900 font-mono tracking-wider">{rawPlate}</div>
              <div className="text-xs text-slate-600">{vehicle.model || 'Chưa cập nhật model'}</div>
            </div>
            <div className="text-right text-xs text-slate-400">
              <div>Năm SX: {vehicle.year || '—'}</div>
              <div>Màu: {vehicle.color || '—'}</div>
            </div>
          </div>

          {/* Cảnh báo xóa triệt để */}
          <div className="rounded-xl border border-red-200 bg-red-50/50 p-4 space-y-2 text-sm text-red-800">
            <div className="font-semibold flex items-center gap-1.5 text-red-900">
              Hệ thống sẽ thực hiện CASCADE CLEANUP toàn bộ:
            </div>
            <ul className="list-disc list-inside space-y-1 text-xs text-red-700 pl-1">
              <li>Toàn bộ phiếu kiểm tra tiếp nhận & bàn giao (CheckSheets).</li>
              <li>Toàn bộ công việc phụ trách & nhật ký tiến độ (Tasks & Logs).</li>
              <li>Toàn bộ ảnh xe, tài liệu và ảnh checksheet lưu trên Cloudflare R2.</li>
              <li>Lịch sử di chuyển vị trí và các mốc quy trình gara của xe.</li>
            </ul>
          </div>

          {/* Ô nhập xác nhận */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-slate-700">
              Nhập mã xác nhận để mở khóa:{' '}
              <span className="text-red-600">
                4 số cuối ({expectedDigits || 'biển số'})
              </span>{' '}
              hoặc toàn bộ biển số xe
            </label>
            <div className="relative">
              <input
                type="text"
                autoFocus
                disabled={loading}
                value={confirmInput}
                onChange={(e) => setConfirmInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && isMatch && !loading) {
                    handleDelete()
                  }
                }}
                placeholder={`Nhập ${expectedDigits || rawPlate}...`}
                className={`w-full rounded-xl border px-4 py-2.5 text-base font-mono font-bold tracking-widest uppercase outline-none transition-all ${
                  isMatch
                    ? 'border-emerald-500 bg-emerald-50/30 text-emerald-900 focus:ring-2 focus:ring-emerald-500/20'
                    : 'border-slate-300 text-slate-800 focus:border-red-500 focus:ring-2 focus:ring-red-500/20'
                }`}
              />
              {isMatch && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-600 flex items-center gap-1 text-xs font-semibold">
                  <CheckCircle2 className="h-5 w-5" />
                  <span>Khớp</span>
                </div>
              )}
            </div>
            <p className="text-[11px] text-slate-500">
              Gợi ý: Nhập <span className="font-mono font-bold text-slate-800">{expectedDigits || rawPlate}</span> để xác nhận.
            </p>
          </div>

          {/* Hiển thị lỗi nếu có */}
          {error && (
            <div className="rounded-xl border border-red-300 bg-red-100 p-3 text-xs text-red-900 font-medium">
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 border-t border-slate-100 bg-slate-50 px-6 py-4">
          <button
            type="button"
            disabled={loading}
            onClick={onClose}
            className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            Hủy bỏ
          </button>
          <button
            type="button"
            disabled={!isMatch || loading}
            onClick={handleDelete}
            className={`flex items-center gap-2 rounded-xl px-5 py-2 text-sm font-semibold text-white shadow-sm transition-all ${
              isMatch && !loading
                ? 'bg-red-600 hover:bg-red-700 active:scale-[0.98]'
                : 'bg-slate-300 cursor-not-allowed opacity-60'
            }`}
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Đang dọn dẹp dữ liệu và file lưu trữ...</span>
              </>
            ) : (
              <>
                <Trash2 className="h-4 w-4" />
                <span>Xóa vĩnh viễn xe</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
