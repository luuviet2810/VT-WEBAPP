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

const imageIdToInfo = new Map<string, { vehicleId: string; url: string; isDoc: boolean }>()

function handleImageUpsert(vehicleId: string, imageId: string, url: string) {
  imageIdToInfo.set(imageId, { vehicleId, url, isDoc: false })
  useStore.setState((s) => {
    const idx = s.vehicles.findIndex((v) => v.id === vehicleId)
    if (idx < 0) return {}
    const vehicles = [...s.vehicles]
    const v = { ...vehicles[idx] }
    if (!v.images.includes(url)) {
      v.images = [...v.images, url]
    }
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
    const vehicles = [...s.vehicles]
    const v = { ...vehicles[idx] }
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
    const vehicles = [...s.vehicles]
    const v = { ...vehicles[idx] }
    if (!v.documents.includes(url)) {
      v.documents = [...v.documents, url]
    }
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
    const vehicles = [...s.vehicles]
    const v = { ...vehicles[idx] }
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
      upsertVehicleImage: (row) => {
        const r = row as { id: string; vehicle_id: string; url: string }
        handleImageUpsert(r.vehicle_id, r.id, r.url)
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
