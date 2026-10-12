import type { ButtonHTMLAttributes } from 'react'

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'danger-outline' | 'success' | 'inverse'
export type ButtonSize = 'sm' | 'md' | 'lg'

const BASE =
  'inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition focus-visible:outline-none focus-visible:ring-4 disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none'

const VARIANTS: Record<ButtonVariant, string> = {
  primary: 'bg-indigo-600 text-white shadow-sm hover:bg-indigo-700 focus-visible:ring-indigo-300',
  secondary: 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 focus-visible:ring-indigo-200',
  ghost: 'text-slate-600 hover:bg-slate-100 hover:text-slate-800 focus-visible:ring-indigo-200',
  danger: 'bg-red-600 text-white shadow-sm hover:bg-red-700 focus-visible:ring-red-200',
  // Opens a destructive flow; the confirmation inside uses `danger`.
  'danger-outline': 'border border-red-300 bg-white text-red-700 hover:bg-red-50 focus-visible:ring-red-200',
  // Finishing a lesson: the one place green means "go".
  success: 'bg-emerald-600 text-white shadow-sm hover:bg-emerald-700 focus-visible:ring-emerald-200',
  // On dark or coloured panels.
  inverse: 'bg-white text-indigo-700 shadow-sm hover:bg-indigo-50 focus-visible:ring-white/50',
}

const SIZES: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-5 py-2.5',
  lg: 'px-6 py-3.5',
}

/** Classes of a button, for elements that must look like one (links). */
export function buttonClass({
  variant = 'primary',
  size = 'md',
  full = false,
  className = '',
}: { variant?: ButtonVariant; size?: ButtonSize; full?: boolean; className?: string } = {}) {
  return `${BASE} ${VARIANTS[variant]} ${SIZES[size]}${full ? ' w-full' : ''}${className ? ` ${className}` : ''}`
}

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  full?: boolean
}

export default function Button({ variant, size, full, className, type = 'button', ...rest }: Props) {
  return <button type={type} className={buttonClass({ variant, size, full, className })} {...rest} />
}
