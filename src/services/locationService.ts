/**
 * Location Service (Legacy compatibility layer delegating to position.service)
 * Decoupled from Supabase.
 */

import {
  getPositions,
  createPosition,
  updatePosition as updatePos,
  deletePosition,
  reorderPositions as reorderPos,
} from './position.service'
import type { Position } from '../types'

export interface Location {
  id: string
  name: string
  sort_order: number
  created_at?: string
  updated_at?: string
}

export interface ReorderItem {
  id: string
  sort_order: number
}

export async function getLocations(): Promise<Location[]> {
  const positions: Position[] = await getPositions()
  return positions.map((p) => ({
    id: p.id,
    name: p.name,
    sort_order: p.order,
  }))
}

export async function createLocation(name: string): Promise<Location> {
  const p: Position = await createPosition(name)
  return {
    id: p.id,
    name: p.name,
    sort_order: p.order,
  }
}

export async function updateLocation(id: string, name: string): Promise<Location> {
  const p: Position = await updatePos(id, { name })
  return {
    id: p.id,
    name: p.name,
    sort_order: p.order,
  }
}

export async function deleteLocation(id: string): Promise<void> {
  await deletePosition(id)
}

export async function reorderLocations(items: ReorderItem[]): Promise<void> {
  await reorderPos(items.map((i) => ({ id: i.id, sort_order: i.sort_order })))
}
