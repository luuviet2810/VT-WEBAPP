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
        <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-6 sm:px-5 sm:py-4">{children}</div>
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
  const isDragging = useRef(false)
  const lastTouchY = useRef(0)
  const velocity = useRef(0)
  const lastMoveTime = useRef(0)
  const lastMoveY = useRef(0)
  const animationRef = useRef<number>()
  const currentOffset = useRef(0)
  
  const ITEM_HEIGHT = 32
  const VISIBLE_ITEMS = 5
  const CONTAINER_HEIGHT = ITEM_HEIGHT * VISIBLE_ITEMS
  const PADDING = ITEM_HEIGHT * 2

  // Current selected index
  const selectedIndex = items.indexOf(value)
  
  // Calculate visual transform for each item
  function getItemStyle(index: number, currentIdx: number) {
    const offset = index - currentIdx
    const translateY = offset * ITEM_HEIGHT
    const absOffset = Math.abs(offset)
    
    // 3D perspective effect
    const scale = Math.max(0.7, 1 - absOffset * 0.1)
    const opacity = Math.max(0.3, 1 - absOffset * 0.2)
    const zIndex = 50 - absOffset
    
    // Slight tilt
    const rotateX = offset * -8
    
    return {
      transform: `translateY(${translateY}px) scale(${scale}) rotateX(${rotateX}deg)`,
      opacity,
      zIndex,
    }
  }

  // Scroll to index with animation
  function scrollToIndex(targetIndex: number, animated = true) {
    const container = containerRef.current
    if (!container) return
    
    const clampedIndex = Math.max(0, Math.min(items.length - 1, targetIndex))
    const targetScrollTop = clampedIndex * ITEM_HEIGHT
    
    if (animated) {
      const startScrollTop = container.scrollTop
      const startTime = performance.now()
      const duration = 200
      
      function animate(currentTime: number) {
        if (!container) return
        const elapsed = currentTime - startTime
        const progress = Math.min(elapsed / duration, 1)
        // Ease out cubic
        const eased = 1 - Math.pow(1 - progress, 3)
        
        container.scrollTop = startScrollTop + (targetScrollTop - startScrollTop) * eased
        
        if (progress < 1) {
          animationRef.current = requestAnimationFrame(animate)
        } else {
          // Snap to exact position
          container.scrollTop = targetScrollTop
          currentOffset.current = targetScrollTop
          const newValue = items[clampedIndex]
          if (onChange && newValue !== value) {
            onChange(newValue)
          }
        }
      }
      
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
      animationRef.current = requestAnimationFrame(animate)
    } else {
      container.scrollTop = targetScrollTop
      currentOffset.current = targetScrollTop
    }
  }

  // Wheel event (mouse scroll)
  function handleWheel(e: React.WheelEvent) {
    e.preventDefault()
    e.stopPropagation()
    
    const container = containerRef.current
    if (!container) return
    
    const delta = e.deltaY > 0 ? 1 : -1
    const newIndex = Math.max(0, Math.min(items.length - 1, selectedIndex + delta))
    
    scrollToIndex(newIndex)
  }

  // Touch events for mobile swipe
  function handleTouchStart(e: React.TouchEvent) {
    e.preventDefault()
    isDragging.current = true
    lastTouchY.current = e.touches[0].clientY
    lastMoveTime.current = performance.now()
    lastMoveY.current = e.touches[0].clientY
    velocity.current = 0
    
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current)
    }
  }

  function handleTouchMove(e: React.TouchEvent) {
    if (!isDragging.current) return
    e.preventDefault()
    
    const container = containerRef.current
    if (!container) return
    
    const currentY = e.touches[0].clientY
    const deltaY = lastTouchY.current - currentY
    
    // Calculate velocity
    const now = performance.now()
    const dt = now - lastMoveTime.current
    if (dt > 0) {
      velocity.current = (lastMoveY.current - currentY) / dt
    }
    
    lastTouchY.current = currentY
    lastMoveTime.current = now
    lastMoveY.current = currentY
    
    // Apply scroll with resistance
    container.scrollTop += deltaY
    currentOffset.current = container.scrollTop
  }

  function handleTouchEnd() {
    isDragging.current = false
    
    const container = containerRef.current
    if (!container) return
    
    // Momentum scrolling
    const momentum = velocity.current * 150
    let targetScrollTop = container.scrollTop + momentum
    
    // Snap to nearest item
    const nearestIndex = Math.round(targetScrollTop / ITEM_HEIGHT)
    const clampedIndex = Math.max(0, Math.min(items.length - 1, nearestIndex))
    
    scrollToIndex(clampedIndex)
  }

  // Click to select
  function handleClick(index: number) {
    scrollToIndex(index)
  }

  // Handle scroll event (for manual scrolling)
  function handleScroll() {
    const container = containerRef.current
    if (!container || isDragging.current) return
    
    currentOffset.current = container.scrollTop
    const nearestIndex = Math.round(container.scrollTop / ITEM_HEIGHT)
    const clampedIndex = Math.max(0, Math.min(items.length - 1, nearestIndex))
    const newValue = items[clampedIndex]
    
    if (onChange && newValue !== value) {
      onChange(newValue)
    }
  }

  return (
    <div className="relative">
      {/* Center highlight indicator */}
      <div className="pointer-events-none absolute inset-x-0 top-1/2 z-10 flex -translate-y-1/2 justify-center">
        <div className="h-8 w-full rounded-lg border border-brand-300/50 bg-brand-50/30 backdrop-blur-sm" />
      </div>
      
      {/* Top fade */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-8 bg-gradient-to-b from-white to-transparent" />
      
      {/* Bottom fade */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-8 bg-gradient-to-t from-white to-transparent" />
      
      {/* Scrolling container */}
      <div
        ref={containerRef}
        onWheel={handleWheel}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onScroll={handleScroll}
        className="relative overflow-y-auto oversccontain-none [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        style={{ 
          height: CONTAINER_HEIGHT,
          perspective: '500px',
          perspectiveOrigin: 'center center',
        }}
      >
        {/* Content wrapper for centering */}
        <div 
          className="relative"
          style={{ height: PADDING + items.length * ITEM_HEIGHT + PADDING }}
        >
          {items.map((item, index) => {
            const currentIdx = value !== undefined ? items.indexOf(value) : 0
            const style = getItemStyle(index, currentIdx)
            const isSelected = item === value
            
            return (
              <div
                key={item}
                onClick={() => handleClick(index)}
                className={clsx(
                  'absolute left-0 right-0 flex cursor-pointer items-center justify-center transition-all duration-100',
                  isSelected ? 'font-bold' : 'font-medium'
                )}
                style={{
                  top: PADDING + index * ITEM_HEIGHT,
                  height: ITEM_HEIGHT,
                  ...style,
                }}
              >
                <span className={clsx(
                  'tabular-nums transition-colors',
                  isSelected ? 'text-brand-600' : 'text-slate-400'
                )}>
                  {item}{unit}
                </span>
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
