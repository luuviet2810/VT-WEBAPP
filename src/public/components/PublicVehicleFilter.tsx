import React, { useState, useEffect, useMemo, useRef, useImperativeHandle, forwardRef } from 'react'
import { Search, SlidersHorizontal, RotateCcw, X } from 'lucide-react'
import type { PublicVehicle } from '../publicApi'
import { formatKRW, fuelLabel } from '../format'

/** Chuẩn hóa chuỗi tìm kiếm tiếng Việt & tiếng Anh, loại bỏ dấu và ký tự đặc biệt */
export function normalizeText(str?: string | null): string {
  if (!str) return ''
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[đĐ]/g, 'd')
    .trim()
}

export interface PublicFilterValues {
  query: string
  brand: string // brand key (lowercase)
  model: string // model name
  minPrice: number
  maxPrice: number
}

export interface PublicVehicleFilterRef {
  reset: () => void
}

interface PublicVehicleFilterProps {
  vehicles: PublicVehicle[]
  onFilteredChange: (filtered: PublicVehicle[], hasActiveFilters: boolean) => void
  totalCount: number
}

export const PublicVehicleFilter = forwardRef<PublicVehicleFilterRef, PublicVehicleFilterProps>(
  function PublicVehicleFilter({ vehicles, onFilteredChange, totalCount }, ref) {
    // 1. Tính toán dải giá động (steps) từ danh sách xe công khai
    const { minBound, maxBound, steps } = useMemo(() => {
      const validPrices = vehicles
        .map((v) => v.sellPrice)
        .filter((p): p is number => typeof p === 'number' && !isNaN(p) && p > 0)

      if (validPrices.length === 0) {
        const fallback = [0, 5000000, 10000000, 15000000, 20000000]
        return { minBound: 0, maxBound: 20000000, steps: fallback }
      }

      const rawMin = Math.min(...validPrices)
      const rawMax = Math.max(...validPrices)

      // Bước nhảy 500.000 ₩ (50 vạn won)
      const stepSize = 500000
      const floorMin = Math.floor(rawMin / stepSize) * stepSize
      const ceilMax = Math.ceil(rawMax / stepSize) * stepSize

      const s: number[] = []
      for (let p = floorMin; p <= ceilMax; p += stepSize) {
        s.push(p)
      }
      if (s.length === 1) {
        s.push(s[0] + stepSize)
      }

      return {
        minBound: s[0],
        maxBound: s[s.length - 1],
        steps: s,
      }
    }, [vehicles])

    const totalSteps = steps.length - 1

    // State bộ lọc
    const [searchInput, setSearchInput] = useState('')
    const [debouncedQuery, setDebouncedQuery] = useState('')
    const [selectedBrand, setSelectedBrand] = useState<string>('')
    const [selectedModel, setSelectedModel] = useState<string>('')
    const [minStepIdx, setMinStepIdx] = useState<number>(0)
    const [maxStepIdx, setMaxStepIdx] = useState<number>(totalSteps)
    const [isOpen, setIsOpen] = useState(false)

    // Cập nhật maxStepIdx khi steps thay đổi
    useEffect(() => {
      setMaxStepIdx(totalSteps)
      setMinStepIdx(0)
    }, [totalSteps])

    // Debounce tìm kiếm 200ms
    useEffect(() => {
      const timer = setTimeout(() => {
        setDebouncedQuery(searchInput)
      }, 200)
      return () => clearTimeout(timer)
    }, [searchInput])

    // Danh sách Brand DISTINCT động từ xe công khai
    const brandOptions = useMemo(() => {
      const map = new Map<string, { label: string; count: number }>()
      for (const v of vehicles) {
        const raw = v.brand?.trim()
        if (!raw) continue
        const key = raw.toLowerCase()
        const existing = map.get(key)
        if (existing) {
          existing.count += 1
        } else {
          // Chuẩn hóa nhãn hiển thị: viết hoa từ 3 ký tự trở xuống (e.g. KIA, BMW), viết hoa chữ đầu nếu dài hơn
          const label = raw.length <= 3 ? raw.toUpperCase() : raw.charAt(0).toUpperCase() + raw.slice(1)
          map.set(key, { label, count: 1 })
        }
      }
      return Array.from(map.entries())
        .map(([key, data]) => ({ key, label: data.label, count: data.count }))
        .sort((a, b) => a.label.localeCompare(b.label, 'vi'))
    }, [vehicles])

    // Danh sách Model DISTINCT động (phụ thuộc vào Brand được chọn)
    const modelOptions = useMemo(() => {
      const map = new Map<string, number>()
      for (const v of vehicles) {
        if (!v.model?.trim()) continue
        if (selectedBrand) {
          if (v.brand?.trim().toLowerCase() !== selectedBrand) {
            continue
          }
        }
        const m = v.model.trim()
        map.set(m, (map.get(m) || 0) + 1)
      }
      return Array.from(map.entries())
        .map(([model, count]) => ({ model, count }))
        .sort((a, b) => a.model.localeCompare(b.model, 'vi'))
    }, [vehicles, selectedBrand])

    // Tự động reset Model nếu Model hiện tại không thuộc Brand mới chọn
    useEffect(() => {
      if (selectedModel && !modelOptions.some((m) => m.model === selectedModel)) {
        setSelectedModel('')
      }
    }, [selectedBrand, modelOptions, selectedModel])

    // Kiểm tra trạng thái bộ lọc có đang hoạt động hay không
    const isPriceFiltered = minStepIdx > 0 || maxStepIdx < totalSteps
    const hasActiveFilters = Boolean(
      debouncedQuery.trim() || selectedBrand || selectedModel || isPriceFiltered
    )

    // Đếm số lượng tiêu chí lọc đang bật (để hiển thị badge trên nút Bộ lọc)
    const activeFilterCount = [
      Boolean(selectedBrand),
      Boolean(selectedModel),
      isPriceFiltered,
    ].filter(Boolean).length

    // Hàm reset toàn bộ bộ lọc
    const handleReset = () => {
      setSearchInput('')
      setDebouncedQuery('')
      setSelectedBrand('')
      setSelectedModel('')
      setMinStepIdx(0)
      setMaxStepIdx(totalSteps)
    }

    // Expose reset ra ref ngoài (cho Empty State gọi)
    useImperativeHandle(ref, () => ({
      reset: handleReset,
    }))

    // Lọc dữ liệu kết hợp AND (Search + Brand + Model + Price)
    useEffect(() => {
      const q = normalizeText(debouncedQuery)
      const qTokens = q.split(/\s+/).filter(Boolean)

      const filtered = vehicles.filter((v) => {
        // 1. Kiểm tra Tìm kiếm (Search)
        if (qTokens.length > 0) {
          const fullText = normalizeText(
            [
              v.model,
              v.brand,
              v.year != null ? String(v.year) : '',
              v.fuelType,
              fuelLabel(v.fuelType),
              v.color,
            ]
              .filter(Boolean)
              .join(' ')
          )
          const matches = qTokens.every((token) => fullText.includes(token))
          if (!matches) return false
        }

        // 2. Kiểm tra Hãng xe (Brand)
        if (selectedBrand) {
          if (v.brand?.trim().toLowerCase() !== selectedBrand) {
            return false
          }
        }

        // 3. Kiểm tra Dòng xe (Model)
        if (selectedModel) {
          if (v.model?.trim() !== selectedModel) {
            return false
          }
        }

        // 4. Kiểm tra Khoảng giá (Price)
        if (isPriceFiltered) {
          if (v.sellPrice == null || v.sellPrice <= 0) {
            return false
          }
          const minP = steps[minStepIdx]
          const maxP = steps[maxStepIdx]
          if (v.sellPrice < minP || v.sellPrice > maxP) {
            return false
          }
        }

        return true
      })

      onFilteredChange(filtered, hasActiveFilters)
    }, [
      vehicles,
      debouncedQuery,
      selectedBrand,
      selectedModel,
      minStepIdx,
      maxStepIdx,
      isPriceFiltered,
      steps,
      hasActiveFilters,
      onFilteredChange,
    ])

    const selectedBrandLabel = useMemo(() => {
      return brandOptions.find((b) => b.key === selectedBrand)?.label || ''
    }, [brandOptions, selectedBrand])

    const leftPercent = totalSteps > 0 ? (minStepIdx / totalSteps) * 100 : 0
    const widthPercent = totalSteps > 0 ? ((maxStepIdx - minStepIdx) / totalSteps) * 100 : 100

    return (
      <div className="mb-5 space-y-2.5">
        {/* THANH TÌM KIẾM CHÍNH + NÚT BẬT/TẮT BỘ LỌC */}
        <div className="flex items-center gap-2">
          {/* Ô TÌM KIẾM */}
          <div className="relative flex-1">
            <Search
              size={18}
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Tìm tên xe, hãng xe, dòng xe..."
              className="h-11 w-full rounded-2xl border border-slate-200 bg-white pl-10 pr-9 text-sm text-slate-900 placeholder-slate-400 shadow-sm transition-all focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100 sm:h-12 sm:text-base"
            />
            {searchInput && (
              <button
                type="button"
                onClick={() => {
                  setSearchInput('')
                  setDebouncedQuery('')
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                title="Xóa tìm kiếm"
              >
                <X size={15} />
              </button>
            )}
          </div>

          {/* NÚT BỘ LỌC CHI TIẾT (Mobile-first toggle button) */}
          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className={`relative flex h-11 shrink-0 items-center gap-1.5 rounded-2xl border px-3.5 text-xs font-semibold transition-all sm:h-12 sm:px-4 sm:text-sm ${
              isOpen || activeFilterCount > 0
                ? 'border-brand-500 bg-brand-50 text-brand-700 shadow-sm'
                : 'border-slate-200 bg-white text-slate-600 shadow-sm hover:border-slate-300 hover:bg-slate-50'
            }`}
            title="Bộ lọc nâng cao"
          >
            <SlidersHorizontal size={16} />
            <span className="hidden xs:inline">Bộ lọc</span>
            {activeFilterCount > 0 && (
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand-600 text-[10px] font-bold text-white">
                {activeFilterCount}
              </span>
            )}
          </button>
        </div>

        {/* ACTIVE FILTER PILLS / TAGS (Hiển thị các tiêu chí đang lọc) */}
        {hasActiveFilters && (
          <div className="flex flex-wrap items-center gap-1.5 pt-0.5 text-xs">
            {debouncedQuery.trim() && (
              <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-slate-700 shadow-xs">
                <span>Từ khóa: <strong>{debouncedQuery.trim()}</strong></span>
                <button
                  type="button"
                  onClick={() => {
                    setSearchInput('')
                    setDebouncedQuery('')
                  }}
                  className="rounded-full p-0.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                >
                  <X size={12} />
                </button>
              </span>
            )}

            {selectedBrand && (
              <span className="inline-flex items-center gap-1 rounded-full border border-brand-200 bg-brand-50 px-2.5 py-1 text-brand-700 shadow-xs">
                <span>Hãng: <strong>{selectedBrandLabel}</strong></span>
                <button
                  type="button"
                  onClick={() => setSelectedBrand('')}
                  className="rounded-full p-0.5 text-brand-500 hover:bg-brand-100 hover:text-brand-800"
                >
                  <X size={12} />
                </button>
              </span>
            )}

            {selectedModel && (
              <span className="inline-flex items-center gap-1 rounded-full border border-brand-200 bg-brand-50 px-2.5 py-1 text-brand-700 shadow-xs">
                <span>Dòng: <strong>{selectedModel}</strong></span>
                <button
                  type="button"
                  onClick={() => setSelectedModel('')}
                  className="rounded-full p-0.5 text-brand-500 hover:bg-brand-100 hover:text-brand-800"
                >
                  <X size={12} />
                </button>
              </span>
            )}

            {isPriceFiltered && (
              <span className="inline-flex items-center gap-1 rounded-full border border-brand-200 bg-brand-50 px-2.5 py-1 text-brand-700 shadow-xs">
                <span>
                  Giá: <strong>{formatKRW(steps[minStepIdx])}</strong> - <strong>{formatKRW(steps[maxStepIdx])}</strong>
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setMinStepIdx(0)
                    setMaxStepIdx(totalSteps)
                  }}
                  className="rounded-full p-0.5 text-brand-500 hover:bg-brand-100 hover:text-brand-800"
                >
                  <X size={12} />
                </button>
              </span>
            )}

            <button
              type="button"
              onClick={handleReset}
              className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-slate-500 hover:text-rose-600 transition-colors"
            >
              <RotateCcw size={12} />
              <span>Xóa tất cả</span>
            </button>
          </div>
        )}

        {/* BỘ LỌC MỞ RỘNG (Collapsible Accordion Panel) */}
        {isOpen && (
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm space-y-4 animate-fade-in sm:p-5">
            {/* ROW 1: CHỌN HÃNG XE VÀ DÒNG XE */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
              {/* DROPDOWN HÃNG XE */}
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                  Hãng xe
                </label>
                <select
                  value={selectedBrand}
                  onChange={(e) => setSelectedBrand(e.target.value)}
                  className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800 transition-colors focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                >
                  <option value="">Tất cả hãng xe</option>
                  {brandOptions.map((b) => (
                    <option key={b.key} value={b.key}>
                      {b.label} ({b.count})
                    </option>
                  ))}
                </select>
              </div>

              {/* DROPDOWN DÒNG XE */}
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                  Dòng xe
                </label>
                <select
                  value={selectedModel}
                  onChange={(e) => setSelectedModel(e.target.value)}
                  className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800 transition-colors focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                >
                  <option value="">Tất cả dòng xe</option>
                  {modelOptions.map((m) => (
                    <option key={m.model} value={m.model}>
                      {m.model} ({m.count})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* ROW 2: KHOẢNG GIÁ VỚI THANH TRƯỢT 2 ĐẦU (DUAL-HANDLE SLIDER) */}
            <div className="pt-1">
              <div className="mb-2 flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-700">
                  Khoảng giá
                </label>
                <span className="text-xs font-bold text-brand-600">
                  {formatKRW(steps[minStepIdx])} — {formatKRW(steps[maxStepIdx])}
                </span>
              </div>

              {/* SLIDER DUAL-HANDLE TRACK */}
              <div className="relative my-3 h-6">
                {/* Track nền xám */}
                <div className="absolute top-1/2 h-1.5 w-full -translate-y-1/2 rounded-full bg-slate-200" />
                {/* Track dải giá đã chọn màu brand */}
                <div
                  className="absolute top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-brand-500 transition-all duration-75"
                  style={{
                    left: `${leftPercent}%`,
                    width: `${widthPercent}%`,
                  }}
                />

                {/* Input Slider Min */}
                <input
                  type="range"
                  min={0}
                  max={totalSteps}
                  step={1}
                  value={minStepIdx}
                  onChange={(e) => {
                    const val = Number(e.target.value)
                    if (val <= maxStepIdx) {
                      setMinStepIdx(val)
                    }
                  }}
                  className={`pointer-events-none absolute inset-0 h-full w-full appearance-none bg-transparent ${
                    minStepIdx === maxStepIdx && minStepIdx === totalSteps ? 'z-30' : 'z-10'
                  } [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-brand-500 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:cursor-pointer [&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-brand-500 [&::-moz-range-thumb]:bg-white [&::-moz-range-thumb]:shadow-md [&::-moz-range-thumb]:cursor-pointer`}
                />

                {/* Input Slider Max */}
                <input
                  type="range"
                  min={0}
                  max={totalSteps}
                  step={1}
                  value={maxStepIdx}
                  onChange={(e) => {
                    const val = Number(e.target.value)
                    if (val >= minStepIdx) {
                      setMaxStepIdx(val)
                    }
                  }}
                  className={`pointer-events-none absolute inset-0 h-full w-full appearance-none bg-transparent ${
                    minStepIdx === maxStepIdx && maxStepIdx === 0 ? 'z-30' : 'z-20'
                  } [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-brand-500 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:cursor-pointer [&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-brand-500 [&::-moz-range-thumb]:bg-white [&::-moz-range-thumb]:shadow-md [&::-moz-range-thumb]:cursor-pointer`}
                />
              </div>

              {/* Nhãn biên Min / Max */}
              <div className="flex items-center justify-between text-[11px] text-slate-400">
                <span>{formatKRW(minBound)}</span>
                <span>{formatKRW(maxBound)}</span>
              </div>
            </div>

            {/* ROW 3: FOOTER NÚT BẤM (Đặt lại & Đóng) */}
            <div className="flex items-center justify-between border-t border-slate-100 pt-3">
              <button
                type="button"
                onClick={handleReset}
                disabled={!hasActiveFilters}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-brand-600 disabled:opacity-40 disabled:hover:text-slate-500"
              >
                <RotateCcw size={14} />
                <span>Đặt lại bộ lọc</span>
              </button>

              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="rounded-xl bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-200 transition-colors"
              >
                Đóng
              </button>
            </div>
          </div>
        )}
      </div>
    )
  }
)

export default PublicVehicleFilter
