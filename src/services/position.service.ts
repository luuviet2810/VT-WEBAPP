import { supabase } from '../lib/supabase'
import type { Position } from '../types'

export async function getPositions(): Promise<Position[]> {
  const { data, error, status, statusText } = await supabase
    .from('positions')
    .select('*')
    .order('sort_order', { ascending: true })

  console.log('🔵 [position.service] getPositions()')
  console.log('   data:', JSON.stringify(data, null, 2))
  console.log('   error:', error)
  console.log('   status:', status)
  console.log('   statusText:', statusText)

  if (error) throw error
  return (data as Array<{
    id: string
    name: string
    sort_order: number
    created_at?: string
    updated_at?: string
  }>).map((row) => ({
    id: row.id,
    name: row.name,
    order: row.sort_order,
  }))
}

export async function getPositionById(id: string): Promise<Position | null> {
  const { data, error } = await supabase
    .from('positions')
    .select('*')
    .eq('id', id)
    .single()

  if (error) {
    if (error.code === 'PGRST116') return null
    throw error
  }
  const row = data as {
    id: string
    name: string
    sort_order: number
    created_at?: string
    updated_at?: string
  }
  return { id: row.id, name: row.name, order: row.sort_order }
}

export async function createPosition(name: string): Promise<Position> {
  const { data: existing, error: selectError } = await supabase
    .from('positions')
    .select('sort_order')
    .order('sort_order', { ascending: false })
    .limit(1)

  if (selectError) throw selectError

  const maxOrder = existing && existing.length > 0
    ? (existing[0] as { sort_order: number }).sort_order
    : -1

  const { data, error } = await supabase
    .from('positions')
    .insert({ name, sort_order: maxOrder + 1 })
    .select()
    .single()

  if (error) throw error

  const row = data as {
    id: string
    name: string
    sort_order: number
    created_at?: string
    updated_at?: string
  }
  return { id: row.id, name: row.name, order: row.sort_order }
}

export async function updatePosition(id: string, patch: Partial<Position>): Promise<Position> {
  const updateData: Record<string, unknown> = {}
  if (patch.name !== undefined) updateData.name = patch.name
  if (patch.order !== undefined) updateData.sort_order = patch.order

  updateData.updated_at = new Date().toISOString()

  const { data, error } = await supabase
    .from('positions')
    .update(updateData)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error

  const row = data as {
    id: string
    name: string
    sort_order: number
    created_at?: string
    updated_at?: string
  }
  return { id: row.id, name: row.name, order: row.sort_order }
}

export async function deletePosition(id: string): Promise<void> {
  const { error } = await supabase
    .from('positions')
    .delete()
    .eq('id', id)

  if (error) throw error
}

export async function reorderPositions(items: Array<{ id: string; sort_order: number }>): Promise<void> {
  const updates = items.map((item) => ({
    id: item.id,
    sort_order: item.sort_order,
  }))

  const { error } = await supabase
    .from('positions')
    .upsert(updates, { onConflict: 'id' })

  if (error) throw error
}
