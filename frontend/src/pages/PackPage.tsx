import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Brain, CheckCircle2, Clock, Loader2, Plus } from 'lucide-react'
import ExpressionTile from '../components/expressions/ExpressionTile'
import { useAuth } from '../context/AuthContext'
import { trackEvent } from '../lib/analytics'
import { loadExpressions } from '../lib/expressionsCatalog'
import { packProgress, packReview } from '../lib/packs'
import { summaryOf, type ExpressionSummary } from '../lib/todayPicks'
import { useSavedExpressions } from '../lib/useSavedExpressions'
import type { ExpressionsCatalog } from '../types'
import ErrorState from '../components/ui/ErrorState'
import BackLink from '../components/ui/BackLink'
import { buttonClass } from '../components/ui/Button'

/** One pack: its expressions, progress towards completing it, and adding it to Repaso in one go. */
export default function PackPage() {
  const { packId } = useParams()
  const { user } = useAuth()
  const [catalog, setCatalog] = useState<ExpressionsCatalog | null>(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const { statusOf, repetitionsOf, add, dueAtOf } = useSavedExpressions(!!user)

  useEffect(() => {
    loadExpressions()
      .then(setCatalog)
      .catch((e: Error) => setError(e.message))
  }, [])

  const pack = catalog?.packs.find((p) => p.id === packId)
  const progress = pack ? packProgress(pack, repetitionsOf) : null
  const complete = !!progress && progress.mastered === progress.total

  // Completion happens in Repaso; it is reported the first time the learner sees the pack complete on this device.
  const reported = useRef(false)
  useEffect(() => {
    if (!complete || !pack || reported.current) return
    reported.current = true
    const key = `pack-completed:${pack.id}`
    try {
      if (localStorage.getItem(key)) return
      localStorage.setItem(key, '1')
    } catch {
      // storage unavailable: report anyway
    }
    trackEvent('pack_completed', { pack_id: pack.id })
  }, [complete, pack])
  const items = useMemo(
    () => (catalog && pack ? pack.items.map((i) => summaryOf(catalog, i)).filter((x): x is ExpressionSummary => x !== null) : []),
    [catalog, pack],
  )

  if (error) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10">
        <ErrorState />
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
        <h1 className="h-page">No encontramos este pack</h1>
        <Link to="/expresiones" className="mt-4 inline-block font-semibold text-indigo-600 hover:text-indigo-800">
          Volver a Expresiones
        </Link>
      </div>
    )
  }

  if (!progress) return null
  const pending = items.filter((i) => statusOf(i.kind, i.id) === 'none')
  const review = packReview(pack, statusOf, dueAtOf)

  const addAll = async () => {
    setBusy(true)
    trackEvent('pack_added', { pack_id: pack.id, item_count: pending.length })
    try {
      for (const i of pending) await add(i.kind, i.id, 'pack')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 md:py-14">
      <BackLink to="/expresiones">Expresiones</BackLink>

      <div className="mt-4 flex flex-wrap items-start justify-between gap-6">
        <div className="max-w-2xl">
          <p className="text-sm font-semibold text-indigo-600">
            Pack · {pack.level} · {progress.total} expresiones
          </p>
          <h1 className="h-page mt-1">{pack.title}</h1>
          <p className="mt-2 text-lg text-slate-600">{pack.description}</p>
        </div>
        {user ? (
          pending.length > 0 && (
            <button
              type="button"
              onClick={addAll}
              disabled={busy}
              className={buttonClass()}
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              {pending.length === items.length ? 'Añadir el pack a mi repaso' : `Añadir las ${pending.length} que faltan`}
            </button>
          )
        ) : (
          <Link to="/register" className={buttonClass()}>
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
        {user && (review.due > 0 || review.nextDue !== undefined) && (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-4">
            {review.due > 0 ? (
              <>
                <p className="text-sm text-slate-600">
                  Tienes {review.due === 1 ? '1 expresión' : `${review.due} expresiones`} de este pack para repasar hoy.
                </p>
                <Link
                  to={`/repaso?pack=${encodeURIComponent(pack.id)}`}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-800"
                >
                  <Brain className="h-4 w-4" /> Repasar este pack
                </Link>
              </>
            ) : (
              <p className="flex items-center gap-2 text-sm text-slate-600">
                <Clock className="h-4 w-4 text-slate-400" /> Al día. Próximo repaso de este pack: {formatNext(review.nextDue!)}.
              </p>
            )}
          </div>
        )}
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((i) => (
          <ExpressionTile key={`${i.kind}:${i.id}`} item={i} status={statusOf(i.kind, i.id)} onAdd={(kind, id) => add(kind, id, 'pack')} />
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

/** "hoy a las 18:30", "mañana" or "el jueves 15 de octubre". */
function formatNext(at: number): string {
  const d = new Date(at)
  const today = new Date()
  const days = Math.round((new Date(d).setHours(0, 0, 0, 0) - new Date(today).setHours(0, 0, 0, 0)) / 86_400_000)
  if (days <= 0) return `hoy a las ${d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}`
  if (days === 1) return 'mañana'
  return `el ${new Intl.DateTimeFormat('es-ES', { weekday: 'long', day: 'numeric', month: 'long' }).format(d)}`
}
