import { useEffect, useState } from 'react'
import { Car, RefreshCw, Server, AlertCircle } from 'lucide-react'
import { initializeStore, useStore } from '../store/useStore'

export default function AppSkeleton({ message = 'Đang tải dữ liệu...' }: { message?: string }) {
  const [elapsed, setElapsed] = useState(0)
  const initError = useStore((s) => s.initError)
  const [retrying, setRetrying] = useState(false)

  useEffect(() => {
    const timer = setInterval(() => {
      setElapsed((prev) => prev + 1)
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  const handleRetry = async () => {
    setRetrying(true)
    setElapsed(0)
    try {
      await initializeStore()
    } finally {
      setRetrying(false)
    }
  }

  return (
    <div className="w-full space-y-6 animate-fade-in">
      {/* Cold start / status notice banner */}
      {initError ? (
        <div className="flex items-center justify-between rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <div className="flex items-center gap-2">
            <AlertCircle size={18} className="shrink-0 text-red-500" />
            <span>{initError}</span>
          </div>
          <button
            onClick={handleRetry}
            disabled={retrying}
            className="flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-red-700 disabled:opacity-50"
          >
            <RefreshCw size={13} className={retrying ? 'animate-spin' : ''} />
            Thử lại
          </button>
        </div>
      ) : elapsed >= 3 ? (
        <div className="flex items-center justify-between rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs sm:text-sm text-amber-800 shadow-xs">
          <div className="flex items-center gap-2.5">
            <Server size={17} className="shrink-0 text-amber-600 animate-pulse" />
            <span>
              {elapsed >= 25
                ? 'Máy chủ Render Free đang hoàn tất khởi động cold-start (~30s). Dữ liệu sắp hiển thị...'
                : 'Đang kết nối máy chủ VT AUTO. Vui lòng đợi trong giây lát...'}
            </span>
          </div>
          {elapsed >= 30 && (
            <button
              onClick={handleRetry}
              disabled={retrying}
              className="flex items-center gap-1 rounded-lg border border-amber-300 bg-white px-2.5 py-1 text-xs font-medium text-amber-800 hover:bg-amber-100"
            >
              <RefreshCw size={12} className={retrying ? 'animate-spin' : ''} />
              Thử lại
            </button>
          )}
        </div>
      ) : null}

      {/* Header Skeleton */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-7 w-44 animate-pulse rounded-lg bg-slate-200" />
          <div className="h-4 w-64 animate-pulse rounded bg-slate-200" />
        </div>
        <div className="hidden h-10 w-28 animate-pulse rounded-xl bg-slate-200 sm:block" />
      </div>

      {/* Search & Filter Bar Skeleton */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
        <div className="flex gap-3">
          <div className="h-11 flex-1 animate-pulse rounded-xl bg-slate-100" />
          <div className="h-11 w-11 animate-pulse rounded-xl bg-slate-100" />
          <div className="h-11 w-11 animate-pulse rounded-xl bg-slate-100" />
        </div>
      </div>

      {/* Vehicle Grid Skeleton (6 cards) */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
          <div key={i} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
            {/* Image Placeholder */}
            <div className="relative aspect-[4/2.5] w-full animate-pulse bg-slate-200/80 flex items-center justify-center">
              <Car size={28} className="text-slate-300/60" />
            </div>
            {/* Content Placeholders */}
            <div className="space-y-2.5 p-3">
              <div className="flex items-center justify-between gap-2">
                <div className="h-4 w-3/5 animate-pulse rounded bg-slate-200" />
                <div className="h-4 w-1/4 animate-pulse rounded bg-slate-200" />
              </div>
              <div className="h-3 w-1/2 animate-pulse rounded bg-slate-200/70" />
              <div className="h-4 w-2/5 animate-pulse rounded bg-slate-200 font-bold" />
              <div className="grid grid-cols-3 gap-1 pt-1 border-t border-slate-100">
                <div className="h-7 animate-pulse rounded bg-slate-100" />
                <div className="h-7 animate-pulse rounded bg-slate-100" />
                <div className="h-7 animate-pulse rounded bg-slate-100" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
