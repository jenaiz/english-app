import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  BookA,
  Brain,
  CheckCircle2,
  Headphones,
  Lightbulb,
  Loader2,
  Mic,
  PartyPopper,
  PencilLine,
  Search,
  Zap,
  type LucideIcon,
} from 'lucide-react'
import { api } from '../api/client'
import StepRenderer, { EXERCISE_TYPES } from '../components/steps/StepRenderer'
import type { ExerciseResult, Phase, Step, UnitResponse } from '../types'

interface FlatStep {
  step: Step
  lessonId: string
  lessonTitle: string
  lessonIndex: number
  isLastInLesson: boolean
}

const PHASES: { id: Phase; label: string; Icon: LucideIcon }[] = [
  { id: 'context', label: 'Contexto', Icon: Headphones },
  { id: 'discovery', label: 'Descubre', Icon: Search },
  { id: 'grammar', label: 'Gramática', Icon: Lightbulb },
  { id: 'practice', label: 'Práctica', Icon: PencilLine },
  { id: 'production', label: 'Producción', Icon: Mic },
  { id: 'vocabulary', label: 'Vocabulario', Icon: BookA },
  { id: 'review', label: 'Repaso', Icon: Zap },
]

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
  isLastLesson: boolean
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

  useEffect(() => {
    setData(null)
    setIndex(0)
    setFurthest(0)
    setResults({})
    setSummary(null)
    api
      .unit(params.get('level'), unitId)
      .then(setData)
      .catch((e: Error) => setLoadError(e.message))
  }, [unitId, params])

  // Start at the lesson given in ?lesson= (used by "Continuar").
  const startLesson = params.get('lesson')
  useEffect(() => {
    if (!data || !startLesson) return
    let i = 0
    for (const l of data.unit.lessons) {
      if (l.lesson_id === startLesson) {
        setIndex(i)
        setFurthest(i)
        return
      }
      i += l.steps.length
    }
  }, [data, startLesson])

  const steps = useMemo<FlatStep[]>(() => {
    if (!data) return []
    return data.unit.lessons.flatMap((lesson, li) =>
      lesson.steps.map((step, si) => ({
        step,
        lessonId: lesson.lesson_id,
        lessonTitle: lesson.title,
        lessonIndex: li,
        isLastInLesson: si === lesson.steps.length - 1,
      })),
    )
  }, [data])

  // Keep the first result if the learner goes back and redoes an exercise.
  const recordResult = useCallback(
    (r: ExerciseResult) => setResults((prev) => (prev[index] ? prev : { ...prev, [index]: r })),
    [index],
  )

  const goTo = (i: number) => {
    setIndex(i)
    setFurthest((f) => Math.max(f, i))
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  if (loadError) {
    return (
      <div className="mx-auto mt-12 max-w-md px-4">
        <div className="flex items-center gap-2 rounded-lg bg-red-50 p-4 text-red-700">
          <AlertCircle className="h-5 w-5" /> {loadError}
        </div>
        <Link to="/levels" className="mt-4 inline-block text-indigo-600 hover:underline">
          ← Volver a niveles
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
        onNext={() => {
          setSummary(null)
          goTo(index + 1)
        }}
        onRestart={() => {
          setSummary(null)
          setResults({})
          goTo(0)
        }}
        onLevels={() => navigate('/levels')}
        onReview={() => navigate('/review')}
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
    for (const s of lessonSteps) {
      const r = results[s.i]
      if (r) {
        correct += r.correct
        total += r.total
      }
    }
    const score = total ? Math.round((correct / total) * 100) : 100
    const res = await api.complete(unit.unit_id, current.lessonId, score)
    if (res.cards_added > 0) window.dispatchEvent(new Event('srs-changed'))
    setSummary({
      title: current.lessonTitle,
      score,
      correct,
      total,
      cardsAdded: res.cards_added,
      isLastLesson: index === steps.length - 1,
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

  const currentPhase = PHASES.findIndex((p) => p.id === current.step.phase)
  const phaseFirstStep = (phase: Phase) => lessonSteps.find((s) => s.step.phase === phase)?.i
  const posInLesson = lessonSteps.findIndex((s) => s.i === index)

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <Link to="/levels" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-indigo-600">
        <ArrowLeft className="h-4 w-4" /> Inicio
      </Link>

      <div className="mt-4">
        <p className="text-xs font-semibold tracking-wide text-indigo-600 uppercase">
          {data.level_id} · {unit.title}
        </p>
        <h1 className="mt-1 text-2xl font-bold text-slate-900">
          {unit.lessons.length > 1 && <span className="text-slate-400">Lección {current.lessonIndex + 1}/{unit.lessons.length} · </span>}
          {current.lessonTitle}
        </h1>
      </div>

      {/* 7-phase stepper */}
      <ol className="mt-6 grid grid-cols-7 gap-1">
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
      </ol>

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

      <article className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
        <div className="mb-5 flex items-center gap-2">
          <span className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-semibold text-indigo-700">
            {currentPhase + 1}. {PHASES[currentPhase]?.label}
          </span>
          <span className="text-xs font-medium text-slate-400">{stepLabels[current.step.type] ?? current.step.type}</span>
        </div>
        <StepRenderer key={index} step={current.step} onComplete={recordResult} />
      </article>

      {saveError && (
        <div className="mt-4 flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          <AlertCircle className="h-4 w-4" /> {saveError}
        </div>
      )}

      <div className="mt-6 flex items-center justify-between">
        <button
          onClick={() => goTo(Math.max(0, index - 1))}
          disabled={index === 0}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-40"
        >
          <ArrowLeft className="h-4 w-4" /> Anterior
        </button>
        <button
          onClick={next}
          disabled={saving || !canAdvance}
          title={canAdvance ? undefined : 'Completa el ejercicio para continuar'}
          className={`inline-flex items-center gap-2 rounded-lg px-5 py-2.5 font-semibold text-white shadow-sm transition disabled:opacity-40 ${
            current.isLastInLesson ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-indigo-600 hover:bg-indigo-700'
          }`}
        >
          {saving && <Loader2 className="h-4 w-4 animate-spin" />}
          {current.isLastInLesson ? (
            <>
              Terminar lección <CheckCircle2 className="h-4 w-4" />
            </>
          ) : (
            <>
              Siguiente <ArrowRight className="h-4 w-4" />
            </>
          )}
        </button>
      </div>
    </div>
  )
}

function LessonComplete({
  summary,
  unitTitle,
  onNext,
  onRestart,
  onLevels,
  onReview,
}: {
  summary: LessonSummary
  unitTitle: string
  onNext: () => void
  onRestart: () => void
  onLevels: () => void
  onReview: () => void
}) {
  const good = summary.score >= 70
  return (
    <div className="mx-auto max-w-lg px-4 py-16 text-center">
      <div className={`mx-auto grid h-20 w-20 place-items-center rounded-full ${good ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'}`}>
        <PartyPopper className="h-10 w-10" />
      </div>
      <h1 className="mt-6 text-3xl font-bold text-slate-900">{summary.isLastLesson ? '¡Unidad completada!' : '¡Lección completada!'}</h1>
      <p className="mt-2 text-slate-500">
        {summary.isLastLesson ? unitTitle : summary.title}. Tu progreso se ha guardado.
      </p>

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

      <div className="mt-8 flex flex-wrap justify-center gap-3">
        {summary.isLastLesson ? (
          <>
            <button onClick={onRestart} className="rounded-lg border border-slate-300 px-5 py-2.5 font-medium text-slate-700 hover:bg-slate-50">
              Repetir unidad
            </button>
            <button onClick={onReview} className="rounded-lg border border-indigo-300 px-5 py-2.5 font-medium text-indigo-700 hover:bg-indigo-50">
              Ir a repaso
            </button>
            <button onClick={onLevels} className="rounded-lg bg-indigo-600 px-5 py-2.5 font-semibold text-white hover:bg-indigo-700">
              Volver a niveles
            </button>
          </>
        ) : (
          <button onClick={onNext} className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-6 py-2.5 font-semibold text-white hover:bg-indigo-700">
            Siguiente lección <ArrowRight className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  )
}
