import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { AlertCircle, ChevronDown, Loader2 } from 'lucide-react'
import { api } from '../api/client'
import HackCard from '../components/expressions/HackCard'
import IdiomCard from '../components/expressions/IdiomCard'
import ParticleExplorer from '../components/expressions/ParticleExplorer'
import PhrasalExplorer from '../components/expressions/PhrasalExplorer'
import { useAuth } from '../context/AuthContext'
import { loadExpressions } from '../lib/expressionsCatalog'
import { useLearnerLevel } from '../lib/useLearnerLevel'
import type { ExpressionKind, ExpressionsCatalog } from '../types'

const TABS = [
  { id: 'idioms', label: 'Idioms', intro: 'Frases hechas que no se entienden palabra por palabra. Intenta adivinar el significado y dale la vuelta a la tarjeta.' },
  { id: 'phrasal', label: 'Phrasal verbs', intro: 'Un verbo, muchas partículas y significados que no se adivinan. Explóralos por verbo o descubre qué idea suele aportar cada partícula.' },
  { id: 'hacks', label: 'English hacks', intro: 'Trucos de gramática funcional que suenan natural y te sirven para casi todo.' },
] as const
type TabId = (typeof TABS)[number]['id']

const LEVEL_ORDER = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2']

// The viewer's own choices of level and scope are remembered on this device.
const LEVEL_KEY = 'expressions-level'
const SCOPE_KEY = 'expressions-scope'
type Scope = 'core' | 'all'

function readStored(key: string): string | null {
  try {
    return localStorage.getItem(key)
  } catch {
    return null // storage unavailable
  }
}
function store(key: string, value: string) {
  try {
    localStorage.setItem(key, value)
  } catch {
    // storage unavailable
  }
}

/** Expressions the user has added to Repaso (with their repetitions), and a function to add more. */
function useSavedExpressions(enabled: boolean) {
  const [saved, setSaved] = useState<Map<string, number>>(new Map())

  useEffect(() => {
    if (!enabled) {
      setSaved(new Map())
      return
    }
    api
      .savedExpressions()
      .then((r) =>
        setSaved(
          new Map([
            ...r.idiom.map((e) => [`idiom:${e.id}`, e.repetitions] as const),
            ...r.phrasal.map((e) => [`phrasal:${e.id}`, e.repetitions] as const),
          ]),
        ),
      )
      .catch(() => {})
  }, [enabled])

  const isSaved = useCallback((kind: ExpressionKind, id: string) => saved.has(`${kind}:${id}`), [saved])
  const repetitionsOf = useCallback((kind: ExpressionKind, id: string) => saved.get(`${kind}:${id}`), [saved])
  const add = useCallback(async (kind: ExpressionKind, id: string) => {
    await api.addExpression(kind, id)
    setSaved((s) => new Map(s).set(`${kind}:${id}`, 0))
    window.dispatchEvent(new Event('srs-changed'))
  }, [])

  return { isSaved, repetitionsOf, add }
}

export default function Expressions() {
  const { user } = useAuth()
  const [params, setParams] = useSearchParams()
  const tab: TabId = TABS.some((t) => t.id === params.get('tab')) ? (params.get('tab') as TabId) : 'idioms'
  const [catalog, setCatalog] = useState<ExpressionsCatalog | null>(null)
  const [error, setError] = useState('')
  const { isSaved, repetitionsOf, add } = useSavedExpressions(!!user)
  const learnerLevel = useLearnerLevel(!!user)
  // null until the viewer picks a level; until then the default follows what they are studying.
  const [pickedLevel, setPickedLevel] = useState<string | null>(() => readStored(LEVEL_KEY))
  const [scope, setScope] = useState<Scope>(() => (readStored(SCOPE_KEY) === 'all' ? 'all' : 'core'))
  const chooseLevel = (l: string) => {
    setPickedLevel(l)
    store(LEVEL_KEY, l)
  }
  const chooseScope = (s: Scope) => {
    setScope(s)
    store(SCOPE_KEY, s)
  }

  useEffect(() => {
    loadExpressions()
      .then(setCatalog)
      .catch((e: Error) => setError(e.message))
  }, [])

  // The level filter applies to the three tabs, so its options come from all the content.
  const levels = useMemo(() => {
    if (!catalog) return []
    const present = new Set([
      ...catalog.idioms.map((i) => i.level),
      ...catalog.phrasal_verbs.flatMap((f) => f.items.map((v) => v.level)),
      ...catalog.hacks.map((h) => h.level),
    ])
    return LEVEL_ORDER.filter((l) => present.has(l))
  }, [catalog])
  // Default: the level the user is studying (A1 learners start at A2, the first level with idioms), else B1.
  const defaultLevel = learnerLevel ? (learnerLevel === 'A1' ? 'A2' : learnerLevel) : 'B1'
  const level = pickedLevel && (pickedLevel === 'all' || levels.includes(pickedLevel)) ? pickedLevel : defaultLevel
  const inLevel = useCallback((l: string) => level === 'all' || l === level, [level])
  const matches = useCallback((l: string, core?: boolean) => inLevel(l) && (scope === 'all' || !!core), [inLevel, scope])
  const [topic, setTopic] = useState('all')
  const levelIdioms = useMemo(() => (catalog?.idioms ?? []).filter((i) => matches(i.level, i.core)), [catalog, matches])
  // Topics with idioms at the chosen level, the largest first. A topic left empty by the level filter falls back to all.
  const topics = useMemo(() => {
    const counts = new Map<string, number>()
    for (const i of levelIdioms) counts.set(i.topic, (counts.get(i.topic) ?? 0) + 1)
    return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'es'))
  }, [levelIdioms])
  // Topics only help in the full catalog; among the essentials they would be mostly one or two idioms each.
  const showTopics = scope === 'all'
  const activeTopic = showTopics && topics.some(([t]) => t === topic) ? topic : 'all'
  const idioms = useMemo(
    () => levelIdioms.filter((i) => activeTopic === 'all' || i.topic === activeTopic),
    [levelIdioms, activeTopic],
  )
  const families = useMemo(
    () =>
      (catalog?.phrasal_verbs ?? [])
        .map((f) => ({ ...f, items: f.items.filter((v) => matches(v.level, v.core)) }))
        .filter((f) => f.items.length > 0),
    [catalog, matches],
  )
  // Hacks are few and all essential, so the scope doesn't apply to them.
  const hacks = useMemo(() => (catalog?.hacks ?? []).filter((h) => inLevel(h.level)), [catalog, inLevel])
  const count = tab === 'idioms' ? idioms.length : tab === 'phrasal' ? families.reduce((n, f) => n + f.items.length, 0) : hacks.length
  // How many more the "Todo" scope would show in this tab and level, for the "Ver N más" link.
  const hiddenCount = useMemo(() => {
    if (!catalog || scope === 'all' || tab === 'hacks') return 0
    if (tab === 'idioms') return catalog.idioms.filter((i) => inLevel(i.level) && !i.core).length
    return catalog.phrasal_verbs.reduce((n, f) => n + f.items.filter((v) => inLevel(v.level) && !v.core).length, 0)
  }, [catalog, scope, tab, inLevel])
  const current = TABS.find((t) => t.id === tab)!
  const axis = params.get('vista') === 'particula' ? 'particula' : 'verbo'

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 md:py-14">
      <h1 className="font-display text-4xl font-bold tracking-tight text-indigo-950 md:text-5xl">Expresiones</h1>
      <p className="mt-3 max-w-2xl text-lg text-slate-600">El inglés que no viene en los libros: lo que dicen los nativos a diario y casi nadie te explica.</p>

      {/* Primary navigation: what kind of expression. Filters below only refine the content. */}
      <div className="mt-8 flex gap-6 overflow-x-auto border-b border-slate-200" role="tablist" aria-label="Tipo de expresión">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={t.id === tab}
            onClick={() => setParams(t.id === 'idioms' ? {} : { tab: t.id }, { replace: true })}
            className={`-mb-px shrink-0 border-b-2 pb-3 text-lg font-semibold transition ${
              t.id === tab ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-800'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      <p className="mt-4 max-w-2xl text-slate-600">{current.intro}</p>

      {catalog && (
        <div className="mt-5 flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
          <div className="flex flex-wrap items-center gap-x-5 gap-y-3 text-sm">
            <label className="relative inline-flex items-center">
              <span className="sr-only">Nivel</span>
              <select
                id="expressions-level"
                value={level}
                onChange={(e) => chooseLevel(e.target.value)}
                className="appearance-none rounded-full border border-slate-200 bg-white py-1.5 pr-9 pl-4 font-semibold text-slate-800 shadow-sm transition hover:border-slate-300 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 focus:outline-none"
              >
                <option value="all">Todos los niveles</option>
                {levels.map((l) => (
                  <option key={l} value={l}>
                    Nivel {l}
                    {l === learnerLevel ? ' · tu nivel' : ''}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 h-4 w-4 text-slate-400" />
            </label>
            {tab !== 'hacks' && (
              <label className="inline-flex cursor-pointer items-center gap-2 font-medium text-slate-700">
                <input
                  id="expressions-core"
                  type="checkbox"
                  role="switch"
                  checked={scope === 'core'}
                  onChange={(e) => chooseScope(e.target.checked ? 'core' : 'all')}
                  className="peer sr-only"
                />
                <span
                  aria-hidden="true"
                  className="relative h-5 w-9 rounded-full bg-slate-300 transition peer-checked:bg-indigo-600 peer-focus-visible:ring-2 peer-focus-visible:ring-indigo-300 after:absolute after:top-0.5 after:left-0.5 after:h-4 after:w-4 after:rounded-full after:bg-white after:shadow after:transition peer-checked:after:translate-x-4"
                />
                Solo esenciales
              </label>
            )}
            <span className="text-slate-400 tabular-nums">
              {count} {tab === 'idioms' ? 'idioms' : tab === 'phrasal' ? 'phrasal verbs' : 'hacks'}
            </span>
          </div>
          {tab === 'phrasal' && (
            <div className="inline-flex rounded-lg bg-slate-100 p-0.5 text-sm" role="group" aria-label="Ver phrasal verbs">
              {(['verbo', 'particula'] as const).map((v) => (
                <button
                  key={v}
                  type="button"
                  aria-pressed={axis === v}
                  onClick={() => setParams(v === 'verbo' ? { tab: 'phrasal' } : { tab: 'phrasal', vista: v }, { replace: true })}
                  className={`rounded-md px-3 py-1 font-medium transition ${axis === v ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
                >
                  {v === 'verbo' ? 'Por verbo' : 'Por partícula'}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {error && (
        <div className="mt-6 flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          <AlertCircle className="h-4 w-4" /> No se han podido cargar las expresiones: {error}
        </div>
      )}

      {!catalog && !error && (
        <div className="flex justify-center py-24 text-indigo-500">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      )}

      {catalog && count === 0 && (
        <div className="mt-8 rounded-2xl border border-dashed border-slate-300 px-6 py-10 text-center text-slate-500">
          {hiddenCount > 0 ? (
            <>
              No hay {tab === 'idioms' ? 'idioms' : 'phrasal verbs'} esenciales de este nivel.{' '}
              <button type="button" onClick={() => chooseScope('all')} className="font-semibold text-indigo-600 hover:text-indigo-800">
                Ver los {hiddenCount} de ampliación
              </button>
            </>
          ) : (
            'Todavía no hay contenido de este nivel aquí. Prueba con otro nivel o con otra pestaña.'
          )}
        </div>
      )}

      {catalog && count > 0 && (
        <div className="mt-8">
          {tab === 'idioms' && (
            <>
              {showTopics && (
                <div className="mb-6 flex flex-wrap items-center gap-1.5" role="group" aria-label="Filtrar por tema">
                  <span className="mr-1 text-sm font-medium text-slate-500">Tema:</span>
                  {[['all', levelIdioms.length] as const, ...topics].map(([t, n]) => (
                    <button
                      key={t}
                      type="button"
                      aria-pressed={activeTopic === t}
                      onClick={() => setTopic(t)}
                      className={`rounded-full px-3 py-1 text-sm font-medium transition ${
                        activeTopic === t ? 'bg-slate-900 text-white' : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:ring-slate-300'
                      }`}
                    >
                      {t === 'all' ? 'Todos' : t} <span className={activeTopic === t ? 'text-slate-300' : 'text-slate-400'}>{n}</span>
                    </button>
                  ))}
                </div>
              )}
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {idioms.map((i) => (
                  <IdiomCard key={i.id} idiom={i} saved={isSaved('idiom', i.id)} onAdd={add} />
                ))}
              </div>
            </>
          )}

          {/* Keyed by level so the selected verb and particle reset when the filter changes the list. */}
          {tab === 'phrasal' && (
            <>
              {/* Keyed so the selection resets when the level filter or a deep link changes the starting point. */}
              {axis === 'verbo' ? (
                <PhrasalExplorer
                  key={`${level}-${params.get('verbo')}-${params.get('particula')}`}
                  families={families}
                  initialRoot={params.get('verbo') ?? undefined}
                  initialParticle={params.get('particula') ?? undefined}
                  repetitionsOf={repetitionsOf}
                  onAdd={add}
                />
              ) : (
                <ParticleExplorer
                  key={`${level}-${params.get('particula')}`}
                  families={families}
                  particles={catalog.particles}
                  initialParticle={params.get('particula') ?? undefined}
                  repetitionsOf={repetitionsOf}
                  onAdd={add}
                  onOpenVerb={(root, particle) => {
                    setParams({ tab: 'phrasal', verbo: root, particula: particle })
                    window.scrollTo({ top: 0, behavior: 'smooth' })
                  }}
                />
              )}
            </>
          )}

          {tab === 'hacks' && (
            <div className="grid gap-5 md:grid-cols-2">
              {hacks.map((h) => (
                <HackCard key={h.id} hack={h} />
              ))}
            </div>
          )}

          {hiddenCount > 0 && (
            <div className="mt-10 flex flex-col items-center gap-2 text-center">
              <p className="text-sm text-slate-500">
                Estás viendo los esenciales. Cuando los domines, amplía con {hiddenCount} más de este nivel.
              </p>
              <button
                type="button"
                onClick={() => chooseScope('all')}
                className="rounded-full bg-indigo-50 px-5 py-2 text-sm font-semibold text-indigo-700 transition hover:bg-indigo-100"
              >
                Ver {hiddenCount} más
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
