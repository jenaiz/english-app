import { useState, type FormEvent, type ReactNode } from 'react'
import { AlertCircle, Eye, EyeOff, Loader2 } from 'lucide-react'
import { buttonClass } from './ui/Button'
import { inputClass } from './ui/styles'

export interface Field {
  name: string
  label: string
  type: string
  autoComplete?: string
  /** Initial value, e.g. the last email used on this device. */
  defaultValue?: string
  /** Always-visible help under the field ("Mínimo 8 caracteres"). */
  hint?: string
  /** Next to the label, e.g. "¿Olvidaste tu contraseña?". */
  aside?: ReactNode
}

interface Props {
  title: string
  subtitle: string
  fields: Field[]
  submitLabel: string
  validate: (values: Record<string, string>) => Record<string, string>
  onSubmit: (values: Record<string, string>) => Promise<void>
  footer: ReactNode
  /** Other sign-in methods (Google), shown above the email form: the quickest way in goes first. */
  alternative?: ReactNode
  /** Extra content shown under the error message (e.g. a "resend email" button). */
  notice?: ReactNode
}

export default function AuthForm({ title, subtitle, fields, submitLabel, validate, onSubmit, footer, alternative, notice }: Props) {
  const [values, setValues] = useState<Record<string, string>>(() => Object.fromEntries(fields.map((f) => [f.name, f.defaultValue ?? ''])))
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [serverError, setServerError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

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
        <h1 className="h-section">{title}</h1>
        <p className="mt-1 text-sm text-slate-500">{subtitle}</p>

        {serverError && (
          <div className="mt-5 flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            <AlertCircle className="h-4 w-4 shrink-0" /> {serverError}
          </div>
        )}
        {notice}

        {alternative}

        <div className="mt-6 space-y-4">
          {fields.map((f) => {
            const isPassword = f.type === 'password'
            const describedBy = errors[f.name] ? `${f.name}-error` : f.hint ? `${f.name}-hint` : undefined
            return (
              <div key={f.name}>
                <div className="mb-1 flex items-baseline justify-between gap-3">
                  <label htmlFor={f.name} className="block text-sm font-medium text-slate-700">
                    {f.label}
                  </label>
                  {f.aside}
                </div>
                <div className="relative">
                  <input
                    id={f.name}
                    // name + autocomplete let the browser and password managers save and offer past emails.
                    name={f.name}
                    type={isPassword && showPassword ? 'text' : f.type}
                    autoComplete={f.autoComplete}
                    autoFocus={isPassword && !!fields.find((o) => o.type === 'email')?.defaultValue}
                    {...(f.type === 'email' ? { autoCapitalize: 'none', spellCheck: false } : {})}
                    value={values[f.name]}
                    onChange={(e) => setValues((v) => ({ ...v, [f.name]: e.target.value }))}
                    aria-invalid={!!errors[f.name]}
                    aria-describedby={describedBy}
                    className={`${inputClass({ error: !!errors[f.name] })}${isPassword ? ' pr-11' : ''}`}
                  />
                  {/* One toggle shows every password field, so "repeat" can be checked by eye too. */}
                  {isPassword && (
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                      aria-pressed={showPassword}
                      className="absolute inset-y-0 right-0 grid w-11 place-items-center rounded-r-xl text-slate-500 hover:text-slate-700"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  )}
                </div>
                {errors[f.name] ? (
                  <p id={`${f.name}-error`} className="mt-1 text-sm text-red-600">
                    {errors[f.name]}
                  </p>
                ) : (
                  f.hint && (
                    <p id={`${f.name}-hint`} className="mt-1 text-sm text-slate-500">
                      {f.hint}
                    </p>
                  )
                )}
              </div>
            )
          })}
        </div>

        <button
          type="submit"
          disabled={submitting}
          className={buttonClass({ full: true, className: 'mt-6 justify-center' })}
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

export function validateEmail(values: Record<string, string>) {
  const errs: Record<string, string> = {}
  if (!EMAIL_RE.test(values.email.trim())) errs.email = 'Introduce un email válido'
  return errs
}

export function validatePassword(values: Record<string, string>) {
  const errs: Record<string, string> = {}
  if (values.password.length < 8) errs.password = 'Mínimo 8 caracteres'
  if ('confirm' in values && values.password !== values.confirm) errs.confirm = 'Las contraseñas no coinciden'
  return errs
}

export function validateCredentials(values: Record<string, string>) {
  return { ...validateEmail(values), ...validatePassword(values) }
}
