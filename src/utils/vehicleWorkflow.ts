/**
 * Vehicle Workflow Status
 *
 * Derives a vehicle's pipeline/workflow status from the current state
 * of tasks and checksheets. This is a read-only computation — it does
 * NOT write to the database.
 *
 * Workflow pipeline:
 *   NEW → INPUT → WORKING → FINAL_CHECK → READY → SOLD
 *
 * Rules (evaluated top-to-bottom, first match wins):
 *   SOLD     — vehicle.status === 'sold'
 *   READY    — output checksheet exists (completed)
 *   FINAL_CHECK — all tasks done AND output checksheet NOT completed
 *   WORKING  — vehicle has at least one unfinished task
 *   INPUT    — input checksheet exists
 *   NEW      — default (vehicle newly created, no checksheets)
 */

import type { Task, Vehicle } from '../types'
import type { VehicleWorkflowStatus } from '../types'

export type { VehicleWorkflowStatus } from '../types'

export const WORKFLOW_STATUS_LABEL: Record<VehicleWorkflowStatus, string> = {
  new:         'Mới nhập',
  input:       'Đầu vào',
  working:     'Đang sửa',
  final_check: 'Kiểm tra cuối',
  ready:       'Sẵn sàng bán',
  sold:        'Đã bán',
}

export const WORKFLOW_STATUS_TONE: Record<VehicleWorkflowStatus, 'slate' | 'blue' | 'orange' | 'green' | 'purple'> = {
  new:         'slate',
  input:       'blue',
  working:     'orange',
  final_check: 'orange',
  ready:       'green',
  sold:        'purple',
}

/** Minimal checksheet fields needed for workflow evaluation. */
export interface WorkflowCheckSheet {
  type: 'in' | 'out'
  checkDate: string
}

/** Returns true if the given checksheet is "complete". A sheet is complete if it has been saved (exists). */
function isCheckSheetComplete(sheet: WorkflowCheckSheet | undefined): boolean {
  return sheet !== undefined
}

/** Returns true if all tasks for the given vehicle are done. */
function areAllTasksDone(tasks: Task[]): boolean {
  if (tasks.length === 0) return false
  return tasks.every((t) => t.status === 'done')
}

/** Returns true if the vehicle has at least one task that is not done. */
function hasUnfinishedTasks(tasks: Task[]): boolean {
  return tasks.some((t) => t.status !== 'done')
}

/**
 * Computes the workflow status for a vehicle.
 *
 * @param vehicle    - The vehicle to evaluate
 * @param vehicleTasks  - All tasks linked to this vehicle
 * @param checkSheets  - All checksheets for this vehicle (input + output); only `type` and `checkDate` are used
 */
export function getVehicleWorkflowStatus(
  vehicle: Vehicle,
  vehicleTasks: Task[],
  checkSheets: WorkflowCheckSheet[]
): VehicleWorkflowStatus {
  const latestInSheet = checkSheets
    .filter((s) => s.type === 'in')
    .sort((a, b) => (a.checkDate < b.checkDate ? 1 : -1))[0]

  const latestOutSheet = checkSheets
    .filter((s) => s.type === 'out')
    .sort((a, b) => (a.checkDate < b.checkDate ? 1 : -1))[0]

  const latestInComplete = isCheckSheetComplete(latestInSheet)
  const latestOutComplete = isCheckSheetComplete(latestOutSheet)
  const allDone = areAllTasksDone(vehicleTasks)
  const hasUnfinished = hasUnfinishedTasks(vehicleTasks)

  // SOLD — vehicle marked as sold in the system
  if (vehicle.status === 'sold') return 'sold'

  // READY — output checksheet exists (vehicle passed final inspection)
  if (latestOutComplete) return 'ready'

  // FINAL_CHECK — all tasks done AND output not yet done
  if (allDone && !latestOutComplete) return 'final_check'

  // WORKING — has unfinished tasks (in repair/maintenance)
  if (hasUnfinished) return 'working'

  // INPUT — input checksheet exists (vehicle has been checked in)
  if (latestInComplete) return 'input'

  // NEW — default (vehicle created, no checksheets yet)
  return 'new'
}
