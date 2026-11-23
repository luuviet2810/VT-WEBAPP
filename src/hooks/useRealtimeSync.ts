/**
 * useRealtimeSync (Decoupled Mode)
 *
 * Supabase Realtime đã được tắt hoàn toàn.
 * Ứng dụng hoạt động trực tiếp qua Express REST API + Neon PostgreSQL.
 * Hook này được giữ lại dưới dạng no-op để đảm bảo tương thích các component hiện tại.
 */

export function useRealtimeSync(): void {
  // Supabase WebSocket connection is permanently eliminated.
  // Neon Realtime / SSE will be plugged here when activated.
}
