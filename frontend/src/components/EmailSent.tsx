import { useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { CheckCircle2, Loader2, MailCheck } from 'lucide-react'
import { buttonClass } from './ui/Button'

interface Props {
  title: string
  children: ReactNode
  /** Sends the email again; omit to hide the button. */
  onResend?: () => Promise<void>
}

/** "Check your inbox" card shown after an email has been sent. */
export default function EmailSent({ title, children, onResend }: Props) {
  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-12">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-indigo-50 text-indigo-600">
          <MailCheck className="h-6 w-6" />
        </div>
        <h1 className="h-section mt-4">{title}</h1>
        <div className="mt-2 text-sm leading-relaxed text-slate-600">{children}</div>
        <p className="mt-4 text-xs text-slate-400">Si no lo ves en unos minutos, revisa la carpeta de spam.</p>
        {onResend && <ResendButton onResend={onResend} className="mt-6" />}
        <Link to="/login" className="mt-6 inline-block text-sm font-medium text-indigo-600 hover:underline">
          Volver a iniciar sesión
        </Link>
      </div>
    </div>
  )
}

export function ResendButton({ onResend, className = '' }: { onResend: () => Promise<void>; className?: string }) {
  const [state, setState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')

  const resend = async () => {
    setState('sending')
    try {
      await onResend()
      setState('sent')
    } catch {
      setState('error')
    }
  }

  if (state === 'sent') {
    return (
      <p className={`flex items-center justify-center gap-1.5 text-sm text-emerald-700 ${className}`}>
        <CheckCircle2 className="h-4 w-4" /> Te lo hemos vuelto a enviar
      </p>
    )
  }
  return (
    <div className={className}>
      <button
        type="button"
        onClick={resend}
        disabled={state === 'sending'}
        className={buttonClass({ variant: 'secondary', size: 'sm' })}
      >
        {state === 'sending' && <Loader2 className="h-4 w-4 animate-spin" />}
        Reenviar email
      </button>
      {state === 'error' && <p className="mt-2 text-xs text-red-600">No se pudo reenviar. Inténtalo más tarde.</p>}
    </div>
  )
}
