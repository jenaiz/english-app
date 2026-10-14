import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowRight, BookOpen, CalendarClock, Check, ChevronDown, ChevronRight, Loader2, Lock, RotateCcw, Search, Sparkles, Trophy } from 'lucide-react'
import { api } from '../api/client'
import { LessonFlowContext } from '../components/exercises/LessonFlow'
import GrammarRuleStep from '../components/steps/GrammarRuleStep'
import StepRenderer from '../components/steps/StepRenderer'
import BackLink from '../components/ui/BackLink'
import { buttonClass } from '../components/ui/Button'
import CompletionHeader from '../components/ui/CompletionHeader'
import ErrorState from '../components/ui/ErrorState'
import PageShell from '../components/ui/PageShell'
import { inputClass, pillClass, pillCountClass } from '../components/ui/styles'
import { stepMistakes, type Mistake } from '../lib/mistakes'
import type { ExerciseResult, PracticeItemResult, PracticeRound, PracticeRoundResult, PracticeTopicSummary } from '../types'

/** Repaso → Gramática: the list of topics, or a round of one (/repaso/gramatica/:topicId). */
export default function GrammarPractice() {
  const { topicId } = useParams()
  return topicId ? <Round key={topicId} topicId={topicId} /> : <TopicList />
}

const STATUS: Record<PracticeTopicSummary['status'], { label: string; cls: string }> = {
  due: { label: 'Para hoy', cls: 'bg-indigo-600 text-white' },
  new: { label: 'Nuevo', cls: 'bg-amber-50 text-amber-700' },
  done: { label: 'Al día', cls: 'bg-emerald-50 text-emerald-700' },
}

const dateFmt = new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'short' })

/** When a topic is due again, in words: "mañana", "en 3 días", "el 12 nov". */
function dueIn(iso: string): string {
  const days = Math.round((new Date(iso).getTime() - Date.now()) / 86_400_000)
  if (days <= 0) return 'hoy'
  if (days === 1) return 'mañana'
  if (days < 7) return `en ${days} días`
  return `el ${dateFmt.format(new Date(iso))}`
}

// The level tab is remembered on this device.
const LEVEL_KEY = 'grammar-level'
function readLevel(): string | null {
  try {
    return localStorage.getItem(LEVEL_KEY)
  } catch {
    return null // storage unavailable
  }
}
function storeLevel(level: string) {
  try {
    localStorage.setItem(LEVEL_KEY, level)
  } catch {
    // storage unavailable
  }
}

/** Accent-insensitive lower case, for the search box. */
const fold = (s: string) => s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase()

/**
 * Over a hundred topics, mostly locked: the list opens on the learner's level with today's topics
 * on top, shows only the open topics as cards and folds the locked ones away. A search looks
 * across every level.
 */
function TopicList() {
  const [data, setData] = useState<{ topics: PracticeTopicSummary[]; due: number } | null>(null)
  const [error, setError] = useState(false)
  const [level, setLevel] = useState<string | null>(readLevel)
  const [query, setQuery] = useState('')

  useEffect(() => {
    api
      .practice()
      .then(setData)
      .catch(() => setError(true))
  }, [])

  if (error) return <ErrorState />
  if (!data) {
    return (
      <div className="flex justify-center py-24 text-indigo-500">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  const levels = [...new Set(data.topics.map((t) => t.level_id))]
  const open = data.topics.filter((t) => !t.locked)
  const due = open.filter((t) => t.status === 'due')
  // Default: the highest level with an open topic, i.e. where the learner is now.
  const current = level && levels.includes(level) ? level : (open.at(-1)?.level_id ?? levels[0])
  const choose = (l: string) => {
    setLevel(l)
    storeLevel(l)
  }

  const q = fold(query.trim())
  const shown = q ? data.topics.filter((t) => fold(t.title).includes(q)) : data.topics.filter((t) => t.level_id === current)
  const shownOpen = shown.filter((t) => !t.locked)
  const shownLocked = shown.filter((t) => t.locked)

  return (
    <PageShell width="medium">
      <BackLink to="/repaso">Repaso</BackLink>
      <h1 className="h-page mt-3">Gramática</h1>
      <p className="mt-2 max-w-2xl text-slate-600">
        Rondas de 12 ejercicios por tema. Lo que falles vuelve en la siguiente ronda, y cada tema vuelve «para hoy» cuando toca repasarlo.
      </p>

      <dl className="mt-6 grid grid-cols-3 gap-3">
        <Stat value={due.length} label="para hoy" accent={due.length > 0} />
        <Stat value={open.length} label={open.length === 1 ? 'tema abierto' : 'temas abiertos'} />
        <Stat value={data.topics.length - open.length} label="por abrir" />
      </dl>

      {due.length > 0 && (
        <section className="mt-8">
          <h2 className="flex items-center gap-2 font-display text-lg font-bold text-slate-900">
            <CalendarClock className="h-5 w-5 text-indigo-600" /> Para hoy
          </h2>
          <ul className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {due.map((t) => (
              <li key={t.topic_id}>
                <TopicCard topic={t} showLevel />
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="mt-10">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0 sm:pb-0" role="tablist" aria-label="Nivel">
            {levels.map((l) => {
              const all = data.topics.filter((t) => t.level_id === l)
              const opened = all.filter((t) => !t.locked).length
              const active = !q && l === current
              return (
                <button
                  key={l}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => {
                    choose(l)
                    setQuery('')
                  }}
                  className={pillClass(active)}
                >
                  {l}
                  <span className={pillCountClass(active)}>
                    {opened}/{all.length}
                  </span>
                </button>
              )
            })}
          </div>
          <label className="relative sm:ml-auto sm:w-64">
            <span className="sr-only">Buscar un tema</span>
            <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar: past simple, a/an…"
              className={`${inputClass()} py-2 pl-9 text-sm`}
            />
          </label>
        </div>

        {q && (
          <p className="mt-4 text-sm text-slate-500">
            {shown.length === 0 ? `Ningún tema contiene «${query.trim()}».` : `${shown.length} ${shown.length === 1 ? 'tema' : 'temas'} en todos los niveles`}
          </p>
        )}

        {shownOpen.length > 0 && (
          <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {shownOpen.map((t) => (
              <li key={t.topic_id}>
                <TopicCard topic={t} showLevel={!!q} />
              </li>
            ))}
          </ul>
        )}
        {!q && shownOpen.length === 0 && (
          <p className="mt-4 rounded-2xl border border-dashed border-slate-300 px-5 py-6 text-center text-slate-500">
            Todavía no hay temas abiertos en {current}: se abren al empezar sus unidades.
          </p>
        )}

        {shownLocked.length > 0 && (
          <LockedTopics key={`${current}-${q}`} topics={shownLocked} showLevel={!!q} startOpen={!!q || shownOpen.length === 0} />
        )}
      </section>
    </PageShell>
  )
}

function Stat({ value, label, accent = false }: { value: number; label: string; accent?: boolean }) {
  return (
    <div className={`rounded-2xl border px-4 py-3 ${accent ? 'border-indigo-200 bg-indigo-50' : 'border-slate-200 bg-white'}`}>
      <dd className={`font-display text-2xl font-extrabold tabular-nums ${accent ? 'text-indigo-700' : 'text-slate-900'}`}>{value}</dd>
      <dt className="text-sm text-slate-500">{label}</dt>
    </div>
  )
}

function TopicCard({ topic: t, showLevel = false }: { topic: PracticeTopicSummary; showLevel?: boolean }) {
  return (
    <Link
      to={`/repaso/gramatica/${t.topic_id}`}
      className={`group flex h-full flex-col rounded-2xl border bg-white px-4 py-3.5 transition hover:shadow-sm ${
        t.status === 'due' ? 'border-indigo-300 hover:border-indigo-400' : 'border-slate-200 hover:border-indigo-300'
      }`}
    >
      <span className="flex items-start gap-2">
        <span className="min-w-0 flex-1 font-semibold text-slate-900">
          {showLevel && <span className="mr-1.5 text-xs font-bold text-slate-400">{t.level_id}</span>}
          {t.title}
        </span>
        <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS[t.status].cls}`}>{STATUS[t.status].label}</span>
      </span>
      <span className="mt-auto flex items-end gap-3 pt-2">
        <span className="min-w-0 flex-1 text-sm text-slate-500">
          {t.sessions === 0
            ? `${t.items} ejercicios`
            : `${t.sessions} ${t.sessions === 1 ? 'ronda' : 'rondas'} · ${t.accuracy}%${t.status === 'done' && t.due_at ? ` · vuelve ${dueIn(t.due_at)}` : ''}`}
        </span>
        {t.recent.length > 2 && <Trend scores={t.recent} />}
        <ChevronRight className="h-5 w-5 shrink-0 text-indigo-500 transition group-hover:translate-x-0.5" />
      </span>
    </Link>
  )
}

/** Locked topics, folded: a compact list of what opens with which unit. */
function LockedTopics({ topics, showLevel, startOpen }: { topics: PracticeTopicSummary[]; showLevel: boolean; startOpen: boolean }) {
  return (
    <details open={startOpen} className="group mt-6 rounded-2xl border border-dashed border-slate-300">
      <summary className="flex cursor-pointer list-none items-center gap-2 px-4 py-3 text-sm font-medium text-slate-600 hover:text-slate-900">
        <Lock className="h-4 w-4 text-slate-400" />
        <span className="flex-1">
          {topics.length} {topics.length === 1 ? 'tema se abre' : 'temas se abren'} más adelante
        </span>
        <ChevronDown className="h-4 w-4 transition group-open:rotate-180" />
      </summary>
      <ul className="grid gap-x-6 border-t border-dashed border-slate-300 px-4 py-2 sm:grid-cols-2">
        {topics.map((t) => (
          <li key={t.topic_id} className="flex items-baseline gap-2 py-1.5 text-sm">
            <span className="min-w-0 flex-1 text-slate-600">
              {showLevel && <span className="mr-1.5 text-xs font-bold text-slate-400">{t.level_id}</span>}
              {t.title}
            </span>
            {t.opens_with && <span className="max-w-[50%] shrink-0 truncate text-xs text-slate-400">con «{t.opens_with.title}»</span>}
          </li>
        ))}
      </ul>
    </details>
  )
}

/** The last rounds' scores as small bars, oldest first. */
function Trend({ scores }: { scores: number[] }) {
  return (
    <span className="hidden h-8 items-end gap-0.5 sm:flex" aria-label={`Últimas rondas: ${scores.join('%, ')}%`}>
      {scores.map((s, i) => (
        <i key={i} className={`w-1.5 rounded-sm ${s >= 70 ? 'bg-emerald-400' : 'bg-amber-400'}`} style={{ height: `${Math.max(12, s)}%` }} />
      ))}
    </span>
  )
}

function Round({ topicId }: { topicId: string }) {
  const navigate = useNavigate()
  const [round, setRound] = useState<PracticeRound | null>(null)
  const [error, setError] = useState<'locked' | 'other' | null>(null)
  const [index, setIndex] = useState(0)
  const [answered, setAnswered] = useState(false)
  // Items graded in the current step, so the bar moves with each answer.
  const [graded, setGraded] = useState(0)
  const [result, setResult] = useState<{ server: PracticeRoundResult; mistakes: Mistake[] } | null>(null)
  const [saveError, setSaveError] = useState(false)
  const results = useRef<Record<number, ExerciseResult>>({})

  const load = useCallback(() => {
    setRound(null)
    setError(null)
    setIndex(0)
    setAnswered(false)
    setGraded(0)
    setResult(null)
    results.current = {}
    api
      .practiceRound(topicId)
      .then(setRound)
      .catch((e: { status?: number }) => setError(e.status === 403 ? 'locked' : 'other'))
  }, [topicId])
  useEffect(load, [load])

  if (error === 'locked') {
    return (
      <PageShell width="text">
        <BackLink to="/repaso/gramatica">Gramática</BackLink>
        <p className="mt-6 text-slate-600">Este tema se abre cuando empiezas la unidad que lo enseña.</p>
      </PageShell>
    )
  }
  if (error) return <ErrorState />
  if (!round) {
    return (
      <div className="flex justify-center py-24 text-indigo-500">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  const finish = async () => {
    setSaveError(false)
    const items: PracticeItemResult[] = []
    const mistakes: Mistake[] = []
    round.steps.forEach((step, k) => {
      const r = results.current[k]
      if (!r) return
      mistakes.push(...stepMistakes(step, r))
      for (const it of r.items ?? []) {
        const id = step.content.items[it.i]?.id
        if (id) items.push({ id, ok: it.ok, ...(it.answer ? { answer: it.answer } : {}) })
      }
    })
    try {
      const server = await api.finishPractice(topicId, items)
      setResult({ server, mistakes })
      window.dispatchEvent(new Event('srs-changed'))
    } catch {
      setSaveError(true)
    }
  }

  if (result) {
    const { server, mistakes } = result
    const good = server.score >= 70
    return (
      <PageShell width="focus">
        <CompletionHeader
          Icon={good ? Trophy : RotateCcw}
          good={good}
          title={good ? '¡Buena ronda!' : 'Ronda terminada'}
          subtitle={`${round.topic.title}: ${server.correct} de ${server.total} bien. ${good ? 'Este tema' : 'Lo que has fallado'} vuelve ${dueIn(server.due_at)}.`}
        />
        <p className={`mt-6 text-center font-display text-5xl font-extrabold ${good ? 'text-emerald-600' : 'text-amber-600'}`}>{server.score}%</p>
        {mistakes.length > 0 && (
          <div className="mt-6 rounded-2xl border border-slate-200 bg-white text-left">
            <p className="px-5 py-4 font-semibold text-slate-800">{mistakes.length === 1 ? '1 fallo' : `${mistakes.length} fallos`}: saldrán en la próxima ronda</p>
            <ul className="divide-y divide-slate-100 border-t border-slate-100">
              {mistakes.map((m, i) => (
                <li key={i} className="px-5 py-3 text-sm">
                  <p className="text-slate-500">{m.prompt}</p>
                  {m.answer && <p className="mt-1 text-red-600 line-through">{m.answer}</p>}
                  <p className="mt-0.5 font-semibold text-emerald-700">{m.correct}</p>
                </li>
              ))}
            </ul>
          </div>
        )}
        <div className="mt-8 grid gap-3 sm:grid-cols-2">
          <button type="button" onClick={load} className={buttonClass({ variant: 'primary' })} autoFocus>
            <Sparkles className="h-4 w-4" /> Otra ronda
          </button>
          <button type="button" onClick={() => navigate('/repaso/gramatica')} className={buttonClass({ variant: 'secondary' })}>
            Todos los temas
          </button>
        </div>
      </PageShell>
    )
  }

  const step = round.steps[index]
  const isLast = index === round.steps.length - 1
  const next = () => {
    if (isLast) void finish()
    else {
      setIndex(index + 1)
      setAnswered(false)
      setGraded(0)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }
  const nextLabel = isLast ? 'Terminar ronda' : 'Siguiente ejercicio'
  const done = round.steps.slice(0, index).reduce((n, s) => n + s.content.items.length, 0) + graded
  const total = round.steps.reduce((n, s) => n + s.content.items.length, 0)

  return (
    <PageShell width="text">
      <BackLink to="/repaso/gramatica">Gramática</BackLink>
      <div className="mt-3 flex items-center gap-3">
        <h1 className="min-w-0 flex-1 truncate font-display text-2xl font-bold text-slate-900">{round.topic.title}</h1>
        <span className="text-sm font-medium text-slate-500 tabular-nums">
          {done}/{total}
        </span>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
        <div className="h-full rounded-full bg-indigo-600 transition-all duration-300" style={{ width: `${(done / total) * 100}%` }} />
      </div>

      <details className="mt-5 rounded-2xl border border-amber-200 bg-amber-50/50">
        <summary className="flex cursor-pointer items-center gap-2 px-5 py-3 font-medium text-amber-800">
          <BookOpen className="h-4 w-4" /> Ver la regla
        </summary>
        <div className="border-t border-amber-200 bg-white p-5">
          <GrammarRuleStep content={round.topic.rule} />
          {round.topic.units.length > 0 && (
            <p className="mt-5 border-t border-slate-100 pt-4 text-sm text-slate-500">
              Así lo viste en {round.topic.units.length === 1 ? 'la unidad' : 'las unidades'}{' '}
              {round.topic.units.map((u, i) => (
                <span key={u.unit_id}>
                  {i > 0 && (i === round.topic.units.length - 1 ? ' y ' : ', ')}
                  <Link to={`/unidades/${u.unit_id}/estudiar?level=${u.level_id}`} className="font-medium text-indigo-600 hover:underline">
                    {u.title}
                  </Link>
                </span>
              ))}
            </p>
          )}
        </div>
      </details>

      <article className="mt-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
        <LessonFlowContext.Provider value={{ advance: next, nextLabel, onGraded: () => setGraded((g) => g + 1), hideCounter: true }}>
          <StepRenderer
            key={index}
            step={step}
            onComplete={(r) => {
              results.current[index] = r
              setAnswered(true)
            }}
          />
        </LessonFlowContext.Provider>
      </article>

      {saveError && <ErrorState inline message="No se ha podido guardar la ronda." onRetry={finish} className="mt-4" />}

      {answered && (
        <div className="mt-6 flex justify-end">
          <button type="button" onClick={next} className={buttonClass({ variant: isLast ? 'success' : 'primary' })}>
            {nextLabel} {isLast ? <Check className="h-4 w-4" /> : <ArrowRight className="h-4 w-4" />}
          </button>
        </div>
      )}
    </PageShell>
  )
}
