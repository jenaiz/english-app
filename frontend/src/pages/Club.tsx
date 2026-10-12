import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Gift } from 'lucide-react'
import { api } from '../api/client'
import ActivityCardView from '../components/club/ActivityCardView'
import { ROOMS } from '../lib/club'
import type { ActivityCard, ClubRoom } from '../types'
import ErrorState from '../components/ui/ErrorState'
import { PageSkeleton } from '../components/ui/Skeleton'
import { pillClass, pillCountClass } from '../components/ui/styles'
import { buttonClass } from '../components/ui/Button'

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
      <ErrorState />
    )
  }
  if (!cards) {
    return (
      <PageSkeleton />
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


  return (
    <div className="mx-auto max-w-6xl px-4 py-8 md:py-12">
      <header className="flex flex-wrap items-end justify-between gap-6">
        <div className="max-w-2xl">
          <h1 className="h-page flex items-center gap-3">
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
        <button type="button" className={pillClass(!room)} onClick={() => setParams({}, { replace: true })}>
          Todo
        </button>
        {ROOMS.map((r) => (
          <button key={r.id} type="button" className={pillClass(room === r.id)} onClick={() => setParams({ room: r.id }, { replace: true })}>
            <r.Icon className="h-4 w-4" /> {r.label}
            <span className={pillCountClass(room === r.id)}>
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
          <Link to="/levels" className={buttonClass({ className: 'mt-5' })}>
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
