import { useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { ApiError, api } from '../api/client'
import AuthForm, { validateCredentials } from '../components/AuthForm'
import { ResendButton } from '../components/EmailSent'
import GoogleSignIn from '../components/GoogleSignIn'
import { useAuth } from '../context/AuthContext'

export default function Login() {
  const { user, login, loginWithGoogle } = useAuth()
  const navigate = useNavigate()
  const from = (useLocation().state as { from?: string } | null)?.from ?? '/levels'
  const [unverifiedEmail, setUnverifiedEmail] = useState('')

  if (user) return <Navigate to={from} replace />

  return (
    <AuthForm
      title="Bienvenido de nuevo"
      subtitle="Inicia sesión para continuar donde lo dejaste."
      submitLabel="Iniciar sesión"
      fields={[
        { name: 'email', label: 'Email', type: 'email', autoComplete: 'email' },
        { name: 'password', label: 'Contraseña', type: 'password', autoComplete: 'current-password' },
      ]}
      validate={validateCredentials}
      onSubmit={async (v) => {
        setUnverifiedEmail('')
        try {
          await login(v.email.trim(), v.password)
        } catch (err) {
          if (err instanceof ApiError && err.code === 'email_not_verified') {
            setUnverifiedEmail(v.email.trim())
            throw new Error('Confirma tu email antes de iniciar sesión. Revisa tu bandeja de entrada.')
          }
          throw err
        }
        navigate(from, { replace: true })
      }}
      notice={
        unverifiedEmail && (
          <ResendButton
            key={unverifiedEmail}
            onResend={() => api.resendVerification(unverifiedEmail)}
            className="mt-3 text-center"
          />
        )
      }
      alternative={
        <GoogleSignIn
          text="signin_with"
          onCredential={async (credential, link) => {
            await loginWithGoogle(credential, link)
            navigate(from, { replace: true })
          }}
        />
      }
      footer={
        <>
          <Link to="/olvide-contrasena" className="mb-3 block font-medium text-indigo-600 hover:underline">
            ¿Olvidaste tu contraseña?
          </Link>
          ¿No tienes cuenta?{' '}
          <Link to="/register" className="font-medium text-indigo-600 hover:underline">
            Regístrate
          </Link>
        </>
      }
    />
  )
}
