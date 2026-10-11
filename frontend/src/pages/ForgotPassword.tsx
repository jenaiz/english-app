import { useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api/client'
import AuthForm, { validateEmail } from '../components/AuthForm'
import EmailSent from '../components/EmailSent'

export default function ForgotPassword() {
  const [sentTo, setSentTo] = useState('')

  if (sentTo) {
    return (
      <EmailSent title="Revisa tu email" onResend={() => api.forgotPassword(sentTo)}>
        Si hay una cuenta con <strong className="text-slate-900">{sentTo}</strong>, te hemos enviado un enlace para
        elegir una contraseña nueva. Caduca en 1 hora.
      </EmailSent>
    )
  }

  return (
    <AuthForm
      title="¿Olvidaste tu contraseña?"
      subtitle="Escribe tu email y te enviaremos un enlace para cambiarla."
      submitLabel="Enviar enlace"
      fields={[{ name: 'email', label: 'Email', type: 'email', autoComplete: 'email' }]}
      validate={validateEmail}
      onSubmit={async (v) => {
        await api.forgotPassword(v.email.trim())
        setSentTo(v.email.trim())
      }}
      footer={
        <Link to="/login" className="font-medium text-indigo-600 hover:underline">
          Volver a iniciar sesión
        </Link>
      }
    />
  )
}
