import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { pagePath } from '../../lib/expressionPages'
import type { ExpressionSummary } from '../../lib/todayPicks'
import type { ExpressionKind } from '../../types'
import SpeakButton from '../SpeakButton'
import AddToReview, { type ReviewStatus } from './AddToReview'
import LevelBadge from '../ui/LevelBadge'

interface Props {
  item: ExpressionSummary
  status: ReviewStatus
  onAdd: (kind: ExpressionKind, id: string) => Promise<void>
}

/**
 * Compact card for one expression: term with audio, meaning on demand and "Añadir a mi repaso".
 * Tapping anywhere on the card (outside its buttons and links) shows or hides the meaning.
 */
export default function ExpressionTile({ item: pick, status, onAdd }: Props) {
  const [open, setOpen] = useState(false)
  return (
    <article
      onClick={(e) => {
        if (!(e.target as Element).closest('button, a')) setOpen((o) => !o)
      }}
      className={`flex cursor-pointer flex-col rounded-2xl bg-white p-5 shadow-sm ring-1 transition hover:shadow-md ${status === 'none' ? 'ring-indigo-100' : 'ring-emerald-200'}`}
    >
      <div className="flex items-center justify-between gap-2 text-xs font-semibold">
        <span className="tracking-wide text-slate-500 uppercase">{pick.kind === 'idiom' ? 'Idiom' : 'Phrasal verb'}</span>
        <LevelBadge level={pick.level} />
      </div>
      <div className="mt-3 flex items-start justify-between gap-2">
        <p className="font-display text-2xl leading-tight font-bold text-indigo-950">{pick.term}</p>
        <SpeakButton text={pick.term} />
      </div>
      {/* The real control for keyboard and screen readers; the card click is a shortcut. */}
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className={`mt-3 w-full rounded-xl px-3 py-2 text-left text-sm transition ${
          open ? 'bg-indigo-50 text-indigo-950' : 'border border-dashed border-indigo-200 font-semibold text-indigo-600 hover:bg-indigo-50'
        }`}
      >
        {open ? (
          <>
            <span className="text-xs font-semibold tracking-wide text-indigo-500 uppercase">En español</span>
            <span className="mt-0.5 block text-base font-semibold">{pick.translation}</span>
          </>
        ) : (
          '¿Qué significa? Toca la tarjeta'
        )}
      </button>
      {open && (
        <div className="mt-3 space-y-2 text-sm">
          <p className="font-medium text-slate-900">{pick.definition}</p>
          {pick.example && <p className="text-slate-500 italic">“{pick.example}”</p>}
          {(pick.kind === 'idiom' || pick.kind === 'phrasal') && (
            <Link to={pagePath(pick.kind, pick.id)} className="inline-flex items-center gap-1 text-sm font-medium text-indigo-600 hover:text-indigo-800">
              Ver la ficha completa <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          )}
        </div>
      )}
      <div className="mt-auto pt-4">
        <AddToReview kind={pick.kind} id={pick.id} status={status} onAdd={onAdd} />
      </div>
    </article>
  )
}
