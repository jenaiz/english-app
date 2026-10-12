import { Link } from 'react-router-dom'
import { Brain, Layers, Sparkles, type LucideIcon } from 'lucide-react'
import { buttonClass } from '../components/ui/Button'
import { useAuth } from '../context/AuthContext'

const EXITS: { to: string; label: string; Icon: LucideIcon }[] = [
  { to: '/niveles', label: 'Mi curso', Icon: Layers },
  { to: '/expresiones', label: 'Expresiones', Icon: Sparkles },
  { to: '/repaso', label: 'Repaso', Icon: Brain },
]

export default function NotFound() {
  const { user, loading } = useAuth()
  return (
    <div className="mx-auto max-w-lg px-4 py-24 text-center">
      <p className="font-display text-7xl font-extrabold text-indigo-200">404</p>
      <h1 className="h-page mt-4">No encontramos esta página</h1>
      <p className="mt-2 text-slate-600">Puede que el enlace esté mal escrito o que la página ya no exista.</p>
      {loading ? null : user ? (
        <div className="mt-8 grid gap-3 sm:grid-cols-3">
          {EXITS.map(({ to, label, Icon }) => (
            <Link
              key={to}
              to={to}
              className="flex flex-col items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-4 text-sm font-semibold text-slate-700 transition hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700"
            >
              <Icon className="h-5 w-5 text-indigo-600" /> {label}
            </Link>
          ))}
        </div>
      ) : (
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link to="/" className={buttonClass()}>
            Ir a la portada
          </Link>
          <Link to="/expresiones" className={buttonClass({ variant: 'secondary' })}>
            Ver expresiones
          </Link>
        </div>
      )}
    </div>
  )
}
