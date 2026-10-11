import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { api } from '../api/client'
import AuthForm, { validateCredentials } from '../components/AuthForm'
import EmailSent from '../components/EmailSent'
import GoogleSignIn from '../components/GoogleSignIn'
import { useAuth } from '../context/AuthContext'

export default function Register() {
  const { user, register, loginWithGoogle } = useAuth()
  const navigate = useNavigate()
  const [sentTo, setSentTo] = useState('')

  if (user) return <Navigate to="/levels" replace />

  if (sentTo) {
    return (
      <EmailSent title="Confirma tu email" onResend={() => api.resendVerification(sentTo)}>
        Te hemos enviado un email a <strong className="text-slate-900">{sentTo}</strong>. Abre el enlace para activar
        tu cuenta y empezar a aprender.
      </EmailSent>
    )
  }

  return (
    <AuthForm
      title="Crea tu cuenta"
      subtitle="Guarda tu progreso y avanza nivel a nivel."
      submitLabel="Crear cuenta"
      fields={[
        { name: 'email', label: 'Email', type: 'email', autoComplete: 'email' },
        { name: 'password', label: 'Contraseña', type: 'password', autoComplete: 'new-password' },
        { name: 'confirm', label: 'Repite la contraseña', type: 'password', autoComplete: 'new-password' },
      ]}
      validate={validateCredentials}
      onSubmit={async (v) => {
        await register(v.email.trim(), v.password)
        setSentTo(v.email.trim())
      }}
      alternative={
        <GoogleSignIn
          text="signup_with"
          onCredential={async (credential, link) => {
            await loginWithGoogle(credential, link)
            navigate('/levels', { replace: true })
          }}
        />
      }
      footer={
        <>
          ¿Ya tienes cuenta?{' '}
          <Link to="/login" className="font-medium text-indigo-600 hover:underline">
            Inicia sesión
          </Link>
          <span className="mt-4 block text-xs text-slate-400">
            Al crear una cuenta aceptas los{' '}
            <Link to="/terminos" className="underline hover:text-indigo-600">
              términos y condiciones
            </Link>{' '}
            y la{' '}
            <Link to="/privacidad" className="underline hover:text-indigo-600">
              política de privacidad
            </Link>
            .
          </span>
        </>
      }
    />
  )
}
