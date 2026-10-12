import { AlertCircle, RotateCcw } from 'lucide-react'

const DEFAULT_MESSAGE = 'Revisa tu conexión y vuelve a intentarlo.'

interface Props {
  /** Shown to the learner: never a raw server message, which is technical and in English. */
  message?: string
  /** Defaults to reloading the page, which re-fetches everything it shows. */
  onRetry?: () => void
  /** Inline: a compact notice inside a page (a failed save). Otherwise the page's whole body. */
  inline?: boolean
  className?: string
}

/** A failure the learner can do something about: what happened and a way to try again. */
export default function ErrorState({ message = DEFAULT_MESSAGE, onRetry = () => window.location.reload(), inline = false, className = '' }: Props) {
  if (inline) {
    return (
      <div role="alert" className={`flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 ${className}`}>
        <AlertCircle className="h-4 w-4 shrink-0" />
        <span className="flex-1">{message}</span>
        <button type="button" onClick={onRetry} className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 font-semibold hover:bg-red-100">
          <RotateCcw className="h-3.5 w-3.5" /> Reintentar
        </button>
      </div>
    )
  }
  return (
    <div role="alert" className={`mx-auto mt-12 max-w-md px-4 text-center ${className}`}>
      <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-red-50 text-red-600">
        <AlertCircle className="h-6 w-6" />
      </div>
      <p className="mt-4 font-display text-xl font-bold text-slate-900">No se ha podido cargar</p>
      <p className="mt-1 text-slate-600">{message}</p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-5 inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-5 py-2.5 font-semibold text-slate-700 transition hover:bg-slate-50 focus-visible:ring-4 focus-visible:ring-indigo-200 focus-visible:outline-none"
      >
        <RotateCcw className="h-4 w-4" /> Reintentar
      </button>
    </div>
  )
}
