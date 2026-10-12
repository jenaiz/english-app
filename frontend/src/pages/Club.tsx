import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { AlertCircle, Gift, Loader2 } from 'lucide-react'
import { api } from '../api/client'
import ActivityCardView from '../components/club/ActivityCardView'
import { ROOMS } from '../lib/club'
import type { ActivityCard, ClubRoom } from '../types'

const LEVEL_ORDER = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2']

export default function Club() {
  const [params, setParams] = useSearchParams()
  const room = ROOMS.find((r) => r.id === params.get('room'))?.id ?? null
  const [cards, setCards] = useState<ActivityCard[] | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    api
      .club()
      .then((r) => {
        setCards(r.activities)
        // Listing the Club may have unlocked pending milestones.
        window.dispatchEvent(new Event('club-changed'))
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'No se pudo cargar el Club'))
  }, [])

  const counts = useMemo(() => {
    const out = {} as Record<ClubRoom, { open: number; total: number }>
    for (const r of ROOMS) out[r.id] = { open: 0, total: 0 }
    for (const c of cards ?? []) {
      out[c.room].total++
      if (c.state !== 'locked') out[c.room].open++
    }
    return out
  }, [cards])

  if (error) {
    return (
      <div className="mx-auto mt-12 max-w-md px-4">
        <div className="flex items-center gap-2 rounded-lg bg-red-50 p-4 text-red-700">
          <AlertCircle className="h-5 w-5" /> {error}
        </div>
      </div>
    )
  }
  if (!cards) {
    return (
      <div className="flex justify-center py-24 text-indigo-500">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  const shown = cards.filter((c) => !room || c.room === room)
  // Newest surprises first, then the rest of the collection in course order.
  const open = shown
    .filter((c) => c.state !== 'locked')
    .sort((a, b) => Number(b.state === 'new') - Number(a.state === 'new') || (b.unlocked_at ?? '').localeCompare(a.unlocked_at ?? ''))
  const locked = shown
    .filter((c) => c.state === 'locked')
    .sort((a, b) => LEVEL_ORDER.indexOf(a.level) - LEVEL_ORDER.indexOf(b.level))
  const totalOpen = cards.filter((c) => c.state !== 'locked').length
  const info = ROOMS.find((r) => r.id === room)

  const tabCls = (active: boolean) =>
    `flex shrink-0 items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition ${
      active ? 'bg-slate-900 text-white shadow-sm' : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50'
    }`

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 md:py-12">
      <header className="flex flex-wrap items-end justify-between gap-6">
        <div className="max-w-2xl">
          <h1 className="flex items-center gap-3 font-display text-4xl font-bold text-slate-900">
            <Gift className="h-9 w-9 text-amber-500" /> Club
          </h1>
          <p className="mt-2 text-slate-600">
            Canciones, vídeos, lecturas y juegos reales para practicar lo que acabas de aprender. Cada unidad que terminas abre una sorpresa nueva.
          </p>
        </div>
        <div className="w-full max-w-xs">
          <div className="flex items-baseline justify-between text-sm">
            <span className="font-semibold text-slate-700">Tu álbum</span>
            <span className="text-slate-500 tabular-nums">
              {totalOpen} / {cards.length}
            </span>
          </div>
          <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-slate-200">
            <div
              className="h-full rounded-full bg-gradient-to-r from-amber-400 to-rose-500 transition-all"
              style={{ width: `${cards.length ? (totalOpen / cards.length) * 100 : 0}%` }}
            />
          </div>
        </div>
      </header>

      <nav className="-mx-4 mt-8 flex gap-2 overflow-x-auto px-4 pb-1" aria-label="Salas del Club">
        <button type="button" className={tabCls(!room)} onClick={() => setParams({}, { replace: true })}>
          Todo
        </button>
        {ROOMS.map((r) => (
          <button key={r.id} type="button" className={tabCls(room === r.id)} onClick={() => setParams({ room: r.id }, { replace: true })}>
            <r.Icon className="h-4 w-4" /> {r.label}
            <span className={`text-xs tabular-nums ${room === r.id ? 'text-slate-300' : 'text-slate-400'}`}>
              {counts[r.id].open}/{counts[r.id].total}
            </span>
          </button>
        ))}
      </nav>
      {info && <p className="mt-4 text-slate-600">{info.intro}</p>}

      {open.length > 0 ? (
        <section className="mt-8">
          <h2 className="font-display text-xl font-bold text-slate-900">Desbloqueadas</h2>
          <div className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
            {open.map((c) => (
              <ActivityCardView key={c.id} card={c} />
            ))}
          </div>
        </section>
      ) : (
        <div className="mt-8 rounded-3xl bg-amber-50 p-6 text-center md:p-10">
          <Gift className="mx-auto h-10 w-10 text-amber-500" />
          <p className="mt-3 font-display text-xl font-bold text-amber-950">
            {totalOpen === 0 ? 'Tu primera sorpresa te espera' : `Aún no tienes ${info?.plural ?? 'actividades'}`}
          </p>
          <p className="mx-auto mt-1 max-w-md text-amber-900/80">
            Termina una unidad del curso y se abrirá una actividad del Club. Cuantas más unidades hagas, más completo estará tu álbum.
          </p>
          <Link to="/levels" className="mt-5 inline-block rounded-xl bg-indigo-600 px-5 py-2.5 font-semibold text-white shadow-sm transition hover:bg-indigo-700">
            Seguir con el curso
          </Link>
        </div>
      )}

      {locked.length > 0 && (
        <section className="mt-12">
          <h2 className="font-display text-xl font-bold text-slate-900">Por descubrir</h2>
          <p className="mt-1 text-sm text-slate-500">No sabrás qué es hasta que la desbloquees.</p>
          <div className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
            {locked.map((c) => (
              <ActivityCardView key={c.id} card={c} />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
