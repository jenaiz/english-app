import { useState, type FormEvent, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { AlertCircle, CheckCircle2, Download, KeyRound, Loader2, Trash2 } from 'lucide-react'
import { api, ApiError } from '../api/client'
import { useAuth } from '../context/AuthContext'
import { useConsent } from '../context/ConsentContext'
import { displayName } from '../lib/user'

const inputClass =
  'w-full rounded-lg border border-slate-300 px-3 py-2.5 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100'
const primaryButton =
  'inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 font-medium text-white shadow-sm transition hover:bg-indigo-700 disabled:opacity-60'
const secondaryButton =
  'inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-60'

function errorMessage(err: unknown) {
  if (err instanceof ApiError && err.code === 'wrong_password') return 'La contraseña no es correcta'
  if (err instanceof ApiError && err.status >= 500) return 'Algo salió mal. Inténtalo de nuevo.'
  return err instanceof Error ? err.message : 'Algo salió mal'
}

export default function Settings() {
  const { user } = useAuth()
  if (!user) return null

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="text-3xl font-bold text-slate-900">Ajustes</h1>
      <p className="mt-1 text-slate-500">Tu perfil, tu forma de entrar y tus datos.</p>

      <div className="mt-8 space-y-6">
        <ProfileSection />
        <SignInSection />
        <PrivacySection />
        <DeleteSection />
      </div>
      <p className="mt-8 text-center text-xs text-slate-400">
        Cuenta creada el {new Date(user.created_at).toLocaleDateString('es-ES', { dateStyle: 'long' })}
      </p>
    </div>
  )
}

function Section({ title, description, children, danger }: { title: string; description?: string; children: ReactNode; danger?: boolean }) {
  return (
    <section className={`rounded-2xl border bg-white p-6 shadow-sm ${danger ? 'border-red-200' : 'border-slate-200'}`}>
      <h2 className={`text-lg font-semibold ${danger ? 'text-red-700' : 'text-slate-900'}`}>{title}</h2>
      {description && <p className="mt-1 text-sm text-slate-500">{description}</p>}
      <div className="mt-5">{children}</div>
    </section>
  )
}

function Feedback({ error, success }: { error?: string; success?: string }) {
  if (error)
    return (
      <p className="mt-3 flex items-center gap-2 text-sm text-red-700">
        <AlertCircle className="h-4 w-4 shrink-0" /> {error}
      </p>
    )
  if (success)
    return (
      <p className="mt-3 flex items-center gap-2 text-sm text-emerald-700">
        <CheckCircle2 className="h-4 w-4 shrink-0" /> {success}
      </p>
    )
  return null
}

function ProfileSection() {
  const { user, setUser } = useAuth()
  const [name, setName] = useState(user?.name ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  if (!user) return null

  const changed = name.trim() !== user.name

  const save = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setSaving(true)
    try {
      const updated = await api.updateAccount(name.trim())
      setUser(updated)
      setName(updated.name)
      setSuccess('Nombre guardado')
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Section title="Perfil" description="Así te llamaremos en la aplicación y en los emails.">
      <form onSubmit={save}>
        <label htmlFor="name" className="mb-1 block text-sm font-medium text-slate-700">
          Nombre
        </label>
        <div className="flex flex-col gap-3 sm:flex-row">
          <input
            id="name"
            value={name}
            maxLength={50}
            autoComplete="name"
            placeholder={displayName({ ...user, name: '' })}
            onChange={(e) => {
              setName(e.target.value)
              setSuccess('')
            }}
            className={inputClass}
          />
          <button type="submit" disabled={saving || !changed} className={primaryButton}>
            {saving && <Loader2 className="h-4 w-4 animate-spin" />} Guardar
          </button>
        </div>
        <Feedback error={error} success={success} />
      </form>

      <div className="mt-5 text-sm">
        <p className="font-medium text-slate-700">Email</p>
        <p className="mt-1 flex flex-wrap items-center gap-2 text-slate-600">
          {user.email}
          {user.email_verified && (
            <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">Verificado</span>
          )}
        </p>
      </div>
    </Section>
  )
}

function SignInSection() {
  const { user } = useAuth()
  if (!user) return null

  return (
    <Section title="Inicio de sesión">
      <ul className="space-y-2 text-sm">
        <li className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2.5">
          <span className="font-medium text-slate-700">Email y contraseña</span>
          <span className={user.has_password ? 'text-emerald-700' : 'text-slate-400'}>
            {user.has_password ? 'Activado' : 'Sin contraseña'}
          </span>
        </li>
        <li className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2.5">
          <span className="font-medium text-slate-700">Google</span>
          <span className={user.has_google ? 'text-emerald-700' : 'text-slate-400'}>
            {user.has_google ? 'Vinculado' : 'No vinculado'}
          </span>
        </li>
      </ul>
      {user.has_password ? <ChangePasswordForm /> : <CreatePassword email={user.email} />}
    </Section>
  )
}

function ChangePasswordForm() {
  const [open, setOpen] = useState(false)
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  if (!open)
    return (
      <div className="mt-5">
        <button type="button" onClick={() => setOpen(true)} className={secondaryButton}>
          <KeyRound className="h-4 w-4" /> Cambiar contraseña
        </button>
        <Feedback success={success} />
      </div>
    )

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    if (next.length < 8 || next.length > 72) {
      setError('La nueva contraseña debe tener entre 8 y 72 caracteres')
      return
    }
    setSaving(true)
    try {
      await api.changePassword(current, next)
      setOpen(false)
      setCurrent('')
      setNext('')
      setSuccess('Contraseña cambiada')
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={submit} className="mt-5 space-y-4">
      <div>
        <label htmlFor="current-password" className="mb-1 block text-sm font-medium text-slate-700">
          Contraseña actual
        </label>
        <input id="current-password" type="password" autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} className={inputClass} />
      </div>
      <div>
        <label htmlFor="new-password" className="mb-1 block text-sm font-medium text-slate-700">
          Nueva contraseña
        </label>
        <input id="new-password" type="password" autoComplete="new-password" value={next} onChange={(e) => setNext(e.target.value)} className={inputClass} />
        <p className="mt-1 text-xs text-slate-500">Entre 8 y 72 caracteres.</p>
      </div>
      <Feedback error={error} />
      <div className="flex gap-3">
        <button type="submit" disabled={saving || !current || !next} className={primaryButton}>
          {saving && <Loader2 className="h-4 w-4 animate-spin" />} Cambiar contraseña
        </button>
        <button type="button" onClick={() => setOpen(false)} className={secondaryButton}>
          Cancelar
        </button>
      </div>
    </form>
  )
}

/** Google-only accounts add a password through the reset email, which proves they own the address. */
function CreatePassword({ email }: { email: string }) {
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const [sent, setSent] = useState(false)

  const send = async () => {
    setError('')
    setSending(true)
    try {
      await api.forgotPassword(email)
      setSent(true)
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="mt-5">
      <p className="text-sm text-slate-500">
        Entras con Google. Si quieres entrar también con tu email, crea una contraseña: te enviaremos un enlace.
      </p>
      <button type="button" onClick={send} disabled={sending || sent} className={`${secondaryButton} mt-3`}>
        {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />} Crear contraseña
      </button>
      <Feedback error={error} success={sent ? `Te hemos enviado un enlace a ${email}` : ''} />
    </div>
  )
}

function PrivacySection() {
  const { openPreferences } = useConsent()
  const [exporting, setExporting] = useState(false)
  const [error, setError] = useState('')

  const download = async () => {
    setError('')
    setExporting(true)
    try {
      const data = await api.exportAccount()
      const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }))
      const a = document.createElement('a')
      a.href = url
      a.download = 'fluently-datos.json'
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setExporting(false)
    }
  }

  return (
    <Section title="Privacidad" description="Descarga una copia de tus datos o cambia qué cookies aceptas.">
      <div className="flex flex-wrap gap-3">
        <button type="button" onClick={download} disabled={exporting} className={secondaryButton}>
          {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />} Descargar mis datos
        </button>
        <button type="button" onClick={openPreferences} className={secondaryButton}>
          Configurar cookies
        </button>
      </div>
      <Feedback error={error} />
    </Section>
  )
}

const DELETE_WORD = 'BORRAR'

function DeleteSection() {
  const { user, setUser } = useAuth()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [confirm, setConfirm] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState('')
  if (!user) return null

  // Accounts with a password confirm with it; Google-only accounts type a word.
  const ready = user.has_password ? confirm.length > 0 : confirm.trim().toUpperCase() === DELETE_WORD

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setDeleting(true)
    try {
      await api.deleteAccount(user.has_password ? confirm : '')
      setUser(null)
      navigate('/', { replace: true })
    } catch (err) {
      setError(errorMessage(err))
      setDeleting(false)
    }
  }

  return (
    <Section
      title="Borrar cuenta"
      description="Se borran tu cuenta, tu progreso y tus tarjetas de repaso. No se puede deshacer."
      danger
    >
      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-2 rounded-lg border border-red-300 px-4 py-2.5 font-medium text-red-700 transition hover:bg-red-50"
        >
          <Trash2 className="h-4 w-4" /> Borrar mi cuenta
        </button>
      ) : (
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label htmlFor="delete-confirm" className="mb-1 block text-sm font-medium text-slate-700">
              {user.has_password ? 'Escribe tu contraseña para confirmar' : `Escribe ${DELETE_WORD} para confirmar`}
            </label>
            <input
              id="delete-confirm"
              type={user.has_password ? 'password' : 'text'}
              autoComplete={user.has_password ? 'current-password' : 'off'}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2.5 outline-none transition focus:border-red-500 focus:ring-2 focus:ring-red-100"
            />
          </div>
          <Feedback error={error} />
          <div className="flex gap-3">
            <button
              type="submit"
              disabled={!ready || deleting}
              className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2.5 font-medium text-white shadow-sm transition hover:bg-red-700 disabled:opacity-60"
            >
              {deleting && <Loader2 className="h-4 w-4 animate-spin" />} Borrar definitivamente
            </button>
            <button
              type="button"
              onClick={() => {
                setOpen(false)
                setConfirm('')
                setError('')
              }}
              className={secondaryButton}
            >
              Cancelar
            </button>
          </div>
        </form>
      )}
    </Section>
  )
}
