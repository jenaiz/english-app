import { useEffect, useState } from 'react'
import { Loader2, TrendingDown, TrendingUp } from 'lucide-react'
import { api } from '../../api/client'
import { stepMistakes } from '../../lib/mistakes'
import { stepLabels } from '../../lib/stepLabels'
import type { LessonAttempt, LessonHistory, Lesson, Unit } from '../../types'
import ErrorState from '../ui/ErrorState'

const dateFmt = new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })

/** "Tus intentos": every finished attempt at the unit's lessons, with its score and mistakes. */
export default function UnitHistory({ unit }: { unit: Unit }) {
  const [lessons, setLessons] = useState<LessonHistory[] | null>(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    api
      .attempts(unit.unit_id)
      .then((r) => setLessons(r.lessons))
      .catch(() => setError(true))
  }, [unit.unit_id])

  if (error) return <ErrorState inline className="mt-6" />
  if (!lessons) {
    return (
      <div className="flex justify-center py-12 text-indigo-500">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    )
  }

  return (
    <div className="mt-6 space-y-6">
      {unit.lessons.map((lesson) => {
        const h = lessons.find((l) => l.lesson_id === lesson.lesson_id)
        return h ? <LessonCard key={lesson.lesson_id} lesson={lesson} history={h} /> : null
      })}
    </div>
  )
}

function LessonCard({ lesson, history: h }: { lesson: Lesson; history: LessonHistory }) {
  const scores = [...h.attempts].reverse().map((a) => a.score)
  const first = scores[0]
  const last = scores[scores.length - 1]
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-lg font-bold text-slate-900">{lesson.title}</h2>
        <span className="text-sm text-slate-500">
          {h.status === 'completed' ? (
            <>
              Mejor nota: <span className="font-semibold text-slate-800">{h.best_score}%</span>
            </>
          ) : h.status === 'in_progress' ? (
            'A medias'
          ) : (
            'Todavía no la has hecho'
          )}
        </span>
      </div>

      {scores.length > 1 && first !== last && (
        <p className={`mt-2 flex items-center gap-1.5 text-sm ${last > first ? 'text-emerald-700' : 'text-amber-700'}`}>
          {last > first ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
          Del {first}% del primer intento al {last}% del último
        </p>
      )}

      {h.attempts.length === 0 ? (
        h.status === 'completed' && (
          <p className="mt-3 text-sm text-slate-500">— Sin datos: la terminaste antes de que guardáramos el detalle de cada intento.</p>
        )
      ) : (
        <ol className="mt-4 space-y-3">
          {h.attempts.map((a, i) => (
            <AttemptRow key={a.finished_at} lesson={lesson} attempt={a} number={h.attempts.length - i} />
          ))}
        </ol>
      )}
    </section>
  )
}

function AttemptRow({ lesson, attempt: a, number }: { lesson: Lesson; attempt: LessonAttempt; number: number }) {
  const mistakes = a.steps.flatMap((s) => (lesson.steps[s.step] ? stepMistakes(lesson.steps[s.step], s) : []))
  return (
    <li className="rounded-xl bg-slate-50 px-4 py-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-sm text-slate-600">
          Intento {number} · {dateFmt.format(new Date(a.finished_at))}
        </span>
        <span className={`rounded-full px-2.5 py-0.5 text-sm font-bold ${a.score >= 70 ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
          {a.score}%
        </span>
      </div>
      <ul className="mt-2 flex flex-wrap gap-1.5">
        {a.steps.map((s) => (
          <li
            key={s.step}
            className={`rounded-md px-2 py-0.5 text-xs font-medium ${s.correct === s.total ? 'bg-white text-slate-600' : 'bg-amber-50 text-amber-800'}`}
          >
            {stepLabels[s.type] ?? s.type} {s.correct}/{s.total}
          </li>
        ))}
      </ul>
      {mistakes.length > 0 && (
        <details className="mt-2">
          <summary className="cursor-pointer text-sm font-medium text-indigo-600">
            {mistakes.length === 1 ? 'Ver el fallo' : `Ver los ${mistakes.length} fallos`}
          </summary>
          <ul className="mt-2 divide-y divide-slate-200">
            {mistakes.map((m, i) => (
              <li key={i} className="py-2 text-sm">
                <p className="text-slate-500">{m.prompt}</p>
                {m.answer && <p className="mt-1 text-red-600 line-through">{m.answer}</p>}
                <p className="mt-0.5 font-semibold text-emerald-700">{m.correct}</p>
              </li>
            ))}
          </ul>
        </details>
      )}
    </li>
  )
}
