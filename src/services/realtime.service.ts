/**
 * Realtime Service (Decoupled Mode)
 *
 * Supabase Realtime đã được vô hiệu hóa hoàn toàn khỏi ứng dụng.
 * Mọi thao tác cập nhật dữ liệu được thực hiện trực tiếp qua REST API (Express + Neon).
 */

import type {
  RealtimeChannels,
  RealtimeStoreActions,
} from '../types/realtime'

const CHANNELS: RealtimeChannels = {
  vehicles: null,
  tasks: null,
  positions: null,
  moveLogs: null,
  taskActivity: null,
  vehicleImages: null,
  vehicleDocs: null,
  notifications: null,
}

let isSubscribed = false

export function subscribe(_store: RealtimeStoreActions): void {
  // Permanently disabled — 0 WebSocket connections created
  isSubscribed = false
}

export function unsubscribe(): void {
  isSubscribed = false
}

export function isActive(): boolean {
  return isSubscribed
}

export function subscribeToNotifications(
  _userId: string,
  _onNotification: (notif: Record<string, unknown>) => void
): () => void {
  return () => {}
}
