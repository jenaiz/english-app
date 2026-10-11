import { useState } from 'react'
import { Link } from 'react-router-dom'
import { pagePath } from '../../lib/expressionPages'
import type { ExpressionKind, Idiom } from '../../types'
import SpeakButton from '../SpeakButton'
import AddToReview, { type ReviewStatus } from './AddToReview'

interface Props {
  idiom: Idiom
  status: ReviewStatus
  onAdd: (kind: ExpressionKind, id: string) => Promise<void>
}

/** Flip card: the idiom on the front; English definition, examples and the Spanish equivalent on the back. */
export default function IdiomCard({ idiom, status, onAdd }: Props) {
  const [flipped, setFlipped] = useState(false)
  const [showSpanish, setShowSpanish] = useState(false)
  // The back shows the essentials; the rest waits behind "Más detalles" so the card stays light.
  const [showDetails, setShowDetails] = useState(false)
  const [firstExample, ...moreExamples] = idiom.examples
  const hasDetails = moreExamples.length > 0 || !!idiom.literal_es || !!idiom.note

  return (
    // A div, not a button: the back face holds its own buttons.
    <div
      role="button"
      tabIndex={0}
      onClick={() => setFlipped((f) => !f)}
      onKeyDown={(e) => {
        if (e.target !== e.currentTarget) return
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          setFlipped((f) => !f)
        }
      }}
      aria-pressed={flipped}
      aria-label={`Idiom: ${idiom.term}. Pulsa para darle la vuelta`}
      className="group h-[26rem] cursor-pointer rounded-3xl text-left perspective-[1200px] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-indigo-200"
    >
      <div className={`relative h-full rounded-3xl transition-transform duration-500 transform-3d motion-reduce:transition-none ${flipped ? 'rotate-y-180' : ''}`}>
        <div aria-hidden={flipped} className="absolute inset-0 flex flex-col justify-between rounded-3xl bg-indigo-600 p-7 text-white backface-hidden">
          <div className="flex items-start justify-between gap-3">
            <div className="flex flex-wrap gap-2 text-xs font-semibold">
              <span className="rounded-full bg-yellow-300 px-2.5 py-1 text-slate-900">{idiom.level}</span>
              <span className="rounded-full bg-white/15 px-2.5 py-1">{idiom.topic}</span>
            </div>
            {!flipped && <SpeakButton text={idiom.term} dark />}
          </div>
          <p className="font-display text-4xl leading-none font-extrabold tracking-tight text-balance">{idiom.term}</p>
          <span className="text-sm text-indigo-200 group-hover:text-white">¿Qué crees que significa? Toca para darle la vuelta</span>
        </div>

        <div
          aria-hidden={!flipped}
          className="absolute inset-0 flex flex-col gap-3 overflow-y-auto rounded-3xl border-2 border-indigo-600 bg-white p-6 rotate-y-180 backface-hidden"
        >
          <div className="flex items-start justify-between gap-3">
            <span className="font-display text-xl font-bold text-indigo-600">{idiom.term}</span>
            <span className="shrink-0 rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700">{idiom.register}</span>
          </div>
          <p className="text-lg leading-snug font-semibold text-slate-900">{idiom.definition}</p>
          {firstExample && (
            <p className="flex items-center justify-between gap-2 text-sm text-slate-600 italic">
              “{firstExample}”
              {flipped && <SpeakButton text={firstExample} />}
            </p>
          )}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              setShowSpanish(true)
            }}
            className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-3 py-2 text-left text-sm text-slate-700"
          >
            <span className="font-semibold">En español: </span>
            <span className={showSpanish ? '' : 'blur-sm select-none'}>{idiom.equivalent_es}</span>
            {!showSpanish && <span className="block text-xs text-slate-500">Toca para verlo</span>}
          </button>
          {showDetails && (
            <div className="space-y-2 border-t border-slate-100 pt-3 text-sm">
              {moreExamples.map((ex) => (
                <p key={ex} className="flex items-center justify-between gap-2 text-slate-600 italic">
                  “{ex}”
                  {flipped && <SpeakButton text={ex} />}
                </p>
              ))}
              {idiom.literal_es && (
                <p className="text-slate-500">Literalmente: «{idiom.literal_es}». No se traduce palabra por palabra.</p>
              )}
              {idiom.note && <p className="text-slate-500">{idiom.note}</p>}
            </div>
          )}
          <div className="mt-auto flex flex-wrap items-center justify-between gap-2 pt-1">
            <AddToReview kind="idiom" id={idiom.id} status={status} onAdd={onAdd} />
            <div className="flex items-center gap-3">
              {hasDetails && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    setShowDetails((d) => !d)
                  }}
                  className="text-sm font-medium text-indigo-600 hover:text-indigo-800"
                >
                  {showDetails ? 'Menos detalles' : 'Más detalles'}
                </button>
              )}
              <Link
                to={pagePath('idiom', idiom.id)}
                onClick={(e) => e.stopPropagation()}
                tabIndex={flipped ? 0 : -1}
                className="text-sm font-medium text-indigo-600 hover:text-indigo-800"
              >
                Ver ficha
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
