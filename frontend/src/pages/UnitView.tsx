import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { ArrowLeft, ArrowRight, Brain, CheckCircle2, ClipboardCheck, History, Home, Loader2, PartyPopper, RotateCcw, type LucideIcon } from 'lucide-react'
import { api } from '../api/client'
import UnlockReveal from '../components/club/UnlockReveal'
import UnitExpressions from '../components/expressions/UnitExpressions'
import { LessonFlowContext } from '../components/exercises/LessonFlow'
import StepRenderer, { EXERCISE_TYPES } from '../components/steps/StepRenderer'
import { flattenUnits, type UnitEntry } from '../lib/levels'
import { PHASES } from '../lib/phases'
import type { ExerciseResult, Phase, Step, Unit, UnitResponse, UnitSummary, UnlockedActivity, VocabularyTableContent } from '../types'
import CompletionHeader from '../components/ui/CompletionHeader'
import ErrorState from '../components/ui/ErrorState'
import BackLink from '../components/ui/BackLink'
import { buttonClass } from '../components/ui/Button'

interface FlatStep {
  step: Step
  lessonId: string
  lessonTitle: string
  lessonIndex: number
  isTest: boolean
  isLastInLesson: boolean
}

const stepLabels: Record<string, string> = {
  audio_context: 'Contexto',
  grammar_rule: 'Gramática',
  vocabulary_table: 'Vocabulario',
  multiple_choice: 'Test',
  match_pairs: 'Emparejar',
  fill_blanks: 'Rellenar huecos',
  word_order: 'Ordenar la frase',
  transformation: 'Transformación',
  translation: 'Traducción',
  dictation: 'Dictado',
  speaking: 'Hablar',
  speed_quiz: 'Quiz de velocidad',
}

interface LessonSummary {
  title: string
  score: number
  correct: number
  total: number
  cardsAdded: number
  /** Club activities this lesson unlocked (finishing a unit or passing a checkpoint). */
  unlocked: UnlockedActivity[]
  isTest: boolean
  /** Every lesson of the unit is completed (not just this one, which may be the last). */
  unitDone: boolean
  /** The next lesson not completed yet, in course order; null when the whole course is done. */
  next: NextLesson | null
}

interface NextLesson {
  unitId: string
  levelId: string
  unitTitle: string
  lessonId: string
  lessonTitle: string
  /** It opens its unit: the first lesson of a unit not started. */
  firstOfUnit: boolean
}

const summaryOf = (u: Unit): UnitSummary => ({
  unit_id: u.unit_id,
  title: u.title,
  description: u.description,
  lesson_ids: u.lessons.map((l) => l.lesson_id),
  lessons: u.lessons.map((l) => ({ lesson_id: l.lesson_id, title: l.title, kind: l.kind, grammar: [] })),
})

/**
 * The first lesson not completed after `lessonId` in course order, wrapping around to the
 * lessons skipped earlier. A learner who jumped ahead and came back is not sent to a lesson
 * they already did.
 */
function nextIncomplete(course: UnitEntry[], lessonId: string, completed: Set<string>): NextLesson | null {
  const all = course.flatMap((e) =>
    e.unit.lessons.map((l, i) => ({
      unitId: e.unit.unit_id,
      levelId: e.levelId,
      unitTitle: e.unit.title,
      lessonId: l.lesson_id,
      lessonTitle: l.title,
      firstOfUnit: i === 0,
    })),
  )
  const at = all.findIndex((l) => l.lessonId === lessonId)
  const ordered = [...all.slice(at + 1), ...all.slice(0, Math.max(at, 0))]
  return ordered.find((l) => !completed.has(l.lessonId)) ?? null
}

export default function UnitView() {
  const { unitId = '' } = useParams()
  const [params] = useSearchParams()
  const navigate = useNavigate()

  const [data, setData] = useState<UnitResponse | null>(null)
  const [loadError, setLoadError] = useState('')
  const [saveError, setSaveError] = useState('')
  const [index, setIndex] = useState(0)
  const [furthest, setFurthest] = useState(0)
  const [saving, setSaving] = useState(false)
  const [results, setResults] = useState<Record<number, ExerciseResult>>({})
  const [summary, setSummary] = useState<LessonSummary | null>(null)
  const [course, setCourse] = useState<UnitEntry[]>([])

  /** The step was restored from where the learner left the unit, to say so. */
  const [resumed, setResumed] = useState(false)

  // Load the unit and decide where to start: ?step=N, else the saved position (when it is in
  // the ?lesson= asked for, if any), else ?lesson=, else the first lesson not completed.
  useEffect(() => {
    setData(null)
    setIndex(0)
    setFurthest(0)
    setResults({})
    setSummary(null)
    setResumed(false)
    let cancelled = false
    Promise.all([
      api.unit(params.get('level'), unitId),
      api.position(unitId).then((r) => r.position, () => null),
      api.progress().catch(() => null),
    ])
      .then(([res, pos, progress]) => {
        if (cancelled) return
        const lessons = res.unit.lessons
        const total = lessons.reduce((n, l) => n + l.steps.length, 0)
        const startOf = (lessonId: string) => {
          let i = 0
          for (const l of lessons) {
            if (l.lesson_id === lessonId) return i
            i += l.steps.length
          }
          return -1
        }
        const askedStep = Number(params.get('step'))
        const askedLesson = params.get('lesson')
        let i = 0
        let restored: Record<number, ExerciseResult> = {}
        if (askedStep) {
          i = Math.min(Math.max(askedStep, 1), total) - 1
        } else if (pos && startOf(pos.lesson_id) >= 0 && (!askedLesson || askedLesson === pos.lesson_id)) {
          const base = startOf(pos.lesson_id)
          const length = lessons.find((l) => l.lesson_id === pos.lesson_id)!.steps.length
          i = base + Math.min(pos.step, length - 1)
          for (const [k, r] of Object.entries(pos.results)) if (Number(k) < length) restored[base + Number(k)] = r
          setResumed(pos.step > 0)
        } else if (askedLesson && startOf(askedLesson) >= 0) {
          i = startOf(askedLesson)
        } else {
          const done = new Set(progress?.lessons.filter((l) => l.status === 'completed').map((l) => l.lesson_id))
          const todo = lessons.find((l) => !done.has(l.lesson_id))
          i = todo ? startOf(todo.lesson_id) : 0
        }
        resultsRef.current = restored
        setResults(restored)
        setIndex(i)
        setFurthest(i)
        setData(res)
      })
      .catch((e: Error) => !cancelled && setLoadError(e.message))
    return () => {
      cancelled = true
    }
  }, [unitId, params])

  // The whole course, to find the next lesson to do when this one ends.
  useEffect(() => {
    let cancelled = false
    api
      .levels()
      .then((levels) => !cancelled && setCourse(flattenUnits(levels)))
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [])

  const steps = useMemo<FlatStep[]>(() => {
    if (!data) return []
    return data.unit.lessons.flatMap((lesson, li) =>
      lesson.steps.map((step, si) => ({
        step,
        lessonId: lesson.lesson_id,
        lessonTitle: lesson.title,
        lessonIndex: li,
        isTest: lesson.kind === 'test',
        isLastInLesson: si === lesson.steps.length - 1,
      })),
    )
  }, [data])

  // Enter on the page (not in a field or on a button) presses "Siguiente", e.g. right after
  // an exercise's last item. Set during render once the step is known.
  const advanceRef = useRef<(() => void) | null>(null)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Enter' || e.isComposing || e.repeat) return
      if (e.target instanceof Element && e.target.closest('input, textarea, select, button, a, [role="button"]')) return
      if (!advanceRef.current) return
      e.preventDefault()
      advanceRef.current()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])
  advanceRef.current = null

  // Save on the server where the learner is (step and the lesson's graded exercises), so
  // leaving the unit half done never means starting over. Saves go out one after another so
  // a slow one can't overwrite a newer position.
  const resultsRef = useRef<Record<number, ExerciseResult>>({})
  const saveChain = useRef(Promise.resolve())
  const savePosition = (i: number, res: Record<number, ExerciseResult>) => {
    const target = steps[i]
    if (!target) return
    const first = steps.findIndex((s) => s.lessonId === target.lessonId)
    const lessonResults: Record<string, ExerciseResult> = {}
    for (const [k, r] of Object.entries(res)) {
      const j = Number(k)
      if (steps[j]?.lessonId === target.lessonId) lessonResults[j - first] = r
    }
    const position = { lesson_id: target.lessonId, step: i - first, results: lessonResults }
    saveChain.current = saveChain.current.then(() => api.savePosition(unitId, position)).catch(() => {})
  }

  // Keep the first result if the learner goes back and redoes an exercise.
  const recordResult = (r: ExerciseResult) => {
    if (resultsRef.current[index]) return
    const res = { ...resultsRef.current, [index]: r }
    resultsRef.current = res
    setResults(res)
    savePosition(index, res)
  }

  const goTo = (i: number, res = resultsRef.current) => {
    resultsRef.current = res
    setResults(res)
    setIndex(i)
    setFurthest((f) => Math.max(f, i))
    setResumed(false)
    savePosition(i, res)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  if (loadError) {
    return (
      <div className="mx-auto mt-12 max-w-md px-4">
        <ErrorState className="mt-0" />
        <Link to="/niveles" className="mt-4 inline-block text-indigo-600 hover:underline">
          ← Volver a Inicio
        </Link>
      </div>
    )
  }
  if (!data) {
    return (
      <div className="flex justify-center py-24 text-indigo-500">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  const { unit } = data

  if (summary) {
    return (
      <LessonComplete
        summary={summary}
        unitTitle={unit.title}
        sameUnit={summary.next?.unitId === unit.unit_id}
        onNext={(target) => {
          setSummary(null)
          if (target.unitId !== unit.unit_id) {
            navigate(`/unidades/${target.unitId}?level=${target.levelId}&lesson=${target.lessonId}`)
            return
          }
          const i = steps.findIndex((s) => s.lessonId === target.lessonId)
          goTo(i >= 0 ? i : index + 1)
        }}
        onRestart={() => {
          setSummary(null)
          goTo(0, {})
        }}
        onLevels={() => navigate('/niveles')}
        onReview={() => navigate('/repaso')}
      />
    )
  }

  const current = steps[index]
  if (!current) return null

  const isExercise = EXERCISE_TYPES.has(current.step.type)
  const canAdvance = !isExercise || !!results[index]
  const lessonSteps = steps.map((s, i) => ({ ...s, i })).filter((s) => s.lessonIndex === current.lessonIndex)

  const finishLesson = async () => {
    let correct = 0
    let total = 0
    // From the ref: the last exercise may have reported its result in this same click.
    for (const s of lessonSteps) {
      const r = resultsRef.current[s.i]
      if (r) {
        correct += r.correct
        total += r.total
      }
    }
    const score = total ? Math.round((correct / total) * 100) : 100
    const res = await api.complete(unit.unit_id, current.lessonId, score)
    if (res.cards_added > 0) window.dispatchEvent(new Event('srs-changed'))
    if (res.unlocked_activities?.length) window.dispatchEvent(new Event('club-changed'))
    // Lessons completed in the whole course, to skip them when proposing the next one.
    const completed = new Set(res.completed_lessons)
    try {
      for (const l of (await api.progress()).lessons) if (l.status === 'completed') completed.add(l.lesson_id)
    } catch {
      // Without the full progress, at least this unit's lessons are known.
    }
    completed.add(current.lessonId)
    setSummary({
      title: current.lessonTitle,
      score,
      correct,
      total,
      cardsAdded: res.cards_added,
      unlocked: res.unlocked_activities ?? [],
      isTest: current.isTest,
      unitDone: unit.lessons.every((l) => completed.has(l.lesson_id)),
      // If the course list failed to load, at least look in this unit.
      next: nextIncomplete(course.length ? course : [{ unit: summaryOf(unit), levelId: data.level_id, themeTitle: '' }], current.lessonId, completed),
    })
  }

  const next = async () => {
    setSaving(true)
    setSaveError('')
    try {
      if (current.isLastInLesson) await finishLesson()
      else goTo(index + 1)
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : 'No se pudo guardar el progreso')
    } finally {
      setSaving(false)
    }
  }

  if (canAdvance && !saving) advanceRef.current = next
  const nextLabel = current.isLastInLesson ? (current.isTest ? 'Terminar test' : 'Terminar lección') : 'Siguiente'

  const currentPhase = PHASES.findIndex((p) => p.id === current.step.phase)
  const phaseFirstStep = (phase: Phase) => lessonSteps.find((s) => s.step.phase === phase)?.i
  const posInLesson = lessonSteps.findIndex((s) => s.i === index)

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <BackLink to="/niveles">Inicio</BackLink>

      <div className="mt-4">
        <p className="text-xs font-semibold tracking-wide text-indigo-600 uppercase">
          {data.level_id} · {unit.title}
          {unit.lessons.length > 1 && ` · Lección ${current.lessonIndex + 1} de ${unit.lessons.length}`}
        </p>
        <h1 className="mt-1 font-display text-2xl font-extrabold tracking-tight text-slate-900 md:text-3xl">{current.lessonTitle}</h1>
      </div>

      {/* 7-phase stepper (tests have no phases) */}
      {!current.isTest && <ol className="mt-6 grid grid-cols-7 gap-1">
        {PHASES.map((p, pi) => {
          const target = phaseFirstStep(p.id)
          const reachable = target !== undefined && target <= furthest
          const state = pi < currentPhase ? 'done' : pi === currentPhase ? 'current' : 'todo'
          return (
            <li key={p.id}>
              <button
                type="button"
                disabled={!reachable}
                onClick={() => target !== undefined && goTo(target)}
                className="group flex w-full flex-col items-center gap-1.5 disabled:cursor-default"
                title={p.label}
              >
                <span
                  className={`grid h-9 w-9 place-items-center rounded-full border-2 transition sm:h-10 sm:w-10 ${
                    state === 'current'
                      ? 'border-indigo-600 bg-indigo-600 text-white shadow-md shadow-indigo-200'
                      : state === 'done'
                        ? 'border-emerald-500 bg-emerald-50 text-emerald-600'
                        : 'border-slate-200 bg-white text-slate-300'
                  } ${reachable && state !== 'current' ? 'group-hover:border-indigo-400' : ''}`}
                >
                  {state === 'done' ? <CheckCircle2 className="h-4 w-4 sm:h-5 sm:w-5" /> : <p.Icon className="h-4 w-4 sm:h-5 sm:w-5" />}
                </span>
                <span
                  className={`hidden text-[11px] font-medium sm:block ${
                    state === 'current' ? 'text-indigo-700' : state === 'done' ? 'text-emerald-700' : 'text-slate-400'
                  }`}
                >
                  {p.label}
                </span>
              </button>
            </li>
          )
        })}
      </ol>}

      <div className="mt-4 flex items-center gap-3">
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-200">
          <div
            className="h-full rounded-full bg-indigo-600 transition-all duration-300"
            style={{ width: `${((posInLesson + 1) / lessonSteps.length) * 100}%` }}
          />
        </div>
        <span className="text-xs font-medium text-slate-500 tabular-nums">
          {posInLesson + 1}/{lessonSteps.length}
        </span>
      </div>

      {resumed && (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-x-4 gap-y-1 rounded-xl bg-indigo-50 px-4 py-2.5 text-sm text-indigo-800">
          <span className="flex items-center gap-2 font-medium">
            <History className="h-4 w-4" /> Seguimos donde lo dejaste
          </span>
          <button
            type="button"
            onClick={() => goTo(lessonSteps[0].i, Object.fromEntries(Object.entries(results).filter(([k]) => steps[Number(k)]?.lessonIndex !== current.lessonIndex)))}
            className="font-medium text-indigo-600 underline-offset-2 hover:underline"
          >
            Empezar la lección desde el principio
          </button>
        </div>
      )}

      <article className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
        <div className="mb-5 flex items-center gap-2">
          {current.isTest ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-700">
              <ClipboardCheck className="h-3.5 w-3.5" /> Test
            </span>
          ) : (
            <span className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-semibold text-indigo-700">
              {currentPhase + 1}. {PHASES[currentPhase]?.label}
            </span>
          )}
          {/* The step type, unless the phase badge already says it ("Contexto · Contexto"). */}
          {(stepLabels[current.step.type] ?? current.step.type) !== (current.isTest ? 'Test' : PHASES[currentPhase]?.label) && (
            <span className="text-xs font-medium text-slate-400">{stepLabels[current.step.type] ?? current.step.type}</span>
          )}
        </div>
        <LessonFlowContext.Provider value={{ advance: next, nextLabel }}>
          <StepRenderer key={index} step={current.step} onComplete={recordResult} />
        </LessonFlowContext.Provider>
      </article>

      {current.step.type === 'vocabulary_table' && (
        <UnitExpressions unitId={unitId} excludeTerms={(current.step.content as VocabularyTableContent).items.map((it) => it.term)} />
      )}

      {saveError && (
        <ErrorState inline message="No se ha podido guardar tu progreso." onRetry={next} className="mt-4" />
      )}

      <div className="mt-6 flex items-center justify-between">
        <button
          onClick={() => goTo(Math.max(0, index - 1))}
          disabled={index === 0}
          className={buttonClass({ variant: 'secondary' })}
        >
          <ArrowLeft className="h-4 w-4" /> Anterior
        </button>
        {/* While an exercise is being answered its own button moves the lesson on: no second one here. */}
        {canAdvance ? (
          <button onClick={next} disabled={saving} className={buttonClass({ variant: current.isLastInLesson ? 'success' : 'primary' })}>
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            {nextLabel} {current.isLastInLesson ? <CheckCircle2 className="h-4 w-4" /> : <ArrowRight className="h-4 w-4" />}
          </button>
        ) : (
          <p className="text-sm text-slate-500">Responde para seguir</p>
        )}
      </div>
    </div>
  )
}

function LessonComplete({
  summary,
  unitTitle,
  sameUnit,
  onNext,
  onRestart,
  onLevels,
  onReview,
}: {
  summary: LessonSummary
  unitTitle: string
  /** The next lesson is in this same unit. */
  sameUnit: boolean
  onNext: (target: NextLesson) => void
  onRestart: () => void
  onLevels: () => void
  onReview: () => void
}) {
  const good = summary.score >= 70
  const { next } = summary
  return (
    <div className="mx-auto max-w-lg px-4 py-16 text-center">
      {/* A failed test is no party: neutral icon and title, and the advice below says what to do. */}
      <CompletionHeader
        Icon={summary.isTest && !good ? RotateCcw : PartyPopper}
        good={good}
        title={summary.isTest ? (good ? '¡Test superado!' : 'Test terminado') : summary.unitDone ? '¡Unidad completada!' : '¡Lección completada!'}
        subtitle={`${summary.unitDone ? unitTitle : summary.title}. Tu progreso se ha guardado.`}
      />
      {summary.isTest && (
        <p className={`mt-3 font-medium ${good ? 'text-emerald-700' : 'text-amber-700'}`}>
          {good ? 'Aprobado: dominas lo visto hasta aquí.' : 'Te conviene repasar las unidades anteriores antes de seguir.'}
        </p>
      )}

      <div className="mt-8 grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <p className={`text-4xl font-extrabold ${good ? 'text-emerald-600' : 'text-amber-600'}`}>{summary.score}%</p>
          <p className="mt-1 text-sm text-slate-500">
            {summary.correct}/{summary.total} aciertos
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <p className="flex items-center justify-center gap-2 text-4xl font-extrabold text-indigo-600">
            <Brain className="h-8 w-8" /> {summary.cardsAdded}
          </p>
          <p className="mt-1 text-sm text-slate-500">tarjetas nuevas para repasar</p>
        </div>
      </div>

      <UnlockReveal activities={summary.unlocked} />

      <div className="mt-8 space-y-3">
        {next ? (
          <PrimaryAction
            onClick={() => onNext(next)}
            label={sameUnit ? 'Siguiente lección' : next.firstOfUnit ? 'Siguiente unidad' : 'Lección pendiente'}
            title={sameUnit ? next.lessonTitle : next.firstOfUnit ? next.unitTitle : `${next.unitTitle} · ${next.lessonTitle}`}
          />
        ) : (
          <PrimaryAction onClick={onLevels} label="Has terminado el curso" title="Volver a Inicio" />
        )}
        <div className={`grid gap-3 ${summary.unitDone && next ? 'grid-cols-3' : 'grid-cols-2'}`}>
          {summary.unitDone && (
            <SecondaryAction onClick={onRestart} Icon={RotateCcw}>
              Repetir unidad
            </SecondaryAction>
          )}
          <SecondaryAction onClick={onReview} Icon={Brain}>
            Ir a repaso
          </SecondaryAction>
          {next && (
            <SecondaryAction onClick={onLevels} Icon={Home}>
              Volver a Inicio
            </SecondaryAction>
          )}
        </div>
      </div>
    </div>
  )
}

/** The one thing to do next: big, full width and focused so Enter takes it. */
function PrimaryAction({ to, onClick, label, title }: { to?: string; onClick?: () => void; label: string; title: string }) {
  // React only autofocuses form controls, so focus the link by hand.
  const ref = useRef<HTMLAnchorElement & HTMLButtonElement>(null)
  useEffect(() => ref.current?.focus(), [])
  const cls =
    'group flex w-full items-center justify-between gap-4 rounded-2xl bg-indigo-600 px-6 py-4 text-left text-white shadow-lg shadow-indigo-200 transition hover:bg-indigo-700 focus-visible:ring-4 focus-visible:ring-indigo-200 focus-visible:outline-none'
  const body = (
    <>
      <span className="min-w-0">
        <span className="block text-xs font-semibold tracking-wide text-indigo-200 uppercase">{label}</span>
        <span className="mt-0.5 block truncate text-lg font-bold">{title}</span>
      </span>
      <ArrowRight className="h-5 w-5 shrink-0 transition group-hover:translate-x-0.5" />
    </>
  )
  return to ? (
    <Link ref={ref} to={to} className={cls}>
      {body}
    </Link>
  ) : (
    <button ref={ref} type="button" onClick={onClick} className={cls}>
      {body}
    </button>
  )
}

function SecondaryAction({ onClick, Icon, children }: { onClick: () => void; Icon: LucideIcon; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex flex-col items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-2 py-3 text-sm font-medium text-slate-700 transition hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700"
    >
      <Icon className="h-5 w-5 text-slate-400" />
      {children}
    </button>
  )
}
