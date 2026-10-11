import { Link, Navigate, useNavigate } from 'react-router-dom'
import AuthForm, { validateCredentials } from '../components/AuthForm'
import { useAuth } from '../context/AuthContext'

export default function Register() {
  const { user, register } = useAuth()
  const navigate = useNavigate()

  if (user) return <Navigate to="/levels" replace />

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
      validate={(v) => {
        const errs = validateCredentials(v)
        if (v.password !== v.confirm) errs.confirm = 'Las contraseñas no coinciden'
        return errs
      }}
      onSubmit={async (v) => {
        await register(v.email.trim(), v.password)
        navigate('/levels', { replace: true })
      }}
      footer={
        <>
          ¿Ya tienes cuenta?{' '}
          <Link to="/login" className="font-medium text-indigo-600 hover:underline">
            Inicia sesión
          </Link>
        </>
      }
    />
  )
}
