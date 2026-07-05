import { supabase } from '../lib/supabase'

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
  const { data, error } = await supabase
    .from('locations')
    .select('*')
    .order('sort_order', { ascending: true })

  if (error) throw error
  return data as Location[]
}

export async function createLocation(name: string): Promise<Location> {
  const { data: existing, error: selectError } = await supabase
    .from('locations')
    .select('sort_order')
    .order('sort_order', { ascending: false })
    .limit(1)

  if (selectError) throw selectError

  const maxSortOrder = existing && existing.length > 0 ? (existing[0] as { sort_order: number }).sort_order : 0
  const newSortOrder = maxSortOrder + 1

  const { data, error } = await supabase
    .from('locations')
    .insert({ name, sort_order: newSortOrder })
    .select()
    .single()

  if (error) throw error
  return data as Location
}

export async function updateLocation(id: string, name: string): Promise<Location> {
  const { data, error } = await supabase
    .from('locations')
    .update({ name, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data as Location
}

export async function deleteLocation(id: string): Promise<void> {
  const { error } = await supabase
    .from('locations')
    .delete()
    .eq('id', id)

  if (error) throw error
}

export async function reorderLocations(items: ReorderItem[]): Promise<void> {
  const updates = items.map((item) => ({
    id: item.id,
    sort_order: item.sort_order,
  }))

  const { error } = await supabase
    .from('locations')
    .upsert(updates, { onConflict: 'id' })

  if (error) throw error
}
