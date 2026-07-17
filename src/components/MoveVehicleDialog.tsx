import { useState, useMemo } from 'react'
import { Loader2 } from 'lucide-react'
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
  const yardDialog = useYardPositionDialog()

  const [loadingId, setLoadingId] = useState<string | null>(null)
  const currentPos = positions.find((p) => p.id === v.positionId)

  // Sort: "Trong bãi lớn" always last
  const sortedPositions = useMemo(() => {
    const copy = [...positions]
    const idx = copy.findIndex((p) => p.name === 'Trong bãi lớn')
    if (idx >= 0) {
      const [yard] = copy.splice(idx, 1)
      copy.push(yard)
    }
    return copy
  }, [positions])

  async function handleSelect(targetPosId: string) {
    const targetPos = positions.find((p) => p.id === targetPosId)
    if (!targetPos) return
    if (targetPosId === v.positionId) return

    if (targetPos.name === 'Trong bãi lớn') {
      yardDialog.request(v.id, targetPosId, () => {})
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

  // Keep mounted when yard dialog is open so it can render on top
  if (!open && !yardDialog.open) return null

  const gridCols = 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4'

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
            {sortedPositions.map((p) => {
              const isActive = p.id === v.positionId
              const isLoading = loadingId === p.id
              const isYard = p.name === 'Trong bãi lớn'

              if (isYard) {
                return (
                  <button
                    key={p.id}
                    disabled={isActive || isLoading}
                    onClick={() => handleSelect(p.id)}
                    className={`col-span-full flex items-center justify-center gap-2 rounded-xl border-2 px-3 py-3 text-sm font-semibold transition-all duration-150 ${
                      isActive
                        ? 'border-emerald-400 bg-emerald-50 text-emerald-700'
                        : 'border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 hover:border-emerald-400 active:scale-[0.97]'
                    } ${isLoading ? 'pointer-events-none opacity-60' : ''}`}
                  >
                    {isLoading ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : isActive ? (
                      <span className="flex items-center gap-1.5">📍 ✓ {p.name}</span>
                    ) : (
                      <span className="flex items-center gap-1.5">📍 {p.name} — Chọn vị trí trong bãi</span>
                    )}
                  </button>
                )
              }

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
          {!yardDialog.open && (
            <button onClick={onClose} className="btn-secondary mt-4 w-full text-sm">
              Đóng
            </button>
          )}
        </div>
      </div>

      {/* Yard position dialog (renders on top) */}
      {yardDialog.dialog}
    </>
  )
}
