import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Check, Loader2, Plus } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import type { ExpressionKind } from '../../types'

interface Props {
  kind: ExpressionKind
  id: string
  saved: boolean
  onAdd: (kind: ExpressionKind, id: string) => Promise<void>
}

/** "Añadir a mi repaso". Signed-out visitors get an invitation to create an account instead. */
export default function AddToReview({ kind, id, saved, onAdd }: Props) {
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

  if (saved) {
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
