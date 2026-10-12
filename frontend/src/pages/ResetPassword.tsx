import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { ApiError } from '../api/client'
import AuthForm, { validatePassword } from '../components/AuthForm'
import { useAuth } from '../context/AuthContext'

export default function ResetPassword() {
  const { resetPassword } = useAuth()
  const navigate = useNavigate()
  const token = useSearchParams()[0].get('token') ?? ''

  return (
    <AuthForm
      title="Elige una contraseña nueva"
      subtitle="Después entrarás directamente en tu cuenta."
      submitLabel="Guardar contraseña"
      fields={[
        { name: 'password', label: 'Contraseña nueva', type: 'password', autoComplete: 'new-password', hint: 'Mínimo 8 caracteres.' },
        { name: 'confirm', label: 'Repite la contraseña', type: 'password', autoComplete: 'new-password' },
      ]}
      validate={validatePassword}
      onSubmit={async (v) => {
        try {
          await resetPassword(token, v.password)
        } catch (err) {
          if (err instanceof ApiError && (err.code === 'invalid_token' || err.status === 400)) {
            throw new Error('El enlace no es válido o ha caducado. Pide uno nuevo.')
          }
          throw err
        }
        navigate('/niveles', { replace: true })
      }}
      footer={
        <Link to="/olvide-contrasena" className="font-medium text-indigo-600 hover:underline">
          Pedir un enlace nuevo
        </Link>
      }
    />
  )
}
