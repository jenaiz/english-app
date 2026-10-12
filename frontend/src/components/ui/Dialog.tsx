import { useEffect, useRef, type ReactNode } from 'react'

interface Props {
  /** Id of the element that names the dialog (its title). */
  labelledBy: string
  /** Escape and a click outside call it; leave it out for a dialog that must not be dismissed. */
  onClose?: () => void
  className?: string
  children: ReactNode
}

/**
 * Modal dialog: focuses its first control, keeps Tab inside, closes on Escape and gives the
 * focus back to where it was.
 */
export default function Dialog({ labelledBy, onClose, className = 'max-w-md', children }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  // The latest onClose, so a new function on every render doesn't re-run the focus effect.
  const close = useRef(onClose)
  close.current = onClose

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null
    const dialog = ref.current
    const autofocus = dialog?.querySelector<HTMLElement>('[autofocus]')
    ;(autofocus ?? dialog?.querySelector<HTMLElement>('button, input'))?.focus()

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        close.current?.()
        return
      }
      if (e.key !== 'Tab' || !dialog) return
      const focusable = dialog.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), input:not([disabled])')
      if (!focusable.length) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('keydown', onKey)
      previous?.focus()
    }
  }, [])

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 p-4 sm:items-center" onClick={() => close.current?.()}>
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        onClick={(e) => e.stopPropagation()}
        className={`max-h-[90vh] w-full overflow-y-auto rounded-2xl bg-white p-6 shadow-xl ${className}`}
      >
        {children}
      </div>
    </div>
  )
}
