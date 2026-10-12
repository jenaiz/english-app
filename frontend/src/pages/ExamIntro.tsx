import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Award, Clock, Headphones, ListChecks, Loader2, Lock, Play, RotateCcw, ShieldCheck } from 'lucide-react'
import { api, ApiError } from '../api/client'
import { trackEvent } from '../lib/analytics'
import { colorOf } from '../lib/levels'
import { AttemptHistory, ToReview } from '../components/exam/AttemptHistory'
import type { ExamAttemptSummary, ExamSummary } from '../types'
import ErrorState from '../components/ui/ErrorState'
import BackLink from '../components/ui/BackLink'
import { buttonClass } from '../components/ui/Button'

const fmtDate = (iso: string) => new Date(iso).toLocaleString('es-ES', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })

/** The level exam's cover: what it checks, the rules, and the learner's results so far. */
export default function ExamIntro() {
  const { levelId = '' } = useParams()
  const navigate = useNavigate()
  const [exam, setExam] = useState<ExamSummary | null>(null)
  const [attempts, setAttempts] = useState<ExamAttemptSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [ready, setReady] = useState(false)
  const [starting, setStarting] = useState(false)

  useEffect(() => {
    api
      .exams()
      .then((list) => {
        const e = list.find((x) => x.level_id.toLowerCase() === levelId.toLowerCase())
        if (!e) {
          setError('Este nivel todavía no tiene examen.')
          return
        }
        setExam(e)
        // The history is secondary: without it the page still works.
        api.examAttempts(e.exam_id).then(setAttempts).catch(() => setAttempts([]))
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false))
  }, [levelId])

  const start = async () => {
    if (!exam) return
    setStarting(true)
    try {
      const { attempt_id } = await api.startExam(exam.exam_id)
      if (!exam.status.open_attempt) trackEvent('exam_start', { exam_id: exam.exam_id, attempt: exam.status.attempts + 1 })
      navigate(`/examen/${exam.level_id}/intento/${attempt_id}`)
    } catch (e) {
      setStarting(false)
      if (e instanceof ApiError && e.code === 'retake_wait') {
        setExam({ ...exam, status: { ...exam.status, retry_at: String(e.body?.retry_at ?? '') } })
      } else setError((e as Error).message)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-24 text-indigo-500">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }
  if (error || !exam) {
    return (
      <ErrorState />
    )
  }

  const c = colorOf(exam.level_id)
  const st = exam.status
  // The latest handed-in attempt: what to review comes from it.
  const lastDone = attempts.find((a) => !a.open)
  const waiting = !st.open_attempt && st.retry_at && Date.parse(st.retry_at) > Date.now()

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <BackLink to="/niveles">Inicio</BackLink>

      <header className="relative mt-4 overflow-hidden rounded-3xl bg-slate-900 p-6 text-white sm:p-8">
        <span className={`absolute inset-y-0 left-0 w-2 ${c.solid}`} aria-hidden />
        <p className="flex items-center gap-2 text-sm text-slate-300">
          <span className={`rounded-md px-1.5 py-0.5 text-xs font-bold text-white ${c.solid}`}>{exam.level_id}</span> Examen de nivel
        </p>
        <h1 className="mt-2 font-display text-4xl font-extrabold">{exam.title}</h1>
        <p className="mt-2 max-w-xl text-slate-300">{exam.description}</p>
        <dl className="mt-6 flex flex-wrap gap-x-8 gap-y-3 text-sm">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-slate-400" />
            <dt className="sr-only">Duración</dt>
            <dd>{exam.duration_minutes} minutos</dd>
          </div>
          <div className="flex items-center gap-2">
            <ListChecks className="h-4 w-4 text-slate-400" />
            <dt className="sr-only">Preguntas</dt>
            <dd>{exam.items} preguntas</dd>
          </div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-slate-400" />
            <dt className="sr-only">Aprobado</dt>
            <dd>
              Aprobado: {exam.pass_score}% y {exam.section_min_score}% en cada parte
            </dd>
          </div>
        </dl>
      </header>

      {/* Results so far */}
      {st.passed && st.passed_attempt && (
        <Link
          to={`/examen/${exam.level_id}/certificado/${st.passed_attempt}`}
          className="mt-4 flex items-center gap-4 rounded-2xl border-2 border-emerald-200 bg-white p-4 transition hover:border-emerald-400"
        >
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-emerald-100 text-emerald-700">
            <Award className="h-6 w-6" />
          </span>
          <span className="flex-1">
            <span className="block font-display text-lg font-bold text-slate-900">Nivel {exam.level_id} aprobado</span>
            <span className="text-sm text-slate-500">
              Mejor nota: {st.best_score}% · Ver el certificado
            </span>
          </span>
        </Link>
      )}
      {lastDone && <ToReview levelId={exam.level_id} attempt={lastDone} />}

      {/* What it checks */}
      <section className="mt-10">
        <h2 className="font-display text-2xl font-bold text-slate-900">Qué evalúa</h2>
        <ul className="mt-4 grid gap-3 sm:grid-cols-2">
          {exam.sections.map((s) => (
            <li key={s.section_id} className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3">
              <span className="font-semibold text-slate-800">{s.title}</span>
              <span className="text-sm text-slate-500 tabular-nums">{s.items} preguntas</span>
            </li>
          ))}
        </ul>
        <details className="mt-4 rounded-xl border border-slate-200 bg-white p-4">
          <summary className="cursor-pointer font-medium text-slate-700">Los {exam.topics.length} temas del nivel {exam.level_id} que entran</summary>
          <ul className="mt-3 grid gap-1 text-sm text-slate-600 sm:grid-cols-2">
            {exam.topics.map((t) => (
              <li key={t}>· {t}</li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-slate-500">
            Alineado con los contenidos del nivel {exam.level_id} del Marco Común Europeo de Referencia (Core Inventory del British Council y EAQUALS).
          </p>
        </details>
      </section>

      {/* Rules */}
      <section className="mt-10">
        <h2 className="font-display text-2xl font-bold text-slate-900">Cómo funciona</h2>
        <ul className="mt-4 space-y-3 text-slate-700">
          <li className="flex gap-3">
            <Clock className="mt-0.5 h-5 w-5 shrink-0 text-indigo-500" />
            Tienes {exam.duration_minutes} minutos seguidos. El reloj no se para: si cierras la página, sigue corriendo, y al acabar el tiempo se entrega lo que hayas respondido.
          </li>
          <li className="flex gap-3">
            <Lock className="mt-0.5 h-5 w-5 shrink-0 text-indigo-500" />
            No verás si aciertas hasta entregar. Puedes moverte entre las partes y cambiar respuestas, que se guardan solas.
          </li>
          <li className="flex gap-3">
            <Headphones className="mt-0.5 h-5 w-5 shrink-0 text-indigo-500" />
            Cada audio se puede escuchar {exam.max_plays} veces, sin transcripción. Ponte auriculares.
          </li>
          <li className="flex gap-3">
            <RotateCcw className="mt-0.5 h-5 w-5 shrink-0 text-indigo-500" />
            Si no apruebas, podrás repetirlo pasadas {exam.retake_hours} horas, con otras preguntas.
          </li>
        </ul>
      </section>

      {/* Start */}
      <section className="mt-10 rounded-3xl border-2 border-indigo-100 bg-indigo-50/50 p-6">
        {st.open_attempt ? (
          <>
            <p className="font-semibold text-slate-900">Tienes un examen empezado.</p>
            {st.open_deadline && <p className="text-sm text-slate-600">Termina a las {new Date(st.open_deadline).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}.</p>}
            <button
              type="button"
              onClick={start}
              disabled={starting}
              className={buttonClass({ size: 'lg', className: 'mt-4' })}
            >
              <Play className="h-4 w-4 fill-current" /> Continuar el examen
            </button>
          </>
        ) : waiting ? (
          <p className="flex items-center gap-2 text-slate-700">
            <Clock className="h-5 w-5 text-amber-600" /> Podrás volver a hacer el examen a partir del {fmtDate(st.retry_at!)}.
          </p>
        ) : (
          <>
            <label className="flex cursor-pointer items-start gap-3">
              <input type="checkbox" checked={ready} onChange={(e) => setReady(e.target.checked)} className="mt-1 h-4 w-4 accent-indigo-600" />
              <span className="text-slate-700">
                Tengo {exam.duration_minutes} minutos sin interrupciones, auriculares y no voy a consultar apuntes ni traductores: quiero saber mi nivel real.
              </span>
            </label>
            <button
              type="button"
              onClick={start}
              disabled={!ready || starting}
              className={buttonClass({ size: 'lg', className: 'mt-4' })}
            >
              {starting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4 fill-current" />}
              {st.attempts > 0 ? 'Empezar un nuevo intento' : 'Empezar el examen'}
            </button>
          </>
        )}
      </section>

      {attempts.length > 0 && <AttemptHistory levelId={exam.level_id} attempts={attempts} />}
    </div>
  )
}
