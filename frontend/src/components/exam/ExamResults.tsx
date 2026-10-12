import { Link } from 'react-router-dom'
import { Award, BookOpen, Check, ChevronDown, Clock, RotateCcw, X } from 'lucide-react'
import { colorOf } from '../../lib/levels'
import type { ExamAttempt, ExamResult } from '../../types'
import UnlockReveal from '../club/UnlockReveal'
import TopicReview, { weakest } from './TopicReview'
import BackLink from '../ui/BackLink'
import { buttonClass } from '../ui/Button'

const fmtDate = (iso: string) => new Date(iso).toLocaleString('es-ES', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })

export default function ExamResults({ attempt }: { attempt: ExamAttempt }) {
  const r = attempt.result as ExamResult
  const c = colorOf(attempt.level_id)
  // Topics to review: the ones with mistakes, weakest first.
  const weak = weakest(r.topics)

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <BackLink to="/levels">Inicio</BackLink>

      <header className={`mt-4 rounded-3xl p-6 sm:p-8 ${r.passed ? 'bg-emerald-600 text-white' : 'bg-slate-900 text-white'}`}>
        <p className="text-sm font-semibold tracking-wide uppercase opacity-80">{attempt.title}</p>
        <div className="mt-3 flex flex-wrap items-end justify-between gap-6">
          <div>
            <p className="font-display text-4xl font-extrabold">{r.passed ? '¡Aprobado!' : 'Todavía no'}</p>
            <p className="mt-2 max-w-md opacity-90">
              {r.passed
                ? `Has demostrado el nivel ${attempt.level_id}: gramática, vocabulario, lectura y comprensión auditiva.`
                : `Para aprobar necesitas un ${attempt.pass_score}% en total y al menos un ${attempt.section_min_score}% en cada parte. Repasa los temas de abajo y vuelve a intentarlo.`}
            </p>
          </div>
          <p className="font-display text-6xl font-extrabold tabular-nums">
            {r.score}
            <span className="text-3xl">%</span>
          </p>
        </div>
        {attempt.submitted_at && <p className="mt-4 text-sm opacity-70">Entregado el {fmtDate(attempt.submitted_at)}</p>}
      </header>

      {r.passed && (
        <Link
          to={`/examen/${attempt.level_id}/certificado/${attempt.attempt_id}`}
          className="mt-4 flex items-center gap-4 rounded-2xl border-2 border-emerald-200 bg-white p-4 transition hover:border-emerald-400"
        >
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-emerald-100 text-emerald-700">
            <Award className="h-6 w-6" />
          </span>
          <span className="flex-1">
            <span className="block font-display text-lg font-bold text-slate-900">Ver tu certificado {attempt.level_id}</span>
            <span className="text-sm text-slate-500">Imprímelo o guárdalo en PDF.</span>
          </span>
        </Link>
      )}
      {attempt.unlocked_activities && <UnlockReveal activities={attempt.unlocked_activities} />}
      {!r.passed && attempt.retry_at && (
        <p className="mt-4 flex items-center gap-2 rounded-xl bg-amber-50 p-4 text-amber-900">
          <Clock className="h-5 w-5 shrink-0" /> Podrás repetir el examen a partir del {fmtDate(attempt.retry_at)}. Aprovecha para repasar.
        </p>
      )}

      {/* Sections, each against its minimum */}
      <section className="mt-10">
        <h2 className="font-display text-2xl font-bold text-slate-900">Por partes</h2>
        <ul className="mt-4 space-y-4">
          {r.sections.map((s) => (
            <li key={s.section_id}>
              <div className="flex items-baseline justify-between gap-3">
                <span className="font-semibold text-slate-800">{s.title}</span>
                <span className={`text-sm font-semibold tabular-nums ${s.passed ? 'text-slate-700' : 'text-red-700'}`}>
                  {s.correct}/{s.total} · {s.score}%{!s.passed && ' (por debajo del mínimo)'}
                </span>
              </div>
              <div className="relative mt-1.5 h-3 overflow-hidden rounded-full bg-slate-200">
                <div className={`h-full rounded-full ${s.passed ? c.solid : 'bg-red-500'}`} style={{ width: `${s.score}%` }} />
                <div className="absolute inset-y-0 w-0.5 bg-slate-900/40" style={{ left: `${attempt.section_min_score}%` }} title={`Mínimo: ${attempt.section_min_score}%`} />
              </div>
            </li>
          ))}
        </ul>
      </section>

      {/* What to review, linked to the units that teach it */}
      <section className="mt-10">
        <h2 className="font-display text-2xl font-bold text-slate-900">{weak.length ? 'Qué repasar' : 'Por temas'}</h2>
        {weak.length === 0 ? (
          <p className="mt-2 text-slate-600">No has fallado ninguna pregunta de ningún tema. ¡Perfecto!</p>
        ) : (
          <TopicReview topics={weak} />
        )}
      </section>

      {/* Every answer, with the right one */}
      <section className="mt-10">
        <h2 className="font-display text-2xl font-bold text-slate-900">Tus respuestas</h2>
        <div className="mt-4 space-y-3">
          {r.review.map((p) => {
            const wrong = p.items.filter((it) => !it.correct).length
            return (
              <details key={p.part_id} className="group rounded-2xl border border-slate-200 bg-white">
                <summary className="flex cursor-pointer list-none items-center gap-3 p-4">
                  <span className="min-w-0 flex-1">
                    <span className="block font-semibold text-slate-900">{p.title ?? p.instructions}</span>
                    <span className="text-sm text-slate-500">{wrong === 0 ? 'Todo bien' : `${wrong} ${wrong === 1 ? 'fallo' : 'fallos'}`}</span>
                  </span>
                  <ChevronDown className="h-5 w-5 text-slate-400 transition group-open:rotate-180" />
                </summary>
                <div className="border-t border-slate-100 p-4">
                  {p.text && <p className="mb-4 rounded-xl bg-slate-50 p-4 text-sm leading-relaxed whitespace-pre-line text-slate-700">{p.text}</p>}
                  {p.dialogue && (
                    <div className="mb-4 rounded-xl bg-slate-50 p-4 text-sm">
                      <p className="mb-2 font-semibold text-slate-500">Transcripción</p>
                      {p.dialogue.map((l, i) => (
                        <p key={i} className="text-slate-700">
                          <span className="font-semibold text-slate-900">{l.speaker}:</span> {l.text}
                        </p>
                      ))}
                    </div>
                  )}
                  <ul className="space-y-3">
                    {p.items.map((it) => (
                      <li key={it.id} className="flex gap-3">
                        {it.correct ? <Check className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" /> : <X className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />}
                        <div className="min-w-0 text-sm">
                          {it.prompt && <p className="text-slate-800">{it.prompt}</p>}
                          <p className={it.correct ? 'text-emerald-700' : 'text-red-700 line-through decoration-red-300'}>{it.answer || '(sin responder)'}</p>
                          {!it.correct && <p className="font-semibold text-emerald-700">{it.expected}</p>}
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              </details>
            )
          })}
        </div>
      </section>

      <div className="mt-10 flex flex-wrap gap-3">
        <Link to={`/examen/${attempt.level_id}`} className={buttonClass({ variant: 'secondary' })}>
          <RotateCcw className="h-4 w-4" /> Volver al examen
        </Link>
        <Link to={`/levels/${attempt.level_id}/study`} className={buttonClass()}>
          <BookOpen className="h-4 w-4" /> Estudiar el nivel {attempt.level_id}
        </Link>
      </div>
    </div>
  )
}
