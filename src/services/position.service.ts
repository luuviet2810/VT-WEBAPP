import { apiGet, apiPost, apiPut, apiDelete } from './api.client'
import type { Position } from '../types'

export async function getPositions(): Promise<Position[]> {
  const data = await apiGet<Position[]>('/api/positions')
  return (data || []).map((row) => ({
    id: row.id,
    name: row.name,
    order: (row as any).order ?? (row as any).sort_order ?? 0,
  }))
}

export async function getPositionById(id: string): Promise<Position | null> {
  try {
    const row = await apiGet<Position>(`/api/positions/${id}`)
    if (!row) return null
    return {
      id: row.id,
      name: row.name,
      order: (row as any).order ?? (row as any).sort_order ?? 0,
    }
  } catch (err: any) {
    if (err.statusCode === 404) return null
    throw err
  }
}

export async function createPosition(name: string): Promise<Position> {
  const row = await apiPost<Position>('/api/positions', { name })
  return {
    id: row.id,
    name: row.name,
    order: (row as any).order ?? (row as any).sort_order ?? 0,
  }
}

export async function updatePosition(id: string, patch: Partial<Position>): Promise<Position> {
  const row = await apiPut<Position>(`/api/positions/${id}`, patch)
  return {
    id: row.id,
    name: row.name,
    order: (row as any).order ?? (row as any).sort_order ?? 0,
  }
}

export async function deletePosition(id: string): Promise<void> {
  await apiDelete(`/api/positions/${id}`)
}

export async function reorderPositions(items: Array<{ id: string; sort_order: number }>): Promise<void> {
  await apiPut('/api/positions/reorder', { items })
}
