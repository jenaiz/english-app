import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Award, Loader2, Printer } from 'lucide-react'
import { api } from '../api/client'
import { useAuth } from '../context/AuthContext'
import { colorOf } from '../lib/levels'
import { SITE } from '../lib/site'
import { displayName } from '../lib/user'
import type { ExamAttempt } from '../types'
import ErrorState from '../components/ui/ErrorState'
import BackLink from '../components/ui/BackLink'
import { buttonClass } from '../components/ui/Button'

const LEVEL_NAME: Record<string, string> = { A1: 'Acceso', A2: 'Plataforma', B1: 'Umbral', B2: 'Avanzado', C1: 'Dominio operativo eficaz', C2: 'Maestría' }

/**
 * The certificate of a passed level exam, made to be printed or saved as PDF. It says plainly
 * what it is: the app's own exam, aligned with the CEFR, not an official qualification.
 */
export default function ExamCertificate() {
  const { attemptId = '' } = useParams()
  const { user } = useAuth()
  const [attempt, setAttempt] = useState<ExamAttempt | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    api
      .examAttempt(attemptId)
      .then((a) => (a.status === 'submitted' && a.result?.passed ? setAttempt(a) : setError('Este intento no está aprobado.')))
      .catch((e: Error) => setError(e.message))
  }, [attemptId])

  if (error) {
    return (
      <ErrorState />
    )
  }
  if (!attempt || !user) {
    return (
      <div className="flex justify-center py-24 text-indigo-500">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  const r = attempt.result!
  const c = colorOf(attempt.level_id)
  const date = new Date(attempt.submitted_at!).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })
  const code = attempt.attempt_id.slice(0, 8).toUpperCase()

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 print:max-w-none print:p-0">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 print:hidden">
        <BackLink to={`/examen/${attempt.level_id}/intento/${attempt.attempt_id}`}>Resultados</BackLink>
        <button
          type="button"
          onClick={() => window.print()}
          className={buttonClass()}
        >
          <Printer className="h-4 w-4" /> Imprimir o guardar en PDF
        </button>
      </div>
      {!user.name && (
        <p className="mb-6 rounded-xl bg-amber-50 p-4 text-sm text-amber-900 print:hidden">
          El certificado usa el nombre de tu cuenta. Para que aparezca tu nombre completo, añádelo en{' '}
          <Link to="/ajustes" className="font-semibold underline">
            Ajustes
          </Link>
          .
        </p>
      )}

      <article className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-8 shadow-sm sm:p-14 print:rounded-none print:border-0 print:shadow-none">
        <div className={`absolute inset-x-0 top-0 h-3 ${c.solid}`} aria-hidden />
        <div className="flex items-center justify-between gap-4">
          <p className="font-display text-xl font-extrabold tracking-tight text-slate-900">{SITE.name}</p>
          <span className={`grid h-16 w-16 place-items-center rounded-full ${c.soft} ${c.text}`}>
            <Award className="h-9 w-9" />
          </span>
        </div>

        <p className="mt-10 text-sm font-semibold tracking-[0.2em] text-slate-500 uppercase">Certificado de nivel</p>
        <p className="mt-6 text-slate-600">Se certifica que</p>
        <p className="mt-2 font-display text-4xl font-extrabold text-slate-900 sm:text-5xl">{displayName(user)}</p>
        <p className="mt-6 max-w-2xl text-lg leading-relaxed text-slate-700">
          ha superado el examen de nivel{' '}
          <strong className={c.text}>
            {attempt.level_id} ({LEVEL_NAME[attempt.level_id] ?? attempt.level_id})
          </strong>{' '}
          de inglés del Marco Común Europeo de Referencia para las Lenguas, con una nota global del <strong>{r.score}%</strong>.
        </p>

        <dl className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-4">
          {r.sections.map((s) => (
            <div key={s.section_id} className="rounded-xl bg-slate-50 p-4">
              <dt className="text-sm text-slate-500">{s.title}</dt>
              <dd className="font-display text-2xl font-bold text-slate-900 tabular-nums">{s.score}%</dd>
            </div>
          ))}
        </dl>

        <div className="mt-10 flex flex-wrap items-end justify-between gap-6 border-t border-slate-200 pt-6 text-sm text-slate-600">
          <div>
            <p>
              Fecha: <span className="font-semibold text-slate-800">{date}</span>
            </p>
            <p>
              Código: <span className="font-mono font-semibold text-slate-800">{code}</span>
            </p>
          </div>
          <p className="font-medium text-slate-800">{SITE.url.replace('https://', '')}</p>
        </div>
        <p className="mt-6 text-xs leading-relaxed text-slate-500">
          {SITE.name} diseña sus exámenes según los contenidos de cada nivel del MCER (Core Inventory for General English del British Council y EAQUALS):
          gramática, vocabulario, comprensión lectora y comprensión auditiva, con tiempo limitado y sin ayudas. Este certificado acredita el resultado en{' '}
          {SITE.name}; no es un título oficial ni sustituye a los exámenes de Cambridge, Trinity, Aptis o las Escuelas Oficiales de Idiomas.
        </p>
      </article>
    </div>
  )
}
