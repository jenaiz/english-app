import { useState } from 'react'
import { Link } from 'react-router-dom'
import { CheckCircle2, Loader2, Plus } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import type { ExpressionSummary } from '../../lib/todayPicks'
import type { ExpressionKind } from '../../types'
import { type ReviewStatus } from './AddToReview'
import ExpressionTile from './ExpressionTile'

interface Props {
  picks: ExpressionSummary[]
  level: string
  statusOf: (kind: ExpressionKind, id: string) => ReviewStatus
  onAdd: (kind: ExpressionKind, id: string) => Promise<void>
  /** Shows the whole catalog with every expression, for when the level has none left. */
  onShowAll: () => void
}

const today = () => new Intl.DateTimeFormat('es-ES', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date())

/**
 * The main way into Expresiones: a few expressions chosen for today. It decides for the learner,
 * takes a couple of minutes and ends ("Listo por hoy"), which gives a reason to come back tomorrow.
 */
export default function TodayPanel({ picks, level, statusOf, onAdd, onShowAll }: Props) {
  const { user } = useAuth()
  const [busy, setBusy] = useState(false)
  const pending = picks.filter((p) => statusOf(p.kind, p.id) === 'none')
  const done = picks.length > 0 && pending.length === 0

  const addAll = async () => {
    setBusy(true)
    try {
      for (const p of pending) await onAdd(p.kind, p.id)
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="mt-8 rounded-3xl bg-indigo-50 p-5 md:p-7" aria-labelledby="today-title">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-indigo-600 first-letter:uppercase">{today()}</p>
          <h2 id="today-title" className="mt-1 font-display text-2xl font-bold text-indigo-950">
            {done ? 'Listo por hoy' : picks.length > 0 ? `Tus ${picks.length} expresiones de hoy` : 'Expresiones de hoy'}
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            {done
              ? 'Ya están en tu repaso. Vuelve mañana para descubrir otras tres.'
              : `Elegidas para ${level === 'all' ? 'ti' : `el nivel ${level}`}. Tócalas para ver qué significan.`}
          </p>
        </div>
        {picks.length > 0 &&
          (done ? (
            <Link to="/review" className="inline-flex items-center gap-1.5 rounded-xl bg-white px-4 py-2 text-sm font-semibold text-indigo-700 shadow-sm transition hover:bg-indigo-100">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" /> Ir a Repaso
            </Link>
          ) : user ? (
            pending.length > 1 && (
              <button
                type="button"
                onClick={addAll}
                disabled={busy}
                className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:opacity-60"
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                Añadir {pending.length === picks.length ? `las ${picks.length}` : `las ${pending.length} que faltan`} a mi repaso
              </button>
            )
          ) : (
            <Link to="/register" className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700">
              Crea una cuenta gratis para guardarlas
            </Link>
          ))}
      </div>

      {picks.length === 0 ? (
        <p className="mt-5 rounded-2xl bg-white px-5 py-4 text-slate-600">
          Ya tienes en tu repaso todas las expresiones de este nivel.{' '}
          <button type="button" onClick={onShowAll} className="font-semibold text-indigo-600 hover:text-indigo-800">
            Prueba con otro nivel
          </button>
        </p>
      ) : (
        <div className="mt-5 grid gap-4 md:grid-cols-3">
          {picks.map((p) => (
            <ExpressionTile key={`${p.kind}:${p.id}`} item={p} status={statusOf(p.kind, p.id)} onAdd={onAdd} />
          ))}
        </div>
      )}
    </section>
  )
}
