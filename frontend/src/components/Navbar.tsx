import { Link, NavLink } from 'react-router-dom'
import { BookOpen, Brain, Layers } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useSrsSummary } from '../lib/useSrsSummary'
import UserMenu from './UserMenu'

export default function Navbar() {
  const { user } = useAuth()
  const srs = useSrsSummary(!!user)

  return (
    <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/80 backdrop-blur">
      {/* Three columns so the section links stay centred whatever the width of the sides. */}
      <nav className="mx-auto grid h-16 max-w-6xl grid-cols-[1fr_auto_1fr] items-center gap-2 px-4">
        <Link
          to={user ? '/levels' : '/'}
          aria-label={user ? 'Fluently, ir a Inicio' : 'Fluently'}
          className="flex items-center gap-2 justify-self-start text-lg font-bold text-slate-900"
        >
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-indigo-600 text-white">
            <BookOpen className="h-5 w-5" />
          </span>
          <span className="font-display text-xl">Fluently</span>
        </Link>

        {user ? (
          <>
            <div className="flex items-center gap-1 text-sm">
              <NavLink
                to="/levels"
                aria-label="Inicio"
                className={({ isActive }) =>
                  `flex items-center gap-1.5 rounded-lg px-3 py-2 font-medium transition ${
                    isActive ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-100'
                  }`
                }
              >
                <Layers className="h-4 w-4" /> <span className="hidden sm:inline">Inicio</span>
              </NavLink>
              <NavLink
                to="/review"
                aria-label="Repaso"
                className={({ isActive }) =>
                  `relative flex items-center gap-1.5 rounded-lg px-3 py-2 font-medium transition ${
                    isActive ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-100'
                  }`
                }
              >
                <Brain className="h-4 w-4" /> <span className="hidden sm:inline">Repaso</span>
                {!!srs?.due && (
                  <span className="grid h-5 min-w-5 place-items-center rounded-full bg-red-500 px-1.5 text-xs font-bold text-white">
                    {srs.due}
                  </span>
                )}
              </NavLink>
            </div>
            <div className="flex justify-self-end text-sm">
              <UserMenu />
            </div>
          </>
        ) : (
          <div className="col-start-3 flex items-center gap-2 justify-self-end text-sm">
            <Link to="/login" className="rounded-lg px-3 py-2 font-medium text-slate-600 hover:bg-slate-100">
              Iniciar sesión
            </Link>
            <Link
              to="/register"
              className="rounded-lg bg-indigo-600 px-4 py-2 font-medium text-white shadow-sm transition hover:bg-indigo-700"
            >
              Crear cuenta
            </Link>
          </div>
        )}
      </nav>
    </header>
  )
}
