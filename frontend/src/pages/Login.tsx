import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import AuthForm, { validateCredentials } from '../components/AuthForm'
import GoogleSignIn from '../components/GoogleSignIn'
import { useAuth } from '../context/AuthContext'

export default function Login() {
  const { user, login, loginWithGoogle } = useAuth()
  const navigate = useNavigate()
  const from = (useLocation().state as { from?: string } | null)?.from ?? '/levels'

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
        await login(v.email.trim(), v.password)
        navigate(from, { replace: true })
      }}
      alternative={
        <GoogleSignIn
          text="signin_with"
          onCredential={async (credential) => {
            await loginWithGoogle(credential)
            navigate(from, { replace: true })
          }}
        />
      }
      footer={
        <>
          ¿No tienes cuenta?{' '}
          <Link to="/register" className="font-medium text-indigo-600 hover:underline">
            Regístrate
          </Link>
        </>
      }
    />
  )
}
