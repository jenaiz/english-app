import { useEffect, useState } from 'react'
import { Link, useLocation, useParams, useSearchParams } from 'react-router-dom'
import { BookA, Lightbulb, List, Loader2 } from 'lucide-react'
import { api } from '../api/client'
import GrammarRuleStep from '../components/steps/GrammarRuleStep'
import WordCard from '../components/WordCard'
import { colorOf } from '../lib/levels'
import type { LevelStudy } from '../types'
import ErrorState from '../components/ui/ErrorState'
import BackLink from '../components/ui/BackLink'

type Tab = 'grammar' | 'vocabulary'

/** Study sheet of a whole level: every unit's grammar or vocabulary on one page, with an index by theme. */
export default function LevelStudyPage() {
  const { levelId = '' } = useParams()
  const [params, setParams] = useSearchParams()
  const { hash } = useLocation()
  const tab: Tab = params.get('tab') === 'vocabulary' ? 'vocabulary' : 'grammar'
  const [data, setData] = useState<LevelStudy | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    setData(null)
    api
      .levelStudy(levelId)
      .then(setData)
      .catch((e: Error) => setError(e.message))
  }, [levelId])

  // Anchors (#theme or #unit) only exist once the content has loaded.
  useEffect(() => {
    if (!data || !hash) return
    document.getElementById(decodeURIComponent(hash.slice(1)))?.scrollIntoView()
  }, [data, hash, tab])

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

  const c = colorOf(data.level_id)
  const units = data.themes.flatMap((t) => t.units)
  const totalWords = units.reduce((n, u) => n + u.vocabulary.length, 0)
  const setTab = (t: Tab) =>
    setParams(
      (p) => {
        p.set('tab', t)
        return p
      },
      { replace: true },
    )

  const index = (
    <nav aria-label="Índice del nivel" className="space-y-4 text-sm">
      {data.themes.map((theme, ti) => (
        <div key={theme.theme_id}>
          <a href={`#${theme.theme_id}`} className={`font-semibold ${c.text} hover:underline`}>
            {ti + 1}. {theme.title}
          </a>
          <ul className="mt-1.5 space-y-1 border-l border-slate-200 pl-3">
            {theme.units.map((u) => (
              <li key={u.unit_id}>
                <a href={`#${u.unit_id}`} className="text-slate-600 hover:text-indigo-700">
                  {u.title}
                </a>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </nav>
  )

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <BackLink to="/levels">Inicio</BackLink>

      <header className="mt-4">
        <p className="text-sm text-slate-500">Ficha de estudio del nivel</p>
        <h1 className="h-page">{data.title}</h1>
        <p className="mt-1 max-w-3xl text-slate-600">{data.description}</p>
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

      {/* On small screens the index folds into a disclosure above the content. */}
      <details className="mt-6 rounded-2xl border border-slate-200 bg-white p-4 lg:hidden">
        <summary className="flex cursor-pointer items-center gap-2 font-semibold text-slate-800">
          <List className="h-4 w-4" /> Índice
        </summary>
        <div className="mt-4">{index}</div>
      </details>

      <div className="mt-6 lg:grid lg:grid-cols-[14rem_1fr] lg:gap-10">
        <aside className="hidden lg:block">
          <div className="sticky top-24 max-h-[calc(100vh-7rem)] overflow-y-auto">{index}</div>
        </aside>

        <div className="min-w-0 space-y-12">
          {data.themes.map((theme, ti) => (
            <section key={theme.theme_id} id={theme.theme_id} className="scroll-mt-24">
              <h2 className="border-b border-slate-200 pb-2 font-display text-2xl font-bold text-slate-900">
                <span className={`mr-2 text-base ${c.text}`}>Tema {ti + 1}</span>
                {theme.title}
              </h2>
              <div className="mt-6 space-y-8">
                {theme.units.map((u) => (
                  <article key={u.unit_id} id={u.unit_id} className="scroll-mt-24">
                    <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
                      <h3 className="font-display text-lg font-bold text-slate-800">{u.title}</h3>
                      <Link
                        to={`/units/${u.unit_id}/study?level=${data.level_id}&tab=${tab}`}
                        className="text-sm font-medium text-indigo-600 hover:text-indigo-800 hover:underline"
                      >
                        Ficha de la unidad
                      </Link>
                    </div>
                    {tab === 'grammar' ? (
                      <div className="space-y-4">
                        {u.grammar.map((g, i) => (
                          <div key={i} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
                            <GrammarRuleStep content={g} />
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="grid gap-3 sm:grid-cols-2">
                        {u.vocabulary.map((it) => (
                          <WordCard key={it.term} item={it} />
                        ))}
                      </div>
                    )}
                  </article>
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    </div>
  )
}
