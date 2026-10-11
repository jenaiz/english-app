import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { AlertCircle, ArrowLeft, CheckCircle2, Loader2, Plus } from 'lucide-react'
import ExpressionTile from '../components/expressions/ExpressionTile'
import { useAuth } from '../context/AuthContext'
import { loadExpressions } from '../lib/expressionsCatalog'
import { packProgress } from '../lib/packs'
import { summaryOf, type ExpressionSummary } from '../lib/todayPicks'
import { useSavedExpressions } from '../lib/useSavedExpressions'
import type { ExpressionsCatalog } from '../types'

/** One pack: its expressions, progress towards completing it, and adding it to Repaso in one go. */
export default function PackPage() {
  const { packId } = useParams()
  const { user } = useAuth()
  const [catalog, setCatalog] = useState<ExpressionsCatalog | null>(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const { statusOf, repetitionsOf, add } = useSavedExpressions(!!user)

  useEffect(() => {
    loadExpressions()
      .then(setCatalog)
      .catch((e: Error) => setError(e.message))
  }, [])

  const pack = catalog?.packs.find((p) => p.id === packId)
  const items = useMemo(
    () => (catalog && pack ? pack.items.map((i) => summaryOf(catalog, i)).filter((x): x is ExpressionSummary => x !== null) : []),
    [catalog, pack],
  )

  if (error) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10">
        <p className="flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          <AlertCircle className="h-4 w-4" /> No se ha podido cargar el pack: {error}
        </p>
      </div>
    )
  }
  if (!catalog) {
    return (
      <div className="flex justify-center py-24 text-indigo-500">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }
  if (!pack) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center">
        <h1 className="text-2xl font-bold text-slate-900">No encontramos este pack</h1>
        <Link to="/expresiones" className="mt-4 inline-block font-semibold text-indigo-600 hover:text-indigo-800">
          Volver a Expresiones
        </Link>
      </div>
    )
  }

  const progress = packProgress(pack, repetitionsOf)
  const pending = items.filter((i) => statusOf(i.kind, i.id) === 'none')
  const complete = progress.mastered === progress.total

  const addAll = async () => {
    setBusy(true)
    try {
      for (const i of pending) await add(i.kind, i.id)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 md:py-14">
      <Link to="/expresiones" className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-800">
        <ArrowLeft className="h-4 w-4" /> Expresiones
      </Link>

      <div className="mt-4 flex flex-wrap items-start justify-between gap-6">
        <div className="max-w-2xl">
          <p className="text-sm font-semibold text-indigo-600">
            Pack · {pack.level} · {progress.total} expresiones
          </p>
          <h1 className="mt-1 font-display text-4xl font-bold tracking-tight text-indigo-950">{pack.title}</h1>
          <p className="mt-2 text-lg text-slate-600">{pack.description}</p>
        </div>
        {user ? (
          pending.length > 0 && (
            <button
              type="button"
              onClick={addAll}
              disabled={busy}
              className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-5 py-2.5 font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:opacity-60"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              {pending.length === items.length ? 'Añadir el pack a mi repaso' : `Añadir las ${pending.length} que faltan`}
            </button>
          )
        ) : (
          <Link to="/register" className="rounded-xl bg-indigo-600 px-5 py-2.5 font-semibold text-white shadow-sm transition hover:bg-indigo-700">
            Crea una cuenta gratis para guardarlo
          </Link>
        )}
      </div>

      <div className="mt-6 rounded-2xl bg-slate-50 p-4">
        {complete ? (
          <p className="flex items-center gap-2 font-semibold text-emerald-700">
            <CheckCircle2 className="h-5 w-5" /> ¡Pack completado! Dominas sus {progress.total} expresiones.
          </p>
        ) : (
          <>
            <div className="flex flex-wrap items-baseline justify-between gap-2 text-sm">
              <span className="font-semibold text-slate-800 tabular-nums">
                {progress.mastered} de {progress.total} dominadas
              </span>
              <span className="text-slate-500">
                {progress.added === 0
                  ? 'Añádelas a tu repaso para empezar.'
                  : 'Una expresión está dominada cuando la aciertas 4 veces seguidas en Repaso.'}
              </span>
            </div>
            <div className="mt-2 flex h-2 overflow-hidden rounded-full bg-slate-200" aria-hidden="true">
              <div className="h-full bg-emerald-500" style={{ width: `${(progress.mastered / progress.total) * 100}%` }} />
              <div className="h-full bg-amber-300" style={{ width: `${((progress.added - progress.mastered) / progress.total) * 100}%` }} />
            </div>
          </>
        )}
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((i) => (
          <ExpressionTile key={`${i.kind}:${i.id}`} item={i} status={statusOf(i.kind, i.id)} onAdd={add} />
        ))}
      </div>

      {user && pending.length > 0 && (
        <p className="mt-6 text-sm text-slate-500">
          Para que el repaso no se te acumule, entran como mucho 5 expresiones nuevas al día; el resto espera en cola.
        </p>
      )}
    </div>
  )
}
