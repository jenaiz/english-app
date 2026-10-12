import { Link, NavLink, useLocation } from 'react-router-dom'
import { Brain, Gift, Layers, Sparkles } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useClubSummary } from '../lib/club'
import { useSrsSummary } from '../lib/useSrsSummary'
import UserMenu from './UserMenu'

export default function Navbar() {
  const { user } = useAuth()
  const srs = useSrsSummary(!!user)
  const club = useClubSummary(!!user)
  // Units and their study sheets belong to Inicio too.
  const inCourse = useLocation().pathname.startsWith('/units/')

  return (
    <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/80 backdrop-blur print:hidden">
      {/* Three columns so the section links stay centred whatever the width of the sides. */}
      <nav className="mx-auto grid h-16 max-w-6xl grid-cols-[1fr_auto_1fr] items-center gap-2 px-4">
        <Link
          to={user ? '/levels' : '/'}
          aria-label={user ? 'Fluently, ir a Inicio' : 'Fluently'}
          className="flex items-center gap-2 justify-self-start text-lg font-bold text-slate-900"
        >
          <img src="/favicon.svg" alt="" className="h-9 w-9" />
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
                    isActive || inCourse ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-100'
                  }`
                }
              >
                <Layers className="h-4 w-4" /> <span className="hidden sm:inline">Inicio</span>
              </NavLink>
              <NavLink
                to="/expresiones"
                aria-label="Expresiones"
                className={({ isActive }) =>
                  `flex items-center gap-1.5 rounded-lg px-3 py-2 font-medium transition ${
                    isActive ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-100'
                  }`
                }
              >
                <Sparkles className="h-4 w-4" /> <span className="hidden sm:inline">Expresiones</span>
              </NavLink>
              <NavLink
                to="/club"
                aria-label={club?.new ? `Club, ${club.new} sorpresas nuevas` : 'Club'}
                className={({ isActive }) =>
                  `relative flex items-center gap-1.5 rounded-lg px-3 py-2 font-medium transition ${
                    isActive ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-100'
                  }`
                }
              >
                <Gift className="h-4 w-4" /> <span className="hidden sm:inline">Club</span>
                {!!club?.new && (
                  <span className="grid h-5 min-w-5 place-items-center rounded-full bg-amber-400 px-1.5 text-xs font-bold text-amber-950">
                    {club.new}
                  </span>
                )}
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
          <div className="col-span-2 col-start-2 flex items-center gap-1 justify-self-end text-sm sm:gap-2">
            <Link to="/login" className="whitespace-nowrap rounded-lg px-2 py-2 font-medium sm:px-3 text-slate-600 hover:bg-slate-100">
              Iniciar sesión
            </Link>
            <Link
              to="/register"
              className="whitespace-nowrap rounded-lg bg-indigo-600 px-3 py-2 font-medium text-white sm:px-4 shadow-sm transition hover:bg-indigo-700"
            >
              Crear cuenta
            </Link>
          </div>
        )}
      </nav>
    </header>
  )
}
