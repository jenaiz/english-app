import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { CheckCircle2, Loader2, Plus } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { trackEvent } from '../../lib/analytics'
import type { AddSource } from '../../lib/useSavedExpressions'
import type { ExpressionSummary } from '../../lib/todayPicks'
import type { ExpressionKind } from '../../types'
import { type ReviewStatus } from './AddToReview'
import ExpressionTile from './ExpressionTile'
import { buttonClass } from '../ui/Button'

interface Props {
  picks: ExpressionSummary[]
  level: string
  statusOf: (kind: ExpressionKind, id: string) => ReviewStatus
  onAdd: (kind: ExpressionKind, id: string, source?: AddSource) => Promise<void>
}

const today = () => new Intl.DateTimeFormat('es-ES', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date())

/**
 * The main way into Expresiones: a few expressions chosen for today. It decides for the learner,
 * takes a couple of minutes and ends ("Listo por hoy"), which gives a reason to come back tomorrow.
 */
export default function TodayPanel({ picks, level, statusOf, onAdd }: Props) {
  const { user } = useAuth()
  const [busy, setBusy] = useState(false)
  const pending = picks.filter((p) => statusOf(p.kind, p.id) === 'none')
  const done = picks.length > 0 && pending.length === 0
  // "Listo por hoy" reached by adding here, not just loading a day that was already done.
  const addedHere = useRef(false)
  const reported = useRef(false)
  useEffect(() => {
    if (done && addedHere.current && !reported.current) {
      reported.current = true
      trackEvent('today_completed', { level })
    }
  }, [done, level])

  const addToday = (kind: ExpressionKind, id: string) => {
    addedHere.current = true
    return onAdd(kind, id, 'today')
  }

  const addAll = async () => {
    setBusy(true)
    try {
      for (const p of pending) await addToday(p.kind, p.id)
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="mt-8 rounded-3xl bg-indigo-50 p-5 md:p-7" aria-labelledby="today-title">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-indigo-600 first-letter:uppercase">{today()}</p>
          <h2 id="today-title" className="h-section mt-1">
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
            <Link to="/repaso" className="inline-flex items-center gap-1.5 rounded-xl bg-white px-4 py-2 text-sm font-semibold text-indigo-700 shadow-sm transition hover:bg-indigo-100">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" /> Ir a Repaso
            </Link>
          ) : user ? (
            pending.length > 1 && (
              <button
                type="button"
                onClick={addAll}
                disabled={busy}
                className={buttonClass({ size: 'sm' })}
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                Añadir {pending.length === picks.length ? `las ${picks.length}` : `las ${pending.length} que faltan`} a mi repaso
              </button>
            )
          ) : (
            <Link to="/register" className={buttonClass({ size: 'sm' })}>
              Crea una cuenta gratis para guardarlas
            </Link>
          ))}
      </div>

      {picks.length === 0 ? (
        <p className="mt-5 rounded-2xl bg-white px-5 py-4 text-slate-600">
          Ya tienes en tu repaso todas las expresiones. ¡Enhorabuena! Sigue con ellas en{' '}
          <Link to="/repaso" className="font-semibold text-indigo-600 hover:text-indigo-800">
            Repaso
          </Link>
          .
        </p>
      ) : (
        <div className="mt-5 grid gap-4 md:grid-cols-3">
          {picks.map((p) => (
            <ExpressionTile key={`${p.kind}:${p.id}`} item={p} status={statusOf(p.kind, p.id)} onAdd={addToday} />
          ))}
        </div>
      )}
    </section>
  )
}
