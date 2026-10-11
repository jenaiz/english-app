import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { AlertCircle, BookA, Brain, Check, CheckCircle2, Lightbulb, Loader2, Play, RotateCcw } from 'lucide-react'
import { api } from '../api/client'
import { useAuth } from '../context/AuthContext'
import { useSrsSummary } from '../lib/useSrsSummary'
import { colorOf } from '../lib/levels'
import { firstName } from '../lib/user'
import type { LessonProgress, LevelSummary, ProgressResponse, UnitSummary } from '../types'

type UnitStatus = 'completed' | 'in_progress' | 'pending'

interface UnitEntry {
  unit: UnitSummary
  levelId: string
  themeTitle: string
}

export default function Levels() {
  const { user } = useAuth()
  const [levels, setLevels] = useState<LevelSummary[]>([])
  const [progress, setProgress] = useState<ProgressResponse>({ lessons: [], completed_units: [] })
  const [selected, setSelected] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const srs = useSrsSummary(true)

  useEffect(() => {
    Promise.all([api.levels(), api.progress()])
      .then(([lv, pr]) => {
        setLevels(lv)
        setProgress(pr)
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  const lessonById = useMemo(() => {
    const m = new Map<string, LessonProgress>()
    for (const l of progress.lessons) m.set(l.lesson_id, l)
    return m
  }, [progress])
  const completedUnits = useMemo(() => new Set(progress.completed_units), [progress])

  const allUnits = useMemo<UnitEntry[]>(
    () => levels.flatMap((lv) => lv.themes.flatMap((t) => t.units.map((unit) => ({ unit, levelId: lv.level_id, themeTitle: t.title })))),
    [levels],
  )

  const statusOf = (u: UnitSummary): UnitStatus => {
    if (completedUnits.has(u.unit_id)) return 'completed'
    if (u.lesson_ids.some((id) => lessonById.get(id)?.status === 'completed')) return 'in_progress'
    return 'pending'
  }

  // "Continue": the unit of the most recent activity if unfinished, otherwise the next unit after it.
  const next = useMemo(() => {
    if (allUnits.length === 0) return null
    const recent = progress.lessons[0]
    let idx = recent ? allUnits.findIndex((e) => e.unit.unit_id === recent.unit_id) : 0
    if (idx < 0) idx = 0
    const ordered = [...allUnits.slice(idx), ...allUnits.slice(0, idx)]
    const entry = ordered.find((e) => !completedUnits.has(e.unit.unit_id))
    if (!entry) return null
    const lesson = entry.unit.lessons.find((l) => lessonById.get(l.lesson_id)?.status !== 'completed') ?? entry.unit.lessons[0]
    return { ...entry, lesson, started: entry.unit.lesson_ids.some((id) => lessonById.has(id)) }
  }, [allUnits, progress, completedUnits, lessonById])

  useEffect(() => {
    if (selected || levels.length === 0) return
    let stored: string | null = null
    try {
      stored = sessionStorage.getItem('selectedLevel')
    } catch {
      // storage unavailable
    }
    setSelected(stored ?? next?.levelId ?? levels[0].level_id)
  }, [levels, next, selected])

  const select = (id: string) => {
    setSelected(id)
    try {
      sessionStorage.setItem('selectedLevel', id)
    } catch {
      // storage unavailable
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-24 text-indigo-500">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }
  if (error) {
    return (
      <div className="mx-auto mt-12 flex max-w-md items-center gap-2 rounded-lg bg-red-50 p-4 text-red-700">
        <AlertCircle className="h-5 w-5" /> {error}
      </div>
    )
  }

  const levelStats = (lv: LevelSummary) => {
    const units = lv.themes.flatMap((t) => t.units)
    return { total: units.length, done: units.filter((u) => completedUnits.has(u.unit_id)).length }
  }
  const lessonsDone = progress.lessons.filter((l) => l.status === 'completed').length
  const current = levels.find((l) => l.level_id === selected)
  const greetName = user ? firstName(user) : ''

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      {/* Greeting + headline numbers */}
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl font-extrabold tracking-tight text-slate-900">
            Hola{greetName && `, ${greetName}`}
          </h1>
          <p className="mt-1 text-slate-500">
            {lessonsDone === 0 ? 'Empieza tu primera lección cuando quieras.' : `Llevas ${lessonsDone} ${lessonsDone === 1 ? 'lección completada' : 'lecciones completadas'}.`}
          </p>
        </div>
        <dl className="flex gap-6 text-sm">
          <div>
            <dt className="text-slate-500">Unidades</dt>
            <dd className="font-display text-2xl font-bold text-slate-900 tabular-nums">
              {completedUnits.size}
              <span className="text-base font-semibold text-slate-400">/{allUnits.length}</span>
            </dd>
          </div>
          <div>
            <dt className="text-slate-500">Vocabulario</dt>
            <dd className="font-display text-2xl font-bold text-slate-900 tabular-nums">
              {srs?.total ?? 0}
              <span className="text-base font-semibold text-slate-400"> palabras</span>
            </dd>
          </div>
        </dl>
      </header>

      {/* Continue + review */}
      <section className="mt-8 grid gap-4 lg:grid-cols-[1fr_20rem]">
        {next ? (
          <ContinueCard entry={next} />
        ) : (
          <div className="flex items-center gap-4 rounded-3xl bg-emerald-600 p-6 text-white">
            <CheckCircle2 className="h-10 w-10 shrink-0" />
            <div>
              <p className="font-display text-xl font-bold">Has completado todas las unidades</p>
              <p className="text-emerald-100">Repasa la gramática o el vocabulario de cualquier unidad desde abajo.</p>
            </div>
          </div>
        )}
        <ReviewCard due={srs?.due ?? 0} total={srs?.total ?? 0} />
      </section>

      {/* CEFR route */}
      <section className="mt-12" aria-label="Niveles">
        <h2 className="font-display text-2xl font-bold text-slate-900">Tu ruta</h2>
        <LevelRoute levels={levels} selected={selected} onSelect={select} stats={levelStats} />
      </section>

      {/* Units of the selected level */}
      {current && (
        <section className="mt-8">
          <div className={`flex flex-wrap items-center justify-between gap-3 rounded-2xl px-5 py-4 ${colorOf(current.level_id).soft}`}>
            <div>
              <h3 className={`font-display text-xl font-bold ${colorOf(current.level_id).text}`}>{current.title}</h3>
              <p className="text-sm text-slate-600">{current.description}</p>
            </div>
            <LevelProgress {...levelStats(current)} levelId={current.level_id} />
          </div>

          <div className="mt-5 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {current.themes.flatMap((theme) =>
              theme.units.map((u) => (
                <UnitCard
                  key={u.unit_id}
                  unit={u}
                  levelId={current.level_id}
                  themeTitle={theme.title}
                  status={statusOf(u)}
                  lessonById={lessonById}
                />
              )),
            )}
          </div>
        </section>
      )}
    </div>
  )
}

function ContinueCard({ entry }: { entry: UnitEntry & { lesson: UnitSummary['lessons'][number]; started: boolean } }) {
  const c = colorOf(entry.levelId)
  const lessonIndex = entry.unit.lessons.indexOf(entry.lesson)
  return (
    <div className="relative overflow-hidden rounded-3xl bg-slate-900 p-6 text-white sm:p-8">
      <span className={`absolute inset-y-0 left-0 w-2 ${c.solid}`} aria-hidden />
      <p className="text-sm text-slate-400">{entry.started ? 'Continúa donde lo dejaste' : 'Siguiente unidad'}</p>
      <div className="mt-3 flex flex-wrap items-end justify-between gap-5">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-sm text-slate-300">
            <span className={`rounded-md px-1.5 py-0.5 text-xs font-bold text-white ${c.solid}`}>{entry.levelId}</span>
            {entry.themeTitle}
          </p>
          <p className="mt-2 font-display text-3xl leading-tight font-bold">{entry.unit.title}</p>
          <p className="mt-1 text-slate-300">
            {entry.unit.lessons.length > 1 && `Lección ${lessonIndex + 1} de ${entry.unit.lessons.length}: `}
            {entry.lesson.title}
          </p>
        </div>
        <Link
          to={`/units/${entry.unit.unit_id}?level=${entry.levelId}&lesson=${entry.lesson.lesson_id}`}
          className="inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3 font-semibold text-slate-900 transition hover:bg-indigo-50 focus-visible:ring-4 focus-visible:ring-indigo-300 focus-visible:outline-none"
        >
          <Play className="h-4 w-4 fill-current" />
          {entry.started ? 'Continuar' : 'Empezar'}
        </Link>
      </div>
    </div>
  )
}

function ReviewCard({ due, total }: { due: number; total: number }) {
  const has = due > 0
  return (
    <Link
      to="/review"
      className={`group flex flex-col justify-between rounded-3xl border-2 p-6 transition focus-visible:ring-4 focus-visible:ring-indigo-300 focus-visible:outline-none ${
        has ? 'border-indigo-600 bg-indigo-600 text-white hover:bg-indigo-700' : 'border-slate-200 bg-white text-slate-700 hover:border-indigo-300'
      }`}
    >
      <Brain className={`h-7 w-7 ${has ? 'text-indigo-200' : 'text-indigo-500'}`} />
      <div className="mt-4">
        <p className="font-display text-2xl font-bold">{has ? `${due} por repasar` : 'Repaso al día'}</p>
        <p className={`text-sm ${has ? 'text-indigo-100' : 'text-slate-500'}`}>
          {has ? 'Cinco minutos ahora fijan las palabras.' : total > 0 ? 'Vuelve cuando toque la siguiente tarjeta.' : 'Completa una lección para crear tus tarjetas.'}
        </p>
      </div>
    </Link>
  )
}

function ProgressRing({ value, color }: { value: number; color: string }) {
  const size = 64
  const r = (size - 6) / 2
  const circ = 2 * Math.PI * r
  return (
    <svg viewBox={`0 0 ${size} ${size}`} className="absolute inset-0 h-full w-full -rotate-90" aria-hidden>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={4} className="stroke-slate-200" />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        strokeWidth={4}
        stroke={color}
        strokeLinecap="round"
        strokeDasharray={circ}
        strokeDashoffset={circ * (1 - value)}
        className="transition-[stroke-dashoffset] duration-700"
      />
    </svg>
  )
}

function LevelRoute({
  levels,
  selected,
  onSelect,
  stats,
}: {
  levels: LevelSummary[]
  selected: string | null
  onSelect: (id: string) => void
  stats: (lv: LevelSummary) => { total: number; done: number }
}) {
  return (
    <ol className="relative mt-6 flex justify-between">
      {/* The path: one segment per gap, coloured once the level before it is finished. */}
      <div className="absolute inset-x-6 top-6 flex sm:inset-x-8 sm:top-8" aria-hidden>
        {levels.slice(0, -1).map((lv) => {
          const s = stats(lv)
          const done = s.total > 0 && s.done === s.total
          return <div key={lv.level_id} className={`h-1 flex-1 rounded-full ${done ? colorOf(lv.level_id).solid : 'bg-slate-200'}`} />
        })}
      </div>
      {levels.map((lv) => {
        const s = stats(lv)
        const c = colorOf(lv.level_id)
        const active = lv.level_id === selected
        const complete = s.total > 0 && s.done === s.total
        return (
          <li key={lv.level_id} className="relative z-10 flex flex-col items-center">
            <button
              onClick={() => onSelect(lv.level_id)}
              aria-pressed={active}
              aria-label={`${lv.title}: ${s.done} de ${s.total} unidades`}
              className={`relative grid h-12 w-12 place-items-center rounded-full font-display text-base font-extrabold sm:h-16 sm:w-16 sm:text-lg transition focus-visible:ring-4 focus-visible:outline-none ${c.ring} ${
                active ? `scale-110 text-white shadow-lg ${c.solid}` : `bg-white ${c.text} hover:scale-105`
              }`}
            >
              {!active && <ProgressRing value={s.total ? s.done / s.total : 0} color={c.hex} />}
              {complete && !active ? <Check className="h-5 w-5 sm:h-6 sm:w-6" strokeWidth={3} /> : lv.level_id}
            </button>
            <span className={`mt-2 hidden text-xs font-medium sm:block ${active ? c.text : 'text-slate-500'}`}>
              {lv.title.replace(lv.level_id, '').trim()}
            </span>
            <span className="text-xs text-slate-400 tabular-nums">
              {s.done}/{s.total}
            </span>
          </li>
        )
      })}
    </ol>
  )
}

function LevelProgress({ done, total, levelId }: { done: number; total: number; levelId: string }) {
  const pct = total ? Math.round((done / total) * 100) : 0
  return (
    <div className="flex items-center gap-3">
      <div className="h-2 w-32 overflow-hidden rounded-full bg-white">
        <div className={`h-full rounded-full ${colorOf(levelId).solid}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-sm font-semibold text-slate-700 tabular-nums">{pct}%</span>
    </div>
  )
}

const STATUS: Record<UnitStatus, { label: string; cls: string }> = {
  completed: { label: 'Completada', cls: 'bg-emerald-100 text-emerald-800' },
  in_progress: { label: 'En curso', cls: 'bg-amber-100 text-amber-800' },
  pending: { label: 'Sin empezar', cls: 'bg-slate-100 text-slate-600' },
}

function UnitCard({
  unit,
  levelId,
  themeTitle,
  status,
  lessonById,
}: {
  unit: UnitSummary
  levelId: string
  themeTitle: string
  status: UnitStatus
  lessonById: Map<string, LessonProgress>
}) {
  const c = colorOf(levelId)
  const base = `/units/${unit.unit_id}`
  const nextLesson = unit.lessons.find((l) => lessonById.get(l.lesson_id)?.status !== 'completed')
  const grammar = [...new Set(unit.lessons.flatMap((l) => l.grammar))]

  const cta =
    status === 'completed'
      ? { label: 'Repetir unidad', Icon: RotateCcw, href: `${base}?level=${levelId}` }
      : status === 'in_progress'
        ? { label: 'Continuar', Icon: Play, href: `${base}?level=${levelId}&lesson=${nextLesson?.lesson_id ?? ''}` }
        : { label: 'Empezar', Icon: Play, href: `${base}?level=${levelId}` }

  return (
    <article className="flex flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <p className={`text-sm font-medium ${c.text}`}>{themeTitle}</p>
        <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS[status].cls}`}>{STATUS[status].label}</span>
      </div>
      <h4 className="mt-2 font-display text-xl leading-snug font-bold text-slate-900">{unit.title}</h4>
      <p className="mt-1 text-sm text-slate-500">{unit.description}</p>

      {/* Lessons, with the best score once completed */}
      <ul className="mt-4 space-y-1.5">
        {unit.lessons.map((l) => {
          const p = lessonById.get(l.lesson_id)
          const done = p?.status === 'completed'
          return (
            <li key={l.lesson_id} className="flex items-center gap-2 text-sm">
              <span className={`grid h-5 w-5 shrink-0 place-items-center rounded-full ${done ? `${c.solid} text-white` : 'border-2 border-slate-200'}`}>
                {done && <Check className="h-3 w-3" strokeWidth={3} />}
              </span>
              <span className={`flex-1 truncate ${done ? 'text-slate-700' : 'text-slate-500'}`}>{l.title}</span>
              {l.kind === 'test' && (
                <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700">Test</span>
              )}
              {done && <span className="text-xs font-semibold text-slate-400 tabular-nums">{p.score}%</span>}
            </li>
          )
        })}
      </ul>

      {grammar.length > 0 && (
        <p className="mt-4 flex items-start gap-1.5 text-sm text-slate-600">
          <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
          <span className="line-clamp-2">{grammar.join(' / ')}</span>
        </p>
      )}

      <div className="mt-auto grid grid-cols-2 gap-2 pt-5">
        <Link
          to={cta.href}
          className="col-span-2 inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-700 focus-visible:ring-4 focus-visible:ring-indigo-300 focus-visible:outline-none"
        >
          <cta.Icon className="h-4 w-4" /> {cta.label}
        </Link>
        <Link
          to={`${base}/study?level=${levelId}&tab=grammar`}
          title="Ver la gramática de la unidad"
          className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition hover:border-amber-300 hover:bg-amber-50 focus-visible:ring-4 focus-visible:ring-amber-200 focus-visible:outline-none"
        >
          <Lightbulb className="h-4 w-4 text-amber-500" /> Gramática
        </Link>
        <Link
          to={`${base}/study?level=${levelId}&tab=vocabulary`}
          title="Ver el vocabulario de la unidad"
          className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition hover:border-emerald-300 hover:bg-emerald-50 focus-visible:ring-4 focus-visible:ring-emerald-200 focus-visible:outline-none"
        >
          <BookA className="h-4 w-4 text-emerald-600" /> Vocabulario
        </Link>
      </div>
    </article>
  )
}
