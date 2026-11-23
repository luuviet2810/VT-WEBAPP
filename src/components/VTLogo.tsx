import React from 'react'
import logoSrc from '../assets/logo-vtauto.png'

export type VTLogoSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'custom'
export type VTLogoVariant = 'light' | 'dark' | 'auto'
export type VTLogoAlign = 'left' | 'center' | 'right'

export interface VTLogoProps extends Omit<React.ImgHTMLAttributes<HTMLImageElement>, 'src' | 'size'> {
  size?: VTLogoSize
  variant?: VTLogoVariant
  align?: VTLogoAlign
  priority?: boolean
}

const SIZE_CLASSES: Record<Exclude<VTLogoSize, 'custom'>, string> = {
  xs: 'h-6 sm:h-7',
  sm: 'h-7 sm:h-8',
  md: 'h-9 sm:h-10',
  lg: 'h-11 sm:h-14',
  xl: 'h-14 sm:h-16',
}

const VARIANT_CLASSES: Record<VTLogoVariant, string> = {
  light: '',
  dark: 'drop-shadow-[0_1px_3px_rgba(255,255,255,0.7)]',
  auto: 'dark:drop-shadow-[0_1px_3px_rgba(255,255,255,0.7)]',
}

const ALIGN_CLASSES: Record<VTLogoAlign, string> = {
  left: 'object-left mr-auto',
  center: 'object-center mx-auto',
  right: 'object-right ml-auto',
}

/**
 * VTLogo — Component hiển thị logo chính thức VT AUTO
 * - Giữ nguyên tỷ lệ chuẩn của logo (~3.4:1), không bị méo (object-contain, w-auto)
 * - Nền trong suốt tự nhiên, không khung viền thừa
 * - Hỗ trợ các kích thước chuẩn và xử lý hiển thị trên nền tối qua variant="dark"
 */
export const VTLogo: React.FC<VTLogoProps> = ({
  size = 'md',
  variant = 'auto',
  align = 'center',
  priority = false,
  className = '',
  alt = 'VT AUTO',
  draggable = false,
  ...rest
}) => {
  const sizeClass = size === 'custom' ? '' : SIZE_CLASSES[size]
  const variantClass = VARIANT_CLASSES[variant] || ''
  const alignClass = ALIGN_CLASSES[align] || ''

  return (
    <img
      src={logoSrc}
      alt={alt}
      draggable={draggable}
      loading={priority ? 'eager' : 'lazy'}
      decoding="async"
      className={`select-none object-contain w-auto max-w-full ${sizeClass} ${variantClass} ${alignClass} ${className}`.trim()}
      {...rest}
    />
  )
}

export default VTLogo
