import { useState, useCallback, useRef, useEffect } from 'react'
import { Edit3, Plus, X } from 'lucide-react'
import { Modal } from '../components/ui'
import { useStore } from '../store/useStore'

const DEFAULT_YARD_POSITIONS = ['A15', 'C14', 'Hwamul 5', 'Hwamul 6', 'Hwamul 7', 'Hwamul 8', 'Hwamul 9', 'Hwamul 10']
const STORAGE_KEY = 'gara_yard_positions'

function loadYardPositions(): string[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      const parsed = JSON.parse(stored)
      if (Array.isArray(parsed) && parsed.length > 0) return parsed
    }
  } catch {}
  return DEFAULT_YARD_POSITIONS
}

function saveYardPositions(positions: string[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(positions))
  } catch {}
}

/**
 * Shared hook for the "Chọn vị trí trong bãi lớn" dialog.
 */
export function useYardPositionDialog() {
  const updateVehicle = useStore((s) => s.updateVehicle)
  const moveVehicle = useStore((s) => s.moveVehicle)

  const [open, setOpen] = useState(false)
  const [vehicleId, setVehicleId] = useState<string | null>(null)
  const [targetPositionId, setTargetPositionId] = useState<string | null>(null)
  const [selectedYardPos, setSelectedYardPos] = useState('')
  const [yardPositions, setYardPositions] = useState<string[]>(loadYardPositions)
  const [editing, setEditing] = useState(false)
  const [newPosName, setNewPosName] = useState('')
  const onCancelRef = useRef<(() => void) | null>(null)

  // Persist to localStorage whenever yardPositions changes
  useEffect(() => {
    saveYardPositions(yardPositions)
  }, [yardPositions])

  const request = useCallback((vid: string, targetPosId: string, onCancel?: () => void) => {
    setVehicleId(vid)
    setTargetPositionId(targetPosId)
    setSelectedYardPos('')
    onCancelRef.current = onCancel ?? null
    setOpen(true)
  }, [])

  const confirm = useCallback(() => {
    if (vehicleId && targetPositionId && selectedYardPos) {
      updateVehicle(vehicleId, { yardPosition: selectedYardPos })
      moveVehicle(vehicleId, targetPositionId)
    }
    setOpen(false)
    setVehicleId(null)
    setTargetPositionId(null)
    setSelectedYardPos('')
  }, [vehicleId, targetPositionId, selectedYardPos, updateVehicle, moveVehicle])

  const cancel = useCallback(() => {
    onCancelRef.current?.()
    onCancelRef.current = null
    setOpen(false)
    setVehicleId(null)
    setTargetPositionId(null)
    setSelectedYardPos('')
  }, [])

  function handleAddPosition() {
    const name = newPosName.trim()
    if (!name || yardPositions.includes(name)) return
    setYardPositions((prev) => [...prev, name])
    setNewPosName('')
  }

  function handleDeletePosition(pos: string) {
    setYardPositions((prev) => prev.filter((p) => p !== pos))
    if (selectedYardPos === pos) setSelectedYardPos('')
  }

  const USE_BUTTONS = yardPositions.length <= 8

  const dialog = (
    <Modal open={open} onClose={cancel} title="Chọn vị trí trong bãi lớn" width="max-w-lg">
      <div className="space-y-4">
        {/* Edit toggle */}
        <div className="flex justify-end -mt-2">
          <button
            onClick={() => setEditing((e) => !e)}
            className={`flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium transition-colors ${
              editing ? 'bg-brand-100 text-brand-700' : 'text-slate-400 hover:text-slate-600'
            }`}
            title={editing ? 'Hoàn tất chỉnh sửa' : 'Chỉnh sửa danh sách'}
          >
            <Edit3 size={13} /> {editing ? 'Xong' : 'Sửa'}
          </button>
        </div>

        {USE_BUTTONS ? (
          <div className="grid grid-cols-2 gap-2">
            {yardPositions.map((pos) => (
              <button
                key={pos}
                disabled={editing}
                onClick={() => setSelectedYardPos(pos)}
                className={`relative rounded-xl border px-3 py-2.5 text-sm font-medium transition-all duration-150 ${
                  selectedYardPos === pos
                    ? 'border-brand-400 bg-brand-50 text-brand-700'
                    : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                } ${editing ? 'cursor-default opacity-70' : ''}`}
              >
                <span>{pos === selectedYardPos ? `✓ ${pos}` : pos}</span>
                {editing && (
                  <span
                    onClick={(e) => { e.stopPropagation(); handleDeletePosition(pos) }}
                    className="absolute -right-1.5 -top-1.5 flex h-4 w-4 cursor-pointer items-center justify-center rounded-full bg-red-500 text-[10px] text-white hover:bg-red-600"
                  >✕</span>
                )}
              </button>
            ))}
          </div>
        ) : (
          <select
            className="input w-full"
            value={selectedYardPos}
            onChange={(e) => setSelectedYardPos(e.target.value)}
          >
            <option value="">-- Chọn vị trí --</option>
            {yardPositions.map((pos) => (
              <option key={pos} value={pos}>{pos}</option>
            ))}
          </select>
        )}

        {/* Add form — visible only in edit mode */}
        {editing && (
          <div className="flex gap-2">
            <input className="input flex-1" placeholder="Thêm vị trí mới..." value={newPosName} onChange={(e) => setNewPosName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleAddPosition()} autoFocus />
            <button className="btn-primary !px-3" onClick={handleAddPosition} disabled={!newPosName.trim()}>
              <Plus size={15} />
            </button>
          </div>
        )}

        <div className="flex justify-end gap-3">
          <button className="btn-secondary" onClick={cancel}>Huỷ</button>
          <button className="btn-primary" onClick={confirm} disabled={!selectedYardPos}>Xác nhận</button>
        </div>
      </div>
    </Modal>
  )

  return { open, request, confirm, cancel, dialog }
}
