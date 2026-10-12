import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Gift } from 'lucide-react'
import { roomOf } from '../../lib/club'
import type { UnlockedActivity } from '../../types'
import { ActivityCover } from './ActivityCardView'

/**
 * The end-of-lesson surprise: a wrapped gift that opens into the Club activities this lesson
 * unlocked. It stays wrapped until tapped, so the learner gets to open it.
 */
export default function UnlockReveal({ activities }: { activities: UnlockedActivity[] }) {
  const [open, setOpen] = useState(false)
  if (activities.length === 0) return null
  const many = activities.length > 1

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="group mt-8 flex w-full items-center gap-4 rounded-2xl bg-gradient-to-r from-amber-100 to-rose-100 p-4 text-left ring-1 ring-amber-200 transition hover:ring-2 hover:ring-amber-300 focus-visible:ring-4 focus-visible:ring-amber-300 focus-visible:outline-none"
      >
        <span className="gift-wobble grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-amber-400 to-rose-500 text-white shadow-lg shadow-rose-200">
          <Gift className="h-7 w-7" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-display text-lg font-bold text-slate-900">
            {many ? `¡Has desbloqueado ${activities.length} sorpresas!` : '¡Has desbloqueado una sorpresa!'}
          </span>
          <span className="block text-sm text-slate-600">Toca para abrir {many ? 'tus regalos' : 'tu regalo'} del Club</span>
        </span>
      </button>
    )
  }

  return (
    <div className="relative mt-8 space-y-3 text-left">
      <span aria-hidden className="sparkle-burst pointer-events-none absolute top-1/2 left-1/2 h-40 w-40 rounded-full bg-amber-300/50 blur-2xl" />
      {activities.map((a, i) => {
        const room = roomOf(a.room)
        return (
          <Link
            key={a.id}
            to={`/club/${a.id}`}
            style={{ animationDelay: `${i * 0.15}s` }}
            className="card-reveal group relative flex items-center gap-4 overflow-hidden rounded-2xl border border-amber-200 bg-white p-3 shadow-lg shadow-amber-100 transition hover:border-amber-400"
          >
            <ActivityCover card={a} className="h-20 w-28 shrink-0 rounded-xl" />
            <span className="min-w-0 flex-1">
              <span className={`flex items-center gap-1.5 text-xs font-semibold tracking-wide uppercase ${room.accent}`}>
                <room.Icon className="h-3.5 w-3.5" /> Nueva en {room.label}
              </span>
              <span className="mt-0.5 block truncate font-display text-lg font-bold text-slate-900">{a.title}</span>
              {a.subtitle && <span className="block truncate text-sm text-slate-500">{a.subtitle}</span>}
            </span>
            <ArrowRight className="mr-1 h-5 w-5 shrink-0 text-amber-500 transition group-hover:translate-x-0.5" />
          </Link>
        )
      })}
      <p className="text-center text-sm text-slate-500">
        También {many ? 'las tienes' : 'la tienes'} guardada en el{' '}
        <Link to="/club" className="font-medium text-indigo-600 hover:underline">
          Club
        </Link>
        , para cuando quieras.
      </p>
    </div>
  )
}
