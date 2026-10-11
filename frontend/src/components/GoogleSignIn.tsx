import { useEffect, useRef, useState } from 'react'
import { AlertCircle } from 'lucide-react'
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
  onCredential: (credential: string) => Promise<void>
  text?: 'signin_with' | 'signup_with' | 'continue_with'
}

/** "Sign in with Google" button plus an "o" divider. Renders nothing if Google isn't configured. */
export default function GoogleSignIn({ onCredential, text = 'continue_with' }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const [clientId, setClientId] = useState<string | null>(null)
  const [error, setError] = useState('')
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
            onCredentialRef.current(credential).catch((err) =>
              setError(err instanceof Error ? err.message : 'No se pudo iniciar sesión con Google'),
            )
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
    </div>
  )
}
