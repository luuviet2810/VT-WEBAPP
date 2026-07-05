import { supabase } from '../lib/supabase'
import type { Notification, NotificationType } from '../types'

function mapRow(row: Record<string, unknown>): Notification {
  return {
    id: row.id as string,
    type: row.type as NotificationType,
    title: row.title as string,
    body: row.body as string,
    read: row.read as boolean,
    createdAt: row.created_at as string,
  }
}

export async function getNotifications(): Promise<Notification[]> {
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) throw error
  return (data as Record<string, unknown>[]).map(mapRow)
}

export async function getNotificationById(id: string): Promise<Notification | null> {
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('id', id)
    .single()

  if (error) {
    if (error.code === 'PGRST116') return null
    throw error
  }
  return mapRow(data as Record<string, unknown>)
}

export async function createNotification(
  notif: Omit<Notification, 'id' | 'read' | 'createdAt'>
): Promise<Notification> {
  const { data, error } = await supabase
    .from('notifications')
    .insert({
      type: notif.type,
      title: notif.title,
      body: notif.body,
      read: false,
    })
    .select()
    .single()

  if (error) throw error
  return mapRow(data as Record<string, unknown>)
}

export async function markNotificationRead(id: string): Promise<Notification> {
  const { data, error } = await supabase
    .from('notifications')
    .update({ read: true })
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return mapRow(data as Record<string, unknown>)
}

export async function markAllNotificationsRead(): Promise<void> {
  const { error } = await supabase
    .from('notifications')
    .update({ read: true })
    .eq('read', false)

  if (error) throw error
}

export async function deleteNotification(id: string): Promise<void> {
  const { error } = await supabase
    .from('notifications')
    .delete()
    .eq('id', id)

  if (error) throw error
}
