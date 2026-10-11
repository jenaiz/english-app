import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Cookie, X } from 'lucide-react'
import { useConsent } from '../context/ConsentContext'

// Accept and reject share the same style on purpose: EU guidance (AEPD/EDPB)
// requires rejecting to be as easy and as visible as accepting.
const choiceBtn =
  'rounded-lg border border-indigo-600 bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700'
const secondaryBtn =
  'rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50'

/** First-visit consent bar plus the preferences dialog (also opened from the footer). */
export default function CookieBanner() {
  const { consent, acceptAll, rejectAll, preferencesOpen, openPreferences } = useConsent()

  return (
    <>
      {!consent && !preferencesOpen && (
        <div
          role="region"
          aria-label="Aviso de cookies"
          className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 shadow-[0_-4px_20px_rgba(15,23,42,0.08)] backdrop-blur"
        >
          <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-4 md:flex-row md:items-center md:justify-between">
            <p className="flex gap-3 text-sm text-slate-600">
              <Cookie className="mt-0.5 h-5 w-5 shrink-0 text-indigo-600" aria-hidden />
              <span>
                Usamos cookies técnicas imprescindibles para que la web funcione y, solo si nos das permiso, cookies de
                analítica para entender cómo se usa y mejorarla. Puedes cambiar tu elección en cualquier momento.{' '}
                <Link to="/cookies" className="font-medium text-indigo-600 hover:underline">
                  Más información
                </Link>
              </span>
            </p>
            <div className="flex shrink-0 flex-wrap gap-2">
              <button type="button" onClick={openPreferences} className={secondaryBtn}>
                Configurar
              </button>
              <button type="button" onClick={rejectAll} className={choiceBtn}>
                Rechazar todas
              </button>
              <button type="button" onClick={acceptAll} className={choiceBtn}>
                Aceptar todas
              </button>
            </div>
          </div>
        </div>
      )}
      {preferencesOpen && <PreferencesDialog />}
    </>
  )
}

function PreferencesDialog() {
  const { consent, gaMeasurementId, save, acceptAll, rejectAll, closePreferences } = useConsent()
  const [analytics, setAnalytics] = useState(consent?.analytics ?? false)
  const dialogRef = useRef<HTMLDivElement>(null)

  // Focus the dialog, keep Tab inside it, close on Escape and restore focus afterwards.
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null
    const dialog = dialogRef.current
    dialog?.querySelector<HTMLElement>('button, input')?.focus()

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closePreferences()
        return
      }
      if (e.key !== 'Tab' || !dialog) return
      const focusable = dialog.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), input:not([disabled])')
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
  }, [closePreferences])

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 p-4 sm:items-center" onClick={closePreferences}>
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="cookie-prefs-title"
        onClick={(e) => e.stopPropagation()}
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-xl"
      >
        <div className="flex items-start justify-between gap-4">
          <h2 id="cookie-prefs-title" className="font-display text-xl font-bold text-slate-900">
            Preferencias de cookies
          </h2>
          <button
            type="button"
            onClick={closePreferences}
            aria-label="Cerrar"
            className="rounded-lg p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <p className="mt-2 text-sm text-slate-600">
          Elige qué cookies permites. Las necesarias no se pueden desactivar porque sin ellas la web no funciona. Más
          detalles en la{' '}
          <Link to="/cookies" onClick={closePreferences} className="font-medium text-indigo-600 hover:underline">
            política de cookies
          </Link>
          .
        </p>

        <div className="mt-5 space-y-3">
          <Category
            id="cookies-necessary"
            title="Necesarias"
            description="Mantienen tu sesión iniciada, recuerdan tus preferencias de estudio y esta elección de cookies."
            checked
            disabled
          />
          {gaMeasurementId && (
            <Category
              id="cookies-analytics"
              title="Analítica"
              description="Google Analytics: estadísticas anónimas de uso (páginas visitadas, tiempo de uso) para mejorar Fluently. No se usan para publicidad."
              checked={analytics}
              onChange={setAnalytics}
            />
          )}
        </div>

        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" onClick={() => save({ analytics })} className={secondaryBtn}>
            Guardar selección
          </button>
          <button type="button" onClick={rejectAll} className={choiceBtn}>
            Rechazar todas
          </button>
          <button type="button" onClick={acceptAll} className={choiceBtn}>
            Aceptar todas
          </button>
        </div>
      </div>
    </div>
  )
}

interface CategoryProps {
  id: string
  title: string
  description: string
  checked: boolean
  disabled?: boolean
  onChange?: (value: boolean) => void
}

function Category({ id, title, description, checked, disabled, onChange }: CategoryProps) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-xl border border-slate-200 p-4">
      <div>
        <label htmlFor={id} className="font-semibold text-slate-800">
          {title}
          {disabled && <span className="ml-2 text-xs font-medium text-slate-400">Siempre activas</span>}
        </label>
        <p className="mt-1 text-sm text-slate-500">{description}</p>
      </div>
      <span className="relative mt-1 inline-flex shrink-0">
        <input
          id={id}
          type="checkbox"
          role="switch"
          checked={checked}
          disabled={disabled}
          onChange={(e) => onChange?.(e.target.checked)}
          className="peer absolute inset-0 h-full w-full cursor-pointer opacity-0 disabled:cursor-not-allowed"
        />
        <span
          aria-hidden
          className="pointer-events-none h-5 w-9 rounded-full bg-slate-300 transition peer-checked:bg-indigo-600 peer-disabled:opacity-60 peer-focus-visible:ring-2 peer-focus-visible:ring-indigo-600 peer-focus-visible:ring-offset-2"
        />
        <span
          aria-hidden
          className="pointer-events-none absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white shadow transition peer-checked:translate-x-4"
        />
      </span>
    </div>
  )
}
