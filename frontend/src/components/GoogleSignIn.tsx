import { useEffect, useRef, useState } from 'react'
import { AlertCircle, Link2, Loader2 } from 'lucide-react'
import { ApiError } from '../api/client'
import { publicConfig } from '../lib/publicConfig'

// Minimal typing for the parts of Google Identity Services we use.
interface GoogleId {
  initialize(options: { client_id: string; callback: (res: { credential: string }) => void; ux_mode?: 'popup' }): void
  renderButton(el: HTMLElement, options: Record<string, string | number>): void
}
declare global {
  interface Window {
    google?: { accounts: { id: GoogleId } }
  }
}

const GSI_SRC = 'https://accounts.google.com/gsi/client'
let scriptPromise: Promise<GoogleId> | null = null

function loadGsi(): Promise<GoogleId> {
  scriptPromise ??= new Promise<GoogleId>((resolve, reject) => {
    const script = document.createElement('script')
    script.src = GSI_SRC
    script.async = true
    script.onload = () => (window.google ? resolve(window.google.accounts.id) : reject(new Error('GSI missing')))
    script.onerror = () => {
      scriptPromise = null
      reject(new Error('No se pudo cargar Google'))
    }
    document.head.appendChild(script)
  })
  return scriptPromise
}

interface Props {
  /** Signs in with the Google credential. `link` is true once the user agreed to link an existing account. */
  onCredential: (credential: string, link: boolean) => Promise<void>
  text?: 'signin_with' | 'signup_with' | 'continue_with'
}

interface PendingLink {
  credential: string
  email: string
  keepsPassword: boolean
}

/**
 * "Sign in with Google" button plus an "o" divider. Renders nothing if Google isn't configured.
 * If the Google email already has an account, it asks the user before linking both.
 */
export default function GoogleSignIn({ onCredential, text = 'continue_with' }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const [clientId, setClientId] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [pending, setPending] = useState<PendingLink | null>(null)
  const onCredentialRef = useRef(onCredential)
  onCredentialRef.current = onCredential

  useEffect(() => {
    let alive = true
    publicConfig().then((c) => alive && setClientId(c.googleClientId))
    return () => {
      alive = false
    }
  }, [])

  useEffect(() => {
    if (!clientId) return
    let alive = true
    loadGsi()
      .then((gsi) => {
        if (!alive || !ref.current) return
        gsi.initialize({
          client_id: clientId,
          ux_mode: 'popup',
          callback: ({ credential }) => {
            setError('')
            onCredentialRef.current(credential, false).catch((err) => {
              if (err instanceof ApiError && err.code === 'link_required') {
                setPending({
                  credential,
                  email: String(err.body?.email ?? ''),
                  keepsPassword: err.body?.keeps_password === true,
                })
                return
              }
              setError(err instanceof Error ? err.message : 'No se pudo iniciar sesión con Google')
            })
          },
        })
        gsi.renderButton(ref.current, {
          theme: 'outline',
          size: 'large',
          shape: 'rectangular',
          text,
          locale: 'es',
          width: Math.min(400, ref.current.offsetWidth || 400),
        })
      })
      .catch((err) => alive && setError(err.message))
    return () => {
      alive = false
    }
  }, [clientId, text])

  if (!clientId) return null

  return (
    <div className="mt-6">
      <div className="flex items-center gap-3 text-xs text-slate-400">
        <span className="h-px flex-1 bg-slate-200" />o<span className="h-px flex-1 bg-slate-200" />
      </div>
      {/* Google renders its own button (an iframe) inside this element. */}
      <div ref={ref} className="mt-6 flex min-h-[44px] w-full justify-center" />
      {error && (
        <div className="mt-3 flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0" /> {error}
        </div>
      )}
      {pending && (
        <LinkAccountsDialog
          pending={pending}
          onCancel={() => setPending(null)}
          onConfirm={async () => {
            await onCredentialRef.current(pending.credential, true)
            setPending(null)
          }}
        />
      )}
    </div>
  )
}

function LinkAccountsDialog({
  pending,
  onCancel,
  onConfirm,
}: {
  pending: PendingLink
  onCancel: () => void
  onConfirm: () => Promise<void>
}) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const confirm = async () => {
    setBusy(true)
    setError('')
    try {
      await onConfirm()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudieron vincular las cuentas')
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4" role="presentation">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="link-accounts-title"
        className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl"
      >
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-50 text-indigo-600">
          <Link2 className="h-5 w-5" />
        </div>
        <h2 id="link-accounts-title" className="mt-4 text-lg font-bold text-slate-900">
          ¿Vincular tu cuenta de Google?
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">
          Ya existe una cuenta de Fluently con <strong className="text-slate-900">{pending.email}</strong>. Si las
          vinculas, tendrás una sola cuenta con todo tu progreso y tu email quedará verificado.
        </p>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">
          {pending.keepsPassword
            ? 'Podrás entrar con Google o con tu email y contraseña.'
            : 'Como el email de esa cuenta no estaba confirmado, por seguridad se eliminará su contraseña. Podrás entrar con Google o crear una contraseña nueva con «¿Olvidaste tu contraseña?».'}
        </p>
        {error && (
          <div className="mt-4 flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            <AlertCircle className="h-4 w-4 shrink-0" /> {error}
          </div>
        )}
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="rounded-lg px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-100 disabled:opacity-60"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={confirm}
            disabled={busy}
            className="flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-60"
          >
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            Vincular cuentas
          </button>
        </div>
      </div>
    </div>
  )
}
