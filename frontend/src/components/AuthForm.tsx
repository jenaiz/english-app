import { useState, type FormEvent, type ReactNode } from 'react'
import { AlertCircle, Loader2 } from 'lucide-react'

export interface Field {
  name: string
  label: string
  type: string
  autoComplete?: string
}

interface Props {
  title: string
  subtitle: string
  fields: Field[]
  submitLabel: string
  validate: (values: Record<string, string>) => Record<string, string>
  onSubmit: (values: Record<string, string>) => Promise<void>
  footer: ReactNode
}

export default function AuthForm({ title, subtitle, fields, submitLabel, validate, onSubmit, footer }: Props) {
  const [values, setValues] = useState<Record<string, string>>(() => Object.fromEntries(fields.map((f) => [f.name, ''])))
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [serverError, setServerError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    const errs = validate(values)
    setErrors(errs)
    setServerError('')
    if (Object.keys(errs).length > 0) return
    setSubmitting(true)
    try {
      await onSubmit(values)
    } catch (err) {
      setServerError(err instanceof Error ? err.message : 'Algo salió mal')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-12">
      <form onSubmit={handleSubmit} noValidate className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
        <p className="mt-1 text-sm text-slate-500">{subtitle}</p>

        {serverError && (
          <div className="mt-5 flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            <AlertCircle className="h-4 w-4 shrink-0" /> {serverError}
          </div>
        )}

        <div className="mt-6 space-y-4">
          {fields.map((f) => (
            <div key={f.name}>
              <label htmlFor={f.name} className="mb-1 block text-sm font-medium text-slate-700">
                {f.label}
              </label>
              <input
                id={f.name}
                type={f.type}
                autoComplete={f.autoComplete}
                value={values[f.name]}
                onChange={(e) => setValues((v) => ({ ...v, [f.name]: e.target.value }))}
                className={`w-full rounded-lg border px-3 py-2.5 outline-none transition focus:ring-2 ${
                  errors[f.name] ? 'border-red-400 focus:ring-red-200' : 'border-slate-300 focus:border-indigo-500 focus:ring-indigo-100'
                }`}
              />
              {errors[f.name] && <p className="mt-1 text-xs text-red-600">{errors[f.name]}</p>}
            </div>
          ))}
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 py-2.5 font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-60"
        >
          {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
          {submitLabel}
        </button>
        <p className="mt-6 text-center text-sm text-slate-500">{footer}</p>
      </form>
    </div>
  )
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function validateCredentials(values: Record<string, string>) {
  const errs: Record<string, string> = {}
  if (!EMAIL_RE.test(values.email.trim())) errs.email = 'Introduce un email válido'
  if (values.password.length < 8) errs.password = 'Mínimo 8 caracteres'
  return errs
}
