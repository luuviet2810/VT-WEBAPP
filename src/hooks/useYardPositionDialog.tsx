import { useState, useCallback, useRef } from 'react'
import { Modal } from '../components/ui'
import { useStore } from '../store/useStore'

const YARD_POSITIONS = ['A15', 'C14', 'Hwamul 5', 'Hwamul 6', 'Hwamul 7', 'Hwamul 8', 'Hwamul 9', 'Hwamul 10']

/**
 * Shared hook for the "Chọn vị trí trong bãi lớn" dialog.
 *
 * Both Positions.tsx (drag & drop) and VehicleDetail.tsx (dropdown)
 * use this hook so the workflow is always identical:
 *
 * 1. User picks "Trong bãi lớn"
 * 2. Modal opens to select internal parking position
 * 3. User confirms → yardPosition + positionId saved
 * 4. User cancels → nothing changes
 */
export function useYardPositionDialog() {
  const updateVehicle = useStore((s) => s.updateVehicle)
  const moveVehicle = useStore((s) => s.moveVehicle)

  const [open, setOpen] = useState(false)
  const [vehicleId, setVehicleId] = useState<string | null>(null)
  const [targetPositionId, setTargetPositionId] = useState<string | null>(null)
  const [selectedYardPos, setSelectedYardPos] = useState('')
  const onCancelRef = useRef<(() => void) | null>(null)

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

  const dialog = (
    <Modal open={open} onClose={cancel} title="Chọn vị trí trong bãi lớn">
      <div className="space-y-4">
        <select
          className="input w-full"
          value={selectedYardPos}
          onChange={(e) => setSelectedYardPos(e.target.value)}
        >
          <option value="">-- Chọn vị trí --</option>
          {YARD_POSITIONS.map((pos) => (
            <option key={pos} value={pos}>{pos}</option>
          ))}
        </select>
        <div className="flex justify-end gap-3">
          <button className="btn-secondary" onClick={cancel}>Huỷ</button>
          <button className="btn-primary" onClick={confirm} disabled={!selectedYardPos}>Xác nhận</button>
        </div>
      </div>
    </Modal>
  )

  return { request, confirm, cancel, dialog }
}
