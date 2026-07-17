import { useState } from 'react'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { useStore } from '../store/useStore'
import { useYardPositionDialog } from '../hooks/useYardPositionDialog'
import type { Vehicle } from '../types'

interface Props {
  open: boolean
  vehicle: Vehicle
  onClose: () => void
}

export default function MoveVehicleDialog({ open, vehicle: v, onClose }: Props) {
  const positions = useStore((s) => s.positions)
  const moveVehicle = useStore((s) => s.moveVehicle)
  const updateVehicle = useStore((s) => s.updateVehicle)
  const yardDialog = useYardPositionDialog()

  const [loadingId, setLoadingId] = useState<string | null>(null)
  const currentPos = positions.find((p) => p.id === v.positionId)

  async function handleSelect(targetPosId: string) {
    const targetPos = positions.find((p) => p.id === targetPosId)
    if (!targetPos) return

    // If already at this position, do nothing
    if (targetPosId === v.positionId) return

    if (targetPos.name === 'Trong bãi lớn') {
      // Use yard dialog — on confirm it will call moveVehicle + updateVehicle
      yardDialog.request(v.id, targetPosId, () => {})
      onClose()
      return
    }

    setLoadingId(targetPosId)
    await new Promise((r) => setTimeout(r, 200))
    try {
      moveVehicle(v.id, targetPosId)
    } catch {}
    setLoadingId(null)
    onClose()
  }

  if (!open) return null

  const gridCols = positions.length <= 8
    ? 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4'
    : 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4'

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
        <div className="fixed inset-0 bg-black/40" onClick={onClose} />

        <div className="relative z-10 w-full max-w-lg rounded-t-2xl bg-white p-5 shadow-xl sm:rounded-2xl">
          {/* Vehicle info */}
          <div className="mb-4 text-center">
            <div className="flex items-center justify-center gap-2">
              <h2 className="text-3xl font-bold text-slate-900 tracking-wider">{v.plate}</h2>
            </div>
            <p className="text-sm text-slate-500">{v.model}</p>
          </div>

          {/* Current position */}
          <div className="mb-4 rounded-xl bg-slate-50 px-4 py-3 text-center">
            <div className="text-xs font-medium uppercase tracking-wide text-slate-400">Vị trí hiện tại</div>
            <div className="mt-0.5 font-semibold text-brand-600">{currentPos ? currentPos.name : 'Chưa phân bổ'}</div>
          </div>

          {/* Position label */}
          <div className="mb-3 text-xs font-medium uppercase tracking-wide text-slate-400">Chuyển tới</div>

          {/* Position grid */}
          <div className={`grid ${gridCols} gap-2 max-h-64 overflow-y-auto`}>
            {positions.map((p) => {
              const isActive = p.id === v.positionId
              const isLoading = loadingId === p.id
              return (
                <button
                  key={p.id}
                  disabled={isActive || isLoading}
                  onClick={() => handleSelect(p.id)}
                  className={`flex items-center justify-center rounded-xl border px-3 py-2.5 text-sm font-medium transition-all duration-150 ${
                    isActive
                      ? 'border-brand-400 bg-brand-50 text-brand-700'
                      : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50 active:scale-[0.97]'
                  } ${isLoading ? 'pointer-events-none opacity-60' : ''}`}
                >
                  {isLoading ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : isActive ? (
                    <span className="flex items-center gap-1.5">✓ {p.name}</span>
                  ) : (
                    p.name
                  )}
                </button>
              )
            })}
          </div>

          {/* Close */}
          <button onClick={onClose} className="btn-secondary mt-4 w-full text-sm">
            Đóng
          </button>
        </div>
      </div>

      {/* Yard position dialog (internal) */}
      {yardDialog.dialog}
    </>
  )
}
