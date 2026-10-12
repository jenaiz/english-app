import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Check } from 'lucide-react'
import { pagePath } from '../../lib/expressionPages'
import type { ExpressionKind, Particle, PhrasalFamily, PhrasalVerb } from '../../types'
import SpeakButton from '../SpeakButton'
import AddToReview, { type ReviewStatus } from './AddToReview'
import ProgressLegend from './ProgressLegend'
import { progressOf, type Progress } from './progress'

interface Props {
  families: PhrasalFamily[]
  particles: Particle[]
  initialParticle?: string
  repetitionsOf: (kind: ExpressionKind, id: string) => number | undefined
  statusOf: (kind: ExpressionKind, id: string) => ReviewStatus
  onAdd: (kind: ExpressionKind, id: string) => Promise<void>
  /** Opens the "by verb" view on this verb and particle. */
  onOpenVerb: (root: string, particle: string) => void
}

interface Entry {
  root: string
  verb: PhrasalVerb
}

const CARD: Record<Progress, string> = {
  new: 'border-slate-200',
  queued: 'border-dashed border-slate-400',
  learning: 'border-amber-300',
  mastered: 'border-emerald-300',
}

// "up with", "out of"… belong to the group of their first word.
const mainParticle = (particle: string) => particle.split(' ')[0]

/** The other axis of the phrasal verb matrix: one particle, many verbs, and the idea the particle usually adds. */
export default function ParticleExplorer({ families, particles, initialParticle, repetitionsOf, statusOf, onAdd, onOpenVerb }: Props) {
  const groups = useMemo(() => {
    const byParticle = new Map<string, Entry[]>()
    for (const f of families)
      for (const v of f.items) {
        const key = mainParticle(v.particle)
        byParticle.set(key, [...(byParticle.get(key) ?? []), { root: f.root, verb: v }])
      }
    const order = particles.map((p) => p.particle)
    // Particles with more verbs first: they are the ones where the general idea pays off.
    return [...byParticle.entries()]
      .map(([particle, entries]) => ({ particle, entries, info: particles.find((p) => p.particle === particle) }))
      .sort((a, b) => b.entries.length - a.entries.length || order.indexOf(a.particle) - order.indexOf(b.particle))
  }, [families, particles])

  const [selected, setSelected] = useState(() => (initialParticle ? mainParticle(initialParticle) : undefined))
  const group = groups.find((g) => g.particle === selected) ?? groups[0]
  if (!group) return null

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-medium text-slate-500">Elige una partícula</p>
        <div className="mt-2 flex flex-wrap gap-2" role="group" aria-label="Partículas">
          {groups.map((g) => (
            <button
              key={g.particle}
              type="button"
              aria-pressed={g.particle === group.particle}
              onClick={() => setSelected(g.particle)}
              className={`rounded-xl px-4 py-2 font-display text-lg font-bold transition ${
                g.particle === group.particle ? 'bg-indigo-600 text-white shadow-sm' : 'bg-white text-indigo-950 ring-1 ring-slate-200 hover:ring-indigo-300'
              }`}
            >
              {g.particle} <span className={`text-sm font-semibold ${g.particle === group.particle ? 'text-indigo-200' : 'text-slate-400'}`}>{g.entries.length}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-3xl bg-yellow-300 p-6 text-slate-900 md:p-8">
        <p className="font-display text-6xl leading-none font-extrabold tracking-tight md:text-7xl">{group.particle}</p>
        {group.info && (
          <>
            <p className="mt-4 text-xl">
              Suele significar <strong>{group.info.idea}</strong>.
            </p>
            {group.info.note && <p className="mt-1 text-slate-800">{group.info.note}</p>}
          </>
        )}
        <p className="mt-3 text-sm text-slate-700">No siempre se cumple, pero te ayuda a adivinar el sentido de un phrasal verb nuevo.</p>
      </div>

      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
        <ProgressLegend />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {group.entries.map(({ root, verb }) => {
          const reps = repetitionsOf('phrasal', verb.id)
          const p = progressOf(reps, statusOf('phrasal', verb.id) === 'queued')
          return (
            <article key={verb.id} className={`flex flex-col gap-3 rounded-2xl border-2 bg-white p-5 ${CARD[p]}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="flex items-center gap-1.5 font-display text-2xl font-bold text-slate-900">
                    <Link to={pagePath('phrasal', verb.id)} className="hover:text-indigo-700 hover:underline">
                      {root} {verb.particle}
                    </Link>
                    {p === 'mastered' && <Check className="h-5 w-5 text-emerald-600" aria-label="Dominado" />}
                  </p>
                  <p className="text-slate-600">{verb.translation}</p>
                </div>
                <span className="shrink-0 rounded-full bg-yellow-300 px-2.5 py-1 text-xs font-semibold text-slate-900">{verb.level}</span>
              </div>
              <div className="flex items-center justify-between gap-2 rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-700 italic">
                “{verb.example}”
                <SpeakButton text={verb.example} />
              </div>
              <div className="mt-auto flex flex-wrap items-center justify-between gap-2">
                <AddToReview kind="phrasal" id={verb.id} status={statusOf('phrasal', verb.id)} onAdd={onAdd} />
                <button
                  type="button"
                  onClick={() => onOpenVerb(root, verb.particle)}
                  className="inline-flex items-center gap-1 text-sm font-medium text-indigo-600 hover:text-indigo-800"
                >
                  Familia de {root} <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </article>
          )
        })}
      </div>
    </div>
  )
}
