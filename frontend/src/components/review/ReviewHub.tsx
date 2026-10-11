import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { AlertCircle, BookA, Brain, Check, ChevronRight, Loader2, Plus, Quote, Sparkles } from 'lucide-react'
import { api } from '../../api/client'
import type { CardKind, SrsSummary } from '../../types'

export type Deck = 'all' | CardKind

export const DECKS: { id: Deck; label: string }[] = [
  { id: 'all', label: 'Repaso mixto' },
  { id: 'vocab', label: 'Vocabulario' },
  { id: 'phrasal', label: 'Phrasal verbs' },
  { id: 'idiom', label: 'Idioms' },
]

const KINDS: { id: CardKind; label: string; detail: string; icon: typeof BookA; tone: string; bar: string; empty: string }[] = [
  {
    id: 'vocab',
    label: 'Vocabulario',
    detail: 'De tus lecciones · escuchar o decirlo en inglés',
    icon: BookA,
    tone: 'bg-yellow-100 text-yellow-700',
    bar: 'bg-yellow-300',
    empty: 'Se llena al completar lecciones',
  },
  {
    id: 'phrasal',
    label: 'Phrasal verbs',
    detail: 'Significado en una frase, partícula, phrasal verb, decirlo',
    icon: Sparkles,
    tone: 'bg-indigo-100 text-indigo-700',
    bar: 'bg-indigo-200',
    empty: 'Añádelos desde Expresiones',
  },
  {
    id: 'idiom',
    label: 'Idioms',
    detail: 'Significado, situación, completar, decirlo',
    icon: Quote,
    tone: 'bg-emerald-100 text-emerald-700',
    bar: 'bg-emerald-300',
    empty: 'Añádelos desde Expresiones',
  },
]

// Rough pace of a review card, to tell the learner how long today's session takes.
const SECONDS_PER_CARD = 20

/** Repaso landing: today's cards by kind. The mixed session is the main action; decks are for focused practice. */
export default function ReviewHub({ onStart }: { onStart: (deck: Deck) => void }) {
  const [summary, setSummary] = useState<SrsSummary | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    api
      .srsSummary()
      .then(setSummary)
      .catch((e: Error) => setError(e.message))
  }, [])

  if (error) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10">
        <div className="flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          <AlertCircle className="h-4 w-4" /> {error}
        </div>
      </div>
    )
  }
  if (!summary) {
    return (
      <div className="flex justify-center py-24 text-indigo-500">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  const minutes = Math.max(1, Math.round((summary.due * SECONDS_PER_CARD) / 60))

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-900">
        <Brain className="h-6 w-6 text-indigo-600" /> Repaso
      </h1>

      <div className="mt-6 grid gap-5 md:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)]">
        <section className="flex flex-col gap-4 rounded-3xl bg-indigo-600 p-6 text-white">
          <p className="text-sm font-semibold tracking-wide text-indigo-200 uppercase">Para hoy</p>
          <p className="font-display text-6xl leading-none font-extrabold tabular-nums">{summary.due}</p>
          {summary.due > 0 ? (
            <>
              <div className="flex h-2.5 overflow-hidden rounded-full bg-white/20" aria-hidden="true">
                {KINDS.map((k) => (
                  <i key={k.id} className={k.bar} style={{ width: `${(summary.by_kind[k.id].due / summary.due) * 100}%` }} />
                ))}
              </div>
              <ul className="space-y-1.5 text-sm">
                {KINDS.map((k) => (
                  <li key={k.id} className="flex justify-between tabular-nums">
                    <span className="flex items-center gap-2">
                      <i className={`h-2.5 w-2.5 rounded-sm ${k.bar}`} /> {k.label}
                    </span>
                    {summary.by_kind[k.id].due}
                  </li>
                ))}
              </ul>
              <p className="text-sm text-indigo-200">Unos {minutes} min</p>
              <button
                onClick={() => onStart('all')}
                className="mt-auto self-start rounded-xl bg-white px-5 py-2.5 font-semibold text-indigo-700 shadow-sm transition hover:bg-indigo-50"
              >
                Empezar repaso mixto
              </button>
            </>
          ) : (
            <p className="text-indigo-100">
              {summary.total > 0
                ? '¡Todo al día! Vuelve más tarde para las siguientes tarjetas.'
                : 'Todavía no tienes tarjetas. Completa lecciones o añade idioms y phrasal verbs desde Expresiones.'}
            </p>
          )}
        </section>

        <section className="grid content-start gap-3" aria-label="Mazos">
          {KINDS.map((k) => {
            const c = summary.by_kind[k.id]
            const Icon = k.icon
            // Three states, with the trailing slot always present so the counts line up:
            // due → open the deck; done → nothing to do today; empty → go and add cards.
            const state = c.due > 0 ? 'due' : c.total > 0 ? 'done' : 'empty'
            const body = (
              <>
                <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${k.tone}`}>
                  <Icon className="h-5 w-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold text-slate-900">{k.label}</span>
                  <span className="block text-sm text-slate-500">
                    {state === 'empty' ? k.empty : state === 'done' ? 'Al día · vuelve más tarde' : k.detail}
                  </span>
                </span>
                <span className="text-right tabular-nums">
                  <span className={`block font-display text-xl font-bold ${state === 'due' ? 'text-slate-900' : 'text-slate-300'}`}>{c.due}</span>
                  <span className="block text-xs text-slate-400">de {c.total}</span>
                </span>
                <span className="grid h-7 w-7 shrink-0 place-items-center" aria-hidden="true">
                  {state === 'due' && <ChevronRight className="h-5 w-5 text-indigo-500 transition group-hover:translate-x-0.5" />}
                  {state === 'done' && (
                    <span className="grid h-7 w-7 place-items-center rounded-full bg-emerald-50 text-emerald-600">
                      <Check className="h-4 w-4" />
                    </span>
                  )}
                  {state === 'empty' && (
                    <span className="grid h-7 w-7 place-items-center rounded-full border border-dashed border-slate-300 text-slate-400 transition group-hover:border-indigo-400 group-hover:text-indigo-600">
                      <Plus className="h-4 w-4" />
                    </span>
                  )}
                </span>
              </>
            )
            const cls = 'group flex items-center gap-4 rounded-2xl border bg-white px-4 py-3.5 text-left'
            if (state === 'due') {
              return (
                <button key={k.id} onClick={() => onStart(k.id)} className={`${cls} border-slate-200 transition hover:border-indigo-300 hover:shadow-sm`}>
                  {body}
                </button>
              )
            }
            if (state === 'empty') {
              const to = k.id === 'vocab' ? '/levels' : `/expresiones${k.id === 'phrasal' ? '?tab=phrasal' : ''}`
              return (
                <Link key={k.id} to={to} className={`${cls} border-dashed border-slate-300 transition hover:border-indigo-300`}>
                  {body}
                </Link>
              )
            }
            return (
              <div key={k.id} className={`${cls} border-slate-200`}>
                {body}
              </div>
            )
          })}
        </section>
      </div>
    </div>
  )
}
