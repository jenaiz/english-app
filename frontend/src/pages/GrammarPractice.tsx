import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowRight, BookOpen, Check, ChevronRight, Dumbbell, Loader2, Lock, RotateCcw, Sparkles, Trophy } from 'lucide-react'
import { api } from '../api/client'
import { LessonFlowContext } from '../components/exercises/LessonFlow'
import GrammarRuleStep from '../components/steps/GrammarRuleStep'
import StepRenderer from '../components/steps/StepRenderer'
import BackLink from '../components/ui/BackLink'
import { buttonClass } from '../components/ui/Button'
import CompletionHeader from '../components/ui/CompletionHeader'
import ErrorState from '../components/ui/ErrorState'
import PageShell from '../components/ui/PageShell'
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

function TopicList() {
  const [data, setData] = useState<{ topics: PracticeTopicSummary[]; due: number } | null>(null)
  const [error, setError] = useState(false)

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
  return (
    <PageShell width="text">
      <BackLink to="/repaso">Repaso</BackLink>
      <h1 className="h-page mt-3">Gramática</h1>
      <p className="mt-2 text-slate-600">
        Leer una regla no basta: hay que practicarla muchas veces. Cada ronda son 12 ejercicios de un tema; lo que falles vuelve en la siguiente, y el tema
        vuelve a salir «para hoy» cuando toca repasarlo.
      </p>

      {levels.map((level) => (
        <section key={level} className="mt-8">
          <h2 className="h-section">{level}</h2>
          <ul className="mt-3 grid gap-3">
            {data.topics
              .filter((t) => t.level_id === level)
              .map((t) => (
                <li key={t.topic_id}>
                  <TopicRow topic={t} />
                </li>
              ))}
          </ul>
        </section>
      ))}
    </PageShell>
  )
}

function TopicRow({ topic: t }: { topic: PracticeTopicSummary }) {
  const body = (
    <>
      <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${t.locked ? 'bg-slate-100 text-slate-400' : 'bg-indigo-50 text-indigo-600'}`}>
        {t.locked ? <Lock className="h-5 w-5" /> : <Dumbbell className="h-5 w-5" />}
      </span>
      <span className="min-w-0 flex-1">
        <span className={`block font-semibold ${t.locked ? 'text-slate-500' : 'text-slate-900'}`}>{t.title}</span>
        <span className="block text-sm text-slate-500">
          {t.locked
            ? `Se abre en la unidad «${t.opens_with?.title ?? ''}»`
            : t.sessions === 0
              ? `${t.items} ejercicios`
              : `${t.sessions} ${t.sessions === 1 ? 'ronda' : 'rondas'} · ${t.accuracy}% de aciertos${t.status === 'done' && t.due_at ? ` · vuelve ${dueIn(t.due_at)}` : ''}`}
        </span>
      </span>
      {t.recent.length > 1 && <Trend scores={t.recent} />}
      {!t.locked && <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS[t.status].cls}`}>{STATUS[t.status].label}</span>}
      {!t.locked && <ChevronRight className="h-5 w-5 shrink-0 text-indigo-500 transition group-hover:translate-x-0.5" />}
    </>
  )
  const cls = 'group flex items-center gap-4 rounded-2xl border bg-white px-4 py-3.5'
  if (t.locked) return <div className={`${cls} border-dashed border-slate-300`}>{body}</div>
  return (
    <Link to={`/repaso/gramatica/${t.topic_id}`} className={`${cls} border-slate-200 transition hover:border-indigo-300 hover:shadow-sm`}>
      {body}
    </Link>
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
  const [result, setResult] = useState<{ server: PracticeRoundResult; mistakes: Mistake[] } | null>(null)
  const [saveError, setSaveError] = useState(false)
  const results = useRef<Record<number, ExerciseResult>>({})

  const load = useCallback(() => {
    setRound(null)
    setError(null)
    setIndex(0)
    setAnswered(false)
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
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }
  const nextLabel = isLast ? 'Terminar ronda' : 'Siguiente ejercicio'
  const done = round.steps.slice(0, index).reduce((n, s) => n + s.content.items.length, 0)
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
        </div>
      </details>

      <article className="mt-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
        <LessonFlowContext.Provider value={{ advance: next, nextLabel }}>
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
