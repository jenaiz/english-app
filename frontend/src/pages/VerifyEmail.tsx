import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { AlertCircle, Loader2 } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { buttonClass } from '../components/ui/Button'

// Tokens are single-use, so keep one request per token even if the effect runs twice
// (React StrictMode in development).
const inFlight = new Map<string, Promise<void>>()

export default function VerifyEmail() {
  const { verifyEmail } = useAuth()
  const navigate = useNavigate()
  const token = useSearchParams()[0].get('token') ?? ''
  const [failed, setFailed] = useState(!token)

  useEffect(() => {
    if (!token) return
    let alive = true
    let request = inFlight.get(token)
    if (!request) {
      request = verifyEmail(token)
      inFlight.set(token, request)
    }
    request
      .then(() => alive && navigate('/levels', { replace: true }))
      .catch(() => alive && setFailed(true))
    return () => {
      alive = false
    }
  }, [token, verifyEmail, navigate])

  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-12">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        {failed ? (
          <>
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-red-600">
              <AlertCircle className="h-6 w-6" />
            </div>
            <h1 className="h-section mt-4">Enlace no válido</h1>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">
              El enlace ha caducado o ya se ha usado. Si tu cuenta ya está confirmada, inicia sesión. Si no, intenta
              iniciar sesión y pide que te reenviemos el email.
            </p>
            <Link
              to="/login"
              className={buttonClass({ size: 'sm', className: 'mt-6' })}
            >
              Ir a iniciar sesión
            </Link>
          </>
        ) : (
          <>
            <Loader2 className="mx-auto h-8 w-8 animate-spin text-indigo-600" />
            <p className="mt-4 text-slate-600">Confirmando tu email…</p>
          </>
        )}
      </div>
    </div>
  )
}
