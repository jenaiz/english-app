import { useEffect, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { BookA, Brain, Layers, Lightbulb, Loader2, Play } from 'lucide-react'
import { api } from '../api/client'
import GrammarRuleStep from '../components/steps/GrammarRuleStep'
import PhrasalFamilyLinks from '../components/expressions/PhrasalFamilyLinks'
import UnitExpressions from '../components/expressions/UnitExpressions'
import WordCard from '../components/WordCard'
import type { GrammarRuleContent, UnitResponse, VocabularyTableContent } from '../types'
import ErrorState from '../components/ui/ErrorState'
import BackLink from '../components/ui/BackLink'

type Tab = 'grammar' | 'vocabulary'

/** Reference view of a unit: its grammar rules and vocabulary, without replaying the lessons. */
export default function Study() {
  const { unitId = '' } = useParams()
  const [params, setParams] = useSearchParams()
  const tab: Tab = params.get('tab') === 'vocabulary' ? 'vocabulary' : 'grammar'
  const [data, setData] = useState<UnitResponse | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    api
      .unit(params.get('level'), unitId)
      .then(setData)
      .catch((e: Error) => setError(e.message))
    // The tab lives in the URL too; only refetch when the unit changes.
  }, [unitId])

  if (error) {
    return (
      <ErrorState />
    )
  }
  if (!data) {
    return (
      <div className="flex justify-center py-24 text-indigo-500">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  const { unit, level_id } = data
  const perLesson = unit.lessons.map((l) => ({
    lesson: l,
    grammar: l.steps.filter((s) => s.type === 'grammar_rule').map((s) => s.content as GrammarRuleContent),
    vocab: l.steps.filter((s) => s.type === 'vocabulary_table').flatMap((s) => (s.content as VocabularyTableContent).items),
  }))
  const totalWords = perLesson.reduce((n, l) => n + l.vocab.length, 0)
  // Tests have no grammar or vocabulary: only label sections when more than one lesson has content.
  const multi = perLesson.filter((l) => l.grammar.length > 0 || l.vocab.length > 0).length > 1

  const setTab = (t: Tab) => setParams((p) => {
    p.set('tab', t)
    return p
  }, { replace: true })

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <BackLink to="/levels">Inicio</BackLink>
        <Link
          to={`/levels/${level_id}/study?tab=${tab}#${unit.unit_id}`}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-indigo-600 hover:text-indigo-800 hover:underline"
        >
          <Layers className="h-4 w-4" /> Ver todo {level_id}
        </Link>
      </div>

      <header className="mt-4 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm text-slate-500">Ficha de estudio de {level_id}</p>
          <h1 className="h-page">{unit.title}</h1>
        </div>
        <Link
          to={`/units/${unit.unit_id}?level=${level_id}`}
          className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-700"
        >
          <Play className="h-4 w-4" /> Hacer la unidad
        </Link>
      </header>

      <div role="tablist" className="mt-6 inline-flex rounded-xl bg-slate-100 p-1">
        {(
          [
            { id: 'grammar', label: 'Gramática', Icon: Lightbulb, iconCls: 'text-amber-500' },
            { id: 'vocabulary', label: `Vocabulario (${totalWords})`, Icon: BookA, iconCls: 'text-emerald-600' },
          ] as const
        ).map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition ${
              tab === t.id ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <t.Icon className={`h-4 w-4 ${t.iconCls}`} /> {t.label}
          </button>
        ))}
      </div>

      {tab === 'grammar' ? (
        <div className="mt-6 space-y-6">
          {perLesson.map(({ lesson, grammar }) =>
            grammar.map((g, i) => (
              <section key={`${lesson.lesson_id}-${i}`} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
                {multi && <p className="mb-4 text-sm text-slate-500">{lesson.title}</p>}
                <GrammarRuleStep content={g} />
              </section>
            )),
          )}
        </div>
      ) : (
        <div className="mt-6 space-y-6">
          {perLesson.filter((l) => l.vocab.length > 0).map(({ lesson, vocab }) => (
            <section key={lesson.lesson_id}>
              {multi && <h2 className="mb-3 font-display text-lg font-bold text-slate-800">{lesson.title}</h2>}
              <div className="grid gap-3 sm:grid-cols-2">
                {vocab.map((it) => (
                  <WordCard key={it.term} item={it} />
                ))}
              </div>
            </section>
          ))}
          <UnitExpressions unitId={unitId} excludeTerms={perLesson.flatMap((l) => l.vocab.map((it) => it.term))} />
          <PhrasalFamilyLinks terms={perLesson.flatMap((l) => l.vocab.map((it) => it.term))} />
          <Link
            to="/review"
            className="flex items-center gap-4 rounded-2xl border-2 border-dashed border-indigo-200 p-5 text-indigo-700 transition hover:border-indigo-400 hover:bg-indigo-50"
          >
            <Brain className="h-6 w-6 shrink-0" />
            <span>
              <span className="font-semibold">Practica estas palabras en el repaso.</span>{' '}
              <span className="text-indigo-600/80">Las palabras de las lecciones completadas se añaden solas.</span>
            </span>
          </Link>
        </div>
      )}
    </div>
  )
}
