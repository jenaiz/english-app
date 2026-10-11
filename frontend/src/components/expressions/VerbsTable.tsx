import { useMemo, useState } from 'react'
import { ChevronDown, Search } from 'lucide-react'
import type { ExpressionKind, IrregularVerb } from '../../types'
import SpeakButton from '../SpeakButton'
import AddToReview, { type ReviewStatus } from './AddToReview'

interface Props {
  verbs: IrregularVerb[]
  statusOf: (kind: ExpressionKind, id: string) => ReviewStatus
  onAdd: (kind: ExpressionKind, id: string) => Promise<void>
}

/** Irregular verbs as a searchable three-column table; a row opens its story example and "Añadir a mi repaso". */
export default function VerbsTable({ verbs, statusOf, onAdd }: Props) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState<string | null>(null)
  const q = query.trim().toLowerCase()
  const shown = useMemo(
    () =>
      q
        ? verbs.filter((v) => [v.base, v.past, v.participle, v.translation].some((f) => f.toLowerCase().includes(q)))
        : verbs,
    [verbs, q],
  )

  return (
    <div>
      <label className="relative mb-4 flex max-w-sm items-center">
        <span className="sr-only">Buscar verbo</span>
        <Search className="pointer-events-none absolute left-3 h-4 w-4 text-slate-400" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar: go, went, comprar…"
          className="w-full rounded-full border border-slate-200 bg-white py-2 pr-4 pl-9 text-sm shadow-sm focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 focus:outline-none"
        />
      </label>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="hidden grid-cols-[1fr_1fr_1fr_1.4fr_2rem] gap-3 border-b border-slate-200 bg-slate-50 px-5 py-2.5 text-xs font-semibold tracking-wide text-slate-500 uppercase sm:grid">
          <span>Infinitivo</span>
          <span>Past simple</span>
          <span>Participio</span>
          <span>Significado</span>
          <span />
        </div>
        <ul className="divide-y divide-slate-100">
          {shown.map((v) => {
            const isOpen = open === v.id
            const status = statusOf('verb', v.id)
            return (
              <li key={v.id}>
                <button
                  type="button"
                  aria-expanded={isOpen}
                  onClick={() => setOpen(isOpen ? null : v.id)}
                  className="grid w-full grid-cols-3 items-center gap-x-3 gap-y-1 px-5 py-3 text-left transition hover:bg-slate-50 sm:grid-cols-[1fr_1fr_1fr_1.4fr_2rem]"
                >
                  <span className="font-display text-lg font-bold text-slate-900">{v.base}</span>
                  <span className="text-lg font-semibold text-rose-700">{v.past}</span>
                  <span className="text-lg font-semibold text-indigo-700">{v.participle}</span>
                  <span className="col-span-3 flex items-center gap-2 text-sm text-slate-500 sm:col-span-1">
                    {v.translation}
                    {status !== 'none' && (
                      <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                        {status === 'queued' ? 'En cola' : 'En repaso'}
                      </span>
                    )}
                  </span>
                  <ChevronDown className={`hidden h-4 w-4 text-slate-400 transition sm:block ${isOpen ? 'rotate-180' : ''}`} />
                </button>
                {isOpen && (
                  <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 px-5 pt-1 pb-4">
                    <p className="flex items-center gap-2 text-slate-700 italic">
                      “{v.example}”
                      <SpeakButton text={v.example} />
                    </p>
                    <AddToReview kind="verb" id={v.id} status={status} onAdd={onAdd} />
                  </div>
                )}
              </li>
            )
          })}
        </ul>
        {shown.length === 0 && <p className="px-5 py-8 text-center text-sm text-slate-500">Ningún verbo coincide con «{query}».</p>}
      </div>
    </div>
  )
}
