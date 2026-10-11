import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Check } from 'lucide-react'
import { pagePath } from '../../lib/expressionPages'
import type { ExpressionKind, PhrasalFamily } from '../../types'
import SpeakButton from '../SpeakButton'
import AddToReview, { type ReviewStatus } from './AddToReview'
import ProgressLegend from './ProgressLegend'
import { PROGRESS_CHIP, progressOf } from './progress'

interface Props {
  families: PhrasalFamily[]
  /** Verb and particle to open first, e.g. from a unit's vocabulary (?verbo=turn&particula=off). */
  initialRoot?: string
  initialParticle?: string
  /** Repetitions of the card in Repaso, or undefined if the user hasn't added it. */
  repetitionsOf: (kind: ExpressionKind, id: string) => number | undefined
  statusOf: (kind: ExpressionKind, id: string) => ReviewStatus
  onAdd: (kind: ExpressionKind, id: string) => Promise<void>
}

/** One root verb, many particles: pick a verb, then a particle to see what the combination means. */
export default function PhrasalExplorer({ families, initialRoot, initialParticle, repetitionsOf, statusOf, onAdd }: Props) {
  const [rootIndex, setRootIndex] = useState(() => Math.max(0, families.findIndex((f) => f.root === initialRoot)))
  const [selected, setSelected] = useState(() =>
    Math.max(0, families[rootIndex]?.items.findIndex((v) => v.particle === initialParticle) ?? 0),
  )
  const family = families[rootIndex]
  if (!family) return null
  const item = family.items[selected] ?? family.items[0]
  const progress = family.items.map((v) => progressOf(repetitionsOf('phrasal', v.id), statusOf('phrasal', v.id) === 'queued'))
  const mastered = progress.filter((p) => p === 'mastered').length
  const learning = progress.filter((p) => p === 'learning').length

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-medium text-slate-500">Elige un verbo</p>
        <div className="mt-2 flex flex-wrap gap-2" role="group" aria-label="Verbos">
          {families.map((f, i) => (
            <button
              key={f.root}
              type="button"
              aria-pressed={i === rootIndex}
              onClick={() => {
                setRootIndex(i)
                setSelected(0)
              }}
              className={`rounded-xl px-4 py-2 font-display text-lg font-bold transition ${
                i === rootIndex ? 'bg-indigo-950 text-white' : 'bg-white text-indigo-950 ring-1 ring-slate-200 hover:ring-indigo-300'
              }`}
            >
              {f.root}
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-6 md:p-8">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
          <span className="font-display text-6xl font-extrabold tracking-tight text-indigo-950 md:text-7xl">{family.root}</span>
          <div className="flex flex-wrap gap-2" role="tablist" aria-label="Partículas">
            {family.items.map((v, i) => {
              const p = progress[i]
              return (
                <button
                  key={v.id}
                  type="button"
                  role="tab"
                  aria-selected={i === selected}
                  onClick={() => setSelected(i)}
                  className={`inline-flex items-center gap-1 rounded-full px-4 py-2 font-semibold transition ${
                    i === selected ? 'bg-indigo-600 text-white' : PROGRESS_CHIP[p]
                  }`}
                >
                  {p === 'mastered' && <Check className="h-3.5 w-3.5" aria-label="Dominado" />}
                  {v.particle}
                </button>
              )
            })}
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
          <ProgressLegend />
          <span className="ml-auto font-medium text-slate-700 tabular-nums">
            {family.root}: {mastered} de {family.items.length} dominados{learning > 0 && ` · ${learning} aprendiendo`}
          </span>
        </div>

        <div className="mt-6 grid gap-4 border-t border-slate-100 pt-6">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="font-display text-2xl font-bold text-slate-900">
                {family.root} {item.particle}
              </p>
              <p className="mt-1 text-lg text-slate-800">{item.meaning}</p>
              <p className="mt-1 text-slate-500">En español: {item.translation}</p>
            </div>
            <span className="shrink-0 rounded-full bg-yellow-300 px-2.5 py-1 text-xs font-semibold text-slate-900">{item.level}</span>
          </div>
          <div className="flex items-center justify-between gap-3 rounded-2xl bg-slate-50 px-4 py-3">
            <p className="text-slate-700 italic">“{item.example}”</p>
            <SpeakButton text={item.example} />
          </div>
          <p className="text-sm text-slate-600">
            {item.separable ? (
              <>
                <span className="font-semibold text-emerald-700">Separable:</span> con pronombre va en medio, «{family.root} it {item.particle}».
              </>
            ) : (
              <>
                <span className="font-semibold text-slate-800">No separable:</span> verbo y partícula van siempre juntos.
              </>
            )}
          </p>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <AddToReview kind="phrasal" id={item.id} status={statusOf('phrasal', item.id)} onAdd={onAdd} />
            <Link to={pagePath('phrasal', item.id)} className="inline-flex items-center gap-1 text-sm font-medium text-indigo-600 hover:text-indigo-800">
              Ver la ficha de {family.root} {item.particle} <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
