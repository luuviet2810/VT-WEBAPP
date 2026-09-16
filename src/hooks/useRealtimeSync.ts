/**
 * useRealtimeSync
 *
 * Subscribes to Supabase Realtime when the user is authenticated,
 * and automatically unsubscribes on logout.
 *
 * This is the ONLY place where realtime channels are managed.
 * Components read from Zustand, which is updated by this hook.
 */

import { useEffect } from 'react'
import { useAuthStore } from '../store/useAuthStore'
import { subscribe, unsubscribe, isActive } from '../services/realtime.service'
import { useStore } from '../store/useStore'
import type { RealtimeStoreActions } from '../types/realtime'

// ---- Image/doc URL tracking for DELETE events ----
// Supabase DELETE payload only has { id }. We need to know the URL and vehicle
// to remove it from the vehicle's images/documents arrays.

const imageIdToInfo = new Map<string, { vehicleId: string; url: string; isDoc: boolean; category?: string }>()

function handleImageUpsert(vehicleId: string, imageId: string, url: string, category?: string, thumbnail?: string | null) {
  imageIdToInfo.set(imageId, { vehicleId, url, isDoc: false, category })
  // Only 'vehicle' category images go into vehicle.images (for cover/thumbnail)
  if (category && category !== 'vehicle') return
  useStore.setState((s) => {
    const idx = s.vehicles.findIndex((v) => v.id === vehicleId)
    if (idx < 0) return {}
    const current = s.vehicles[idx]
    const hasUrl = current.images.includes(url)
    const needsThumb = !!thumbnail && current.thumbnails?.[url] !== thumbnail
    // No-op guard: realtime echoes of our own optimistic updates (INSERT after
    // updateVehicle, sort_order UPDATEs when reordering) must NOT create new
    // references — otherwise every subscriber of s.vehicles re-renders and
    // image tiles flicker on each echo.
    if (hasUrl && !needsThumb) return {}
    const vehicles = [...s.vehicles]
    const v = { ...current }
    if (!hasUrl) v.images = [...v.images, url]
    if (needsThumb) v.thumbnails = { ...v.thumbnails, [url]: thumbnail! }
    vehicles[idx] = v
    return { vehicles }
  })
}

function handleImageDelete(imageId: string) {
  const info = imageIdToInfo.get(imageId)
  if (!info || info.isDoc) return
  imageIdToInfo.delete(imageId)
  useStore.setState((s) => {
    const idx = s.vehicles.findIndex((v) => v.id === info.vehicleId)
    if (idx < 0) return {}
    const current = s.vehicles[idx]
    // No-op guard: URL already removed locally (optimistic delete) — don't churn references
    if (!current.images.includes(info.url)) return {}
    const vehicles = [...s.vehicles]
    const v = { ...current }
    v.images = v.images.filter((u) => u !== info.url)
    vehicles[idx] = v
    return { vehicles }
  })
}

function handleDocUpsert(vehicleId: string, docId: string, url: string) {
  imageIdToInfo.set(docId, { vehicleId, url, isDoc: true })
  useStore.setState((s) => {
    const idx = s.vehicles.findIndex((v) => v.id === vehicleId)
    if (idx < 0) return {}
    const current = s.vehicles[idx]
    // No-op guard: echo of an optimistic update — nothing changed
    if (current.documents.includes(url)) return {}
    const vehicles = [...s.vehicles]
    const v = { ...current }
    v.documents = [...v.documents, url]
    vehicles[idx] = v
    return { vehicles }
  })
}

function handleDocDelete(docId: string) {
  const info = imageIdToInfo.get(docId)
  if (!info || !info.isDoc) return
  imageIdToInfo.delete(docId)
  useStore.setState((s) => {
    const idx = s.vehicles.findIndex((v) => v.id === info.vehicleId)
    if (idx < 0) return {}
    const current = s.vehicles[idx]
    if (!current.documents.includes(info.url)) return {}
    const vehicles = [...s.vehicles]
    const v = { ...current }
    v.documents = v.documents.filter((u) => u !== info.url)
    vehicles[idx] = v
    return { vehicles }
  })
}

// ---- Hook ----

export function useRealtimeSync(): void {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)

  useEffect(() => {
    if (!isAuthenticated) {
      if (isActive()) {
        unsubscribe()
      }
      // Clear tracking map on logout
      imageIdToInfo.clear()
      return
    }

    if (isActive()) return // already subscribed

    const storeActions: RealtimeStoreActions = {
      upsertVehicle: (row) => useStore.getState().upsertVehicleFromRealtime(row),
      deleteVehicle: (id) => useStore.getState().deleteVehicle(id),
      upsertTask: (row) => useStore.getState().upsertTaskFromRealtime(row),
      deleteTask: (id) => useStore.getState().deleteTask(id),
      upsertPosition: (row) => useStore.getState().upsertPositionFromRealtime(row),
      deletePosition: (id) => useStore.getState().deletePosition(id),
      upsertMoveLog: (row) => useStore.getState().upsertMoveLogFromRealtime(row),
      upsertTaskActivity: (row) => useStore.getState().upsertTaskActivityFromRealtime(row),
      upsertNotification: (row) => useStore.getState().upsertNotificationFromRealtime(row),
      deleteNotification: (id) => {
        const { notifications } = useStore.getState()
        const filtered = notifications.filter((n) => n.id !== id)
        if (filtered.length < notifications.length) {
          useStore.setState({ notifications: filtered })
        }
      },
      upsertVehicleImage: (row) => {
        const r = row as { id: string; vehicle_id: string; url: string; category?: string; thumbnail?: string | null }
        handleImageUpsert(r.vehicle_id, r.id, r.url, r.category, r.thumbnail)
      },
      deleteVehicleImage: (id) => handleImageDelete(id),
      upsertVehicleDoc: (row) => {
        const r = row as { id: string; vehicle_id: string; url: string }
        handleDocUpsert(r.vehicle_id, r.id, r.url)
      },
      deleteVehicleDoc: (id) => handleDocDelete(id),
      reloadVehicleTimeline: (vehicleId) => useStore.getState().loadVehicleTimeline(vehicleId),
    }

    subscribe(storeActions)
  }, [isAuthenticated])
}
