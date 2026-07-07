import { ChevronDown, GripHorizontal, X } from 'lucide-react'
import { ReactNode, useEffect, useRef, useState } from 'react'
import clsx from 'clsx'

export function Modal({
  open,
  onClose,
  title,
  subtitle,
  children,
  width = 'max-w-2xl',
}: {
  open: boolean
  onClose: () => void
  title: string
  subtitle?: ReactNode
  children: ReactNode
  width?: string
}) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    if (open) document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/50 backdrop-blur-sm p-0 sm:p-4">
      <div className={clsx('flex w-full flex-col bg-white shadow-xl sm:rounded-2xl max-h-[100dvh] sm:max-h-[min(90vh,900px)] sm:mt-4', width)}>
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-100 px-4 py-3 sm:px-5 sm:py-4 sm:rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="mt-0.5 sm:hidden">
              <GripHorizontal size={18} className="text-slate-300" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-900 sm:text-lg">{title}</h2>
              {subtitle && <div className="mt-0.5">{subtitle}</div>}
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 sm:rounded-xl">
            <X size={20} />
          </button>
        </div>
        <div className="h-[calc(100dvh-140px)] sm:h-[720px] min-h-[400px] overflow-y-auto px-4 pb-6 sm:px-5 sm:py-4">{children}</div>
      </div>
    </div>
  )
}

export function Badge({ children, tone = 'slate' }: { children: ReactNode; tone?: 'slate' | 'green' | 'orange' | 'red' | 'blue' | 'purple' }) {
  const tones: Record<string, string> = {
    slate: 'bg-slate-100 text-slate-600',
    green: 'bg-emerald-100 text-emerald-700',
    orange: 'bg-amber-100 text-amber-700',
    red: 'bg-red-100 text-red-600',
    blue: 'bg-brand-100 text-brand-700',
    purple: 'bg-violet-100 text-violet-700',
  }
  return <span className={clsx('inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium', tones[tone])}>{children}</span>
}

export function WheelPicker({
  value,
  onChange,
  min = 0,
  max = 100,
  unit = '',
}: {
  value: number
  onChange: (v: number) => void
  min?: number
  max?: number
  unit?: string
}) {
  const items = Array.from({ length: max - min + 1 }, (_, i) => min + i)
  const containerRef = useRef<HTMLDivElement>(null)
  const isScrolling = useRef(false)
  const scrollTimeout = useRef<number>()
  const lastValueRef = useRef(value)
  
  const ITEM_HEIGHT = 36
  const VISIBLE_COUNT = 5
  const PICKER_HEIGHT = ITEM_HEIGHT * VISIBLE_COUNT
  const PADDING = ITEM_HEIGHT * 2
  const CENTER_POSITION = PADDING + ITEM_HEIGHT / 2 // = 90 (center of picker)
  
  // Calculate which item is centered
  const selectedIndex = items.indexOf(value)
  
  // Sync scroll position when value changes externally
  // Formula: scrollTop = index * ITEM_HEIGHT
  // This centers item N at visual position PADDING (72px), which is center of highlight
  useEffect(() => {
    if (containerRef.current) {
      const targetScrollTop = selectedIndex * ITEM_HEIGHT
      containerRef.current.scrollTop = targetScrollTop
    }
    lastValueRef.current = value
  }, [value, selectedIndex, ITEM_HEIGHT])
  
  function handleScroll() {
    if (!containerRef.current) return
    
    if (scrollTimeout.current) {
      clearTimeout(scrollTimeout.current)
    }
    
    isScrolling.current = true
    
    scrollTimeout.current = window.setTimeout(() => {
      if (!containerRef.current) return
      
      const scrollTop = containerRef.current.scrollTop
      // Which item is at the center position?
      // Item visual top = index * ITEM_HEIGHT + PADDING - scrollTop
      // We want visual top = PADDING (72px)
      // So: index * ITEM_HEIGHT + PADDING - scrollTop = PADDING
      // Therefore: scrollTop = index * ITEM_HEIGHT
      const index = Math.round(scrollTop / ITEM_HEIGHT)
      const clampedIndex = Math.max(0, Math.min(items.length - 1, index))
      const newValue = items[clampedIndex]
      
      isScrolling.current = false
      
      if (newValue !== lastValueRef.current) {
        lastValueRef.current = newValue
        onChange(newValue)
      }
    }, 50)
  }
  
  function handleItemClick(index: number) {
    if (containerRef.current) {
      containerRef.current.scrollTo({ top: index * ITEM_HEIGHT, behavior: 'smooth' })
    }
    if (items[index] !== lastValueRef.current) {
      lastValueRef.current = items[index]
      onChange(items[index])
    }
  }

  return (
    <div 
      className="select-none relative overflow-hidden rounded-lg"
      style={{ height: PICKER_HEIGHT }}
    >
      {/* Fade gradient top */}
      <div 
        className="pointer-events-none absolute left-0 right-0 z-20"
        style={{ 
          top: 0, 
          height: PADDING,
          background: 'linear-gradient(to bottom, white 0%, rgba(255,255,255,0) 100%)',
        }}
      />
      
      {/* Fade gradient bottom */}
      <div 
        className="pointer-events-none absolute left-0 right-0 z-20"
        style={{ 
          bottom: 0, 
          height: PADDING,
          background: 'linear-gradient(to top, white 0%, rgba(255,255,255,0) 100%)',
        }}
      />
      
      {/* Selection highlight - FIXED at center */}
      <div 
        className="pointer-events-none absolute left-1 right-1 z-10 rounded-md border-y-2 border-brand-400 bg-brand-50/50"
        style={{ 
          top: PADDING,
          height: ITEM_HEIGHT,
        }}
      />
      
      {/* Scrollable container */}
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="h-full overflow-y-auto overscroll-none [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        style={{ paddingTop: PADDING }}
      >
        <div style={{ paddingBottom: PADDING }}>
          {items.map((item, index) => {
            const isSelected = item === value
            const distance = Math.abs(index - selectedIndex)
            
            return (
              <div
                key={item}
                onClick={() => handleItemClick(index)}
                className="flex cursor-pointer items-center justify-center"
                style={{
                  height: ITEM_HEIGHT,
                  color: isSelected ? '#111827' : '#94a3b8',
                  fontWeight: isSelected ? 700 : 500,
                  fontSize: isSelected ? 18 : 14,
                  opacity: distance === 0 ? 1 : distance === 1 ? 0.6 : distance === 2 ? 0.35 : 0.15,
                }}
              >
                {item}{unit}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export function Tabs({
  tabs,
  active,
  onChange,
}: {
  tabs: { key: string; label: string; icon?: ReactNode }[]
  active: string
  onChange: (key: string) => void
}) {
  return (
    <div className="flex gap-1 rounded-lg bg-slate-100 p-1 overflow-x-auto">
      {tabs.map((t) => (
        <button
          key={t.key}
          onClick={() => onChange(t.key)}
          className={clsx(
            'flex items-center gap-1.5 whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
            active === t.key ? 'bg-white text-brand-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'
          )}
        >
          {t.icon}
          {t.label}
        </button>
      ))}
    </div>
  )
}

export function EmptyState({ title, subtitle, icon }: { title: string; subtitle?: string; icon?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center py-14 text-center text-slate-400">
      {icon}
      <p className="mt-2 text-sm font-medium text-slate-500">{title}</p>
      {subtitle && <p className="text-xs text-slate-400 mt-1">{subtitle}</p>}
    </div>
  )
}

export function CollapsibleCard({
  title,
  subtitle,
  defaultOpen = true,
  children,
  badge,
}: {
  title: string
  subtitle?: string
  defaultOpen?: boolean
  children: ReactNode
  badge?: ReactNode
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="card overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between px-4 py-3.5 sm:px-5"
      >
        <div className="text-left">
          <div className="flex items-center gap-2">
            <span className="text-[15px] font-semibold text-slate-900">{title}</span>
            {badge}
          </div>
          {subtitle && <div className="text-xs text-slate-400 mt-0.5">{subtitle}</div>}
        </div>
        <ChevronDown size={18} className={clsx('shrink-0 text-slate-400 transition-transform', open && 'rotate-180')} />
      </button>
      {open && <div className="border-t border-slate-100 px-4 py-4 sm:px-5">{children}</div>}
    </div>
  )
}

export function SegButton({
  options,
  value,
  onChange,
}: {
  options: { value: string; label: string }[]
  value: string
  onChange: (v: string) => void
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={clsx(
            'rounded-lg border px-3 py-2 text-sm font-medium transition-colors',
            value === o.value
              ? 'border-brand-500 bg-brand-50 text-brand-700'
              : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

// ====== CONFIRM DIALOG ======

interface ConfirmDialogProps {
  open: boolean
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  variant?: 'default' | 'danger'
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Xác nhận',
  cancelLabel = 'Huỷ',
  variant = 'default',
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/40" onClick={onCancel} />
      <div className="relative z-10 w-full max-w-sm rounded-xl bg-white p-6 shadow-xl">
        <h3 className="text-base font-semibold text-gray-900">{title}</h3>
        <p className="mt-2 text-sm text-gray-600">{message}</p>
        <div className="mt-5 flex justify-end gap-2">
          <button className="btn-secondary text-sm" onClick={onCancel}>
            {cancelLabel}
          </button>
          <button
            className={`text-sm rounded-lg px-4 py-2 font-medium text-white transition-colors ${
              variant === 'danger'
                ? 'bg-red-500 hover:bg-red-600'
                : 'bg-brand-500 hover:bg-brand-600'
            }`}
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

// ====== BATTERY CHECK COMPONENT ======

interface BatteryCheckProps {
  soh: number
  soc: number
  pickerOpen: 'soh' | 'soc' | null
  onSOHChange: (v: number) => void
  onSOCChange: (v: number) => void
  onPickerOpen: (v: 'soh' | 'soc' | null) => void
}

export function BatteryCheck({ soh, soc, pickerOpen, onSOHChange, onSOCChange, onPickerOpen }: BatteryCheckProps) {
  const isNormal = soc >= 50

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
      <div className="mb-3 text-sm font-medium text-slate-700">Đo ắc quy</div>
      
      {/* SOH & SOC buttons */}
      <div className="grid grid-cols-2 gap-4">
        {/* SOH */}
        <div>
          <div className="mb-1 text-center text-xs text-slate-500">SOH</div>
          <button
            onClick={() => onPickerOpen('soh')}
            className="w-full rounded-lg border border-slate-200 bg-white py-3 text-center text-lg font-semibold text-slate-700 transition-colors hover:border-brand-300 hover:bg-brand-50 active:bg-brand-100"
          >
            {soh}%
          </button>
        </div>
        {/* SOC */}
        <div>
          <div className="mb-1 text-center text-xs text-slate-500">SOC</div>
          <button
            onClick={() => onPickerOpen('soc')}
            className="w-full rounded-lg border border-slate-200 bg-white py-3 text-center text-lg font-semibold text-slate-700 transition-colors hover:border-brand-300 hover:bg-brand-50 active:bg-brand-100"
          >
            {soc}%
          </button>
        </div>
      </div>

      {/* Wheel Picker Popup - SOH */}
      {pickerOpen === 'soh' && (
        <div className="relative mt-3">
          <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-lg">
            <div className="mb-2 text-center text-xs font-medium text-slate-500">SOH (%)</div>
            <WheelPicker
              value={soh}
              onChange={onSOHChange}
              min={0}
              max={100}
              unit="%"
            />
            <div className="mt-2 flex justify-center">
              <button
                onClick={() => onPickerOpen(null)}
                className="rounded-lg bg-brand-500 px-6 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-600 active:bg-brand-700"
              >
                Xong
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Wheel Picker Popup - SOC */}
      {pickerOpen === 'soc' && (
        <div className="relative mt-3">
          <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-lg">
            <div className="mb-2 text-center text-xs font-medium text-slate-500">SOC (%)</div>
            <WheelPicker
              value={soc}
              onChange={onSOCChange}
              min={0}
              max={100}
              unit="%"
            />
            <div className="mt-2 flex justify-center">
              <button
                onClick={() => onPickerOpen(null)}
                className="rounded-lg bg-brand-500 px-6 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-600 active:bg-brand-700"
              >
                Xong
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Status Badge */}
      <div className={`mt-3 flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium ${
        isNormal 
          ? 'bg-green-100 text-green-700' 
          : 'bg-amber-100 text-amber-700'
      }`}>
        {isNormal ? (
          <>
            <span className="h-2 w-2 rounded-full bg-green-500" />
            Bình thường
          </>
        ) : (
          <>
            <span className="h-2 w-2 rounded-full bg-amber-500" />
            Cần sạc
          </>
        )}
      </div>
    </div>
  )
}
