import { Link } from 'react-router-dom'
import { BookOpen, Check, ChevronRight, Clock, X } from 'lucide-react'
import type { ExamAttemptSummary } from '../../types'

const fmtDate = (iso: string) => new Date(iso).toLocaleString('es-ES', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })

/**
 * What to review after the latest attempt: the topics with mistakes, weakest first, each linked
 * to the units that teach it. Stays on the exam page so it isn't lost once the results are closed.
 */
export function ToReview({ levelId, attempt }: { levelId: string; attempt: ExamAttemptSummary }) {
  const weak = attempt.weak_topics
  return (
    <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-display text-2xl font-bold text-slate-900">Qué te toca repasar</h2>
        <Link to={`/examen/${levelId}/intento/${attempt.attempt_id}`} className="text-sm font-semibold text-indigo-600 hover:text-indigo-800">
          Ver el resultado completo →
        </Link>
      </div>
      <p className="mt-1 text-sm text-slate-500">
        Según tu último intento ({attempt.score}%{attempt.submitted_at ? `, ${fmtDate(attempt.submitted_at)}` : ''}).
      </p>
      {weak.length === 0 ? (
        <p className="mt-4 text-slate-700">No fallaste ninguna pregunta. Nada que repasar.</p>
      ) : (
        <ul className="mt-4 divide-y divide-slate-100">
          {weak.map((t) => (
            <li key={t.tag} className="flex flex-wrap items-center gap-x-4 gap-y-2 py-3">
              <div className="min-w-0 flex-1">
                <p className="font-medium text-slate-900">{t.label}</p>
                <p className="mt-1 flex flex-wrap gap-2 text-sm">
                  {t.units.map((u) => (
                    <Link
                      key={u.unit_id}
                      to={`/unidades/${u.unit_id}/estudiar?level=${u.level_id}&tab=grammar`}
                      className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 font-medium text-slate-700 hover:bg-indigo-50 hover:text-indigo-700"
                    >
                      <BookOpen className="h-3.5 w-3.5" /> {u.title}
                    </Link>
                  ))}
                </p>
              </div>
              <span className={`text-sm font-semibold tabular-nums ${t.correct === 0 ? 'text-red-700' : 'text-amber-700'}`}>
                {t.correct}/{t.total}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

/** Every attempt, newest first; each opens its full results (scores, topics, answers). */
export function AttemptHistory({ levelId, attempts }: { levelId: string; attempts: ExamAttemptSummary[] }) {
  return (
    <section className="mt-10">
      <h2 className="font-display text-2xl font-bold text-slate-900">Tus intentos</h2>
      <ul className="mt-4 space-y-3">
        {attempts.map((a, i) => (
          <li key={a.attempt_id}>
            <Link
              to={`/examen/${levelId}/intento/${a.attempt_id}`}
              className="flex items-start gap-4 rounded-2xl border border-slate-200 bg-white p-4 transition hover:border-indigo-300"
            >
              <span
                className={`grid h-10 w-10 shrink-0 place-items-center rounded-full ${
                  a.open ? 'bg-amber-100 text-amber-700' : a.passed ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                }`}
              >
                {a.open ? <Clock className="h-5 w-5" /> : a.passed ? <Check className="h-5 w-5" strokeWidth={3} /> : <X className="h-5 w-5" strokeWidth={3} />}
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-baseline justify-between gap-x-3">
                  <span className="font-semibold text-slate-900">
                    Intento {attempts.length - i}
                    {a.open ? ' · en curso' : ` · ${a.score}% · ${a.passed ? 'aprobado' : 'no aprobado'}`}
                  </span>
                  <span className="text-sm text-slate-500">{fmtDate(a.submitted_at ?? a.started_at)}</span>
                </span>
                {!a.open && (
                  <span className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                    {a.sections.map((s) => (
                      <span key={s.section_id} className={`rounded-md px-2 py-1 font-medium ${s.passed ? 'bg-slate-100 text-slate-700' : 'bg-red-50 text-red-700'}`}>
                        {s.title} {s.score}%
                      </span>
                    ))}
                    {a.weak_topics.length > 0 && (
                      <span className="ml-1 text-sm text-slate-500">
                        {a.weak_topics.length} {a.weak_topics.length === 1 ? 'tema' : 'temas'} por repasar
                      </span>
                    )}
                  </span>
                )}
              </span>
              <ChevronRight className="mt-2 h-5 w-5 shrink-0 text-slate-400" />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}
