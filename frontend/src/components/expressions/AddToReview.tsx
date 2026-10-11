import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Check, Clock, Loader2, Plus } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import type { ExpressionKind } from '../../types'

/** none: not added · saved: in Repaso · queued: added, waiting for the daily limit of new expressions. */
export type ReviewStatus = 'none' | 'saved' | 'queued'

interface Props {
  kind: ExpressionKind
  id: string
  status: ReviewStatus
  onAdd: (kind: ExpressionKind, id: string) => Promise<void>
}

/** "Añadir a mi repaso". Signed-out visitors get an invitation to create an account instead. */
export default function AddToReview({ kind, id, status, onAdd }: Props) {
  const { user } = useAuth()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(false)

  if (!user) {
    return (
      <Link
        to="/register"
        onClick={(e) => e.stopPropagation()}
        className="inline-flex items-center gap-1.5 rounded-xl border border-indigo-200 px-4 py-2 text-sm font-semibold text-indigo-700 transition hover:bg-indigo-50"
      >
        <Plus className="h-4 w-4" /> Crea una cuenta para repasarla
      </Link>
    )
  }

  if (status === 'queued') {
    return (
      <span
        className="inline-flex items-center gap-1.5 rounded-xl border border-dashed border-slate-400 px-4 py-2 text-sm font-semibold text-slate-600"
        title="Entran como mucho 5 expresiones nuevas al día en tu repaso. Esta entrará en los próximos días."
      >
        <Clock className="h-4 w-4" /> En cola para tu repaso
      </span>
    )
  }

  if (status === 'saved') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700">
        <Check className="h-4 w-4" /> En tu repaso
      </span>
    )
  }

  return (
    <button
      type="button"
      disabled={busy}
      onClick={async (e) => {
        e.stopPropagation()
        setBusy(true)
        setError(false)
        try {
          await onAdd(kind, id)
        } catch {
          setError(true)
        } finally {
          setBusy(false)
        }
      }}
      className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:opacity-60"
    >
      {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
      {error ? 'No se pudo añadir. Reintentar' : 'Añadir a mi repaso'}
    </button>
  )
}
