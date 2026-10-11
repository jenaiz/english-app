import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { pagePath } from '../../lib/expressionPages'
import type { ExpressionSummary } from '../../lib/todayPicks'
import type { ExpressionKind } from '../../types'
import SpeakButton from '../SpeakButton'
import AddToReview, { type ReviewStatus } from './AddToReview'

interface Props {
  item: ExpressionSummary
  status: ReviewStatus
  onAdd: (kind: ExpressionKind, id: string) => Promise<void>
}

/** Compact card for one expression: term with audio, meaning on demand and "Añadir a mi repaso". */
export default function ExpressionTile({ item: pick, status, onAdd }: Props) {
  const [open, setOpen] = useState(false)
  return (
    <article className={`flex flex-col rounded-2xl bg-white p-5 shadow-sm ring-1 ${status === 'none' ? 'ring-indigo-100' : 'ring-emerald-200'}`}>
      <div className="flex items-center justify-between gap-2 text-xs font-semibold">
        <span className="tracking-wide text-slate-500 uppercase">{pick.kind === 'idiom' ? 'Idiom' : 'Phrasal verb'}</span>
        <span className="rounded-full bg-yellow-300 px-2 py-0.5 text-slate-900">{pick.level}</span>
      </div>
      <div className="mt-3 flex items-start justify-between gap-2">
        <p className="font-display text-2xl leading-tight font-bold text-indigo-950">{pick.term}</p>
        <SpeakButton text={pick.term} />
      </div>
      {open ? (
        <div className="mt-3 space-y-2 text-sm">
          <p className="font-medium text-slate-900">{pick.definition}</p>
          <p className="text-slate-600">En español: {pick.translation}</p>
          {pick.example && <p className="text-slate-500 italic">“{pick.example}”</p>}
          {(pick.kind === 'idiom' || pick.kind === 'phrasal') && (
            <Link to={pagePath(pick.kind, pick.id)} className="inline-flex items-center gap-1 text-sm font-medium text-indigo-600 hover:text-indigo-800">
              Ver la ficha completa <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          )}
        </div>
      ) : (
        <button type="button" onClick={() => setOpen(true)} className="mt-3 self-start text-sm font-semibold text-indigo-600 hover:text-indigo-800">
          ¿Qué significa? Ver
        </button>
      )}
      <div className="mt-auto pt-4">
        <AddToReview kind={pick.kind} id={pick.id} status={status} onAdd={onAdd} />
      </div>
    </article>
  )
}
