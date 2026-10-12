import { Link, NavLink, useLocation } from 'react-router-dom'
import { Brain, Gift, Layers, Sparkles, type LucideIcon } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useClubSummary } from '../lib/club'
import { useSrsSummary } from '../lib/useSrsSummary'
import UserMenu from './UserMenu'
import { buttonClass } from './ui/Button'

interface Section {
  to: string
  label: string
  Icon: LucideIcon
  /** Number on the badge, if any. */
  count?: number
  /** Badge colour: amber for news (Club), indigo for things to do (Repaso). */
  badge?: string
  /** Also active on these paths (units belong to Inicio). */
  alsoActive?: boolean
  ariaLabel?: string
}

function useSections(): Section[] {
  const { user } = useAuth()
  const srs = useSrsSummary(!!user)
  const club = useClubSummary(!!user)
  const inCourse = useLocation().pathname.startsWith('/unidades/')
  if (!user) return [{ to: '/expresiones', label: 'Expresiones', Icon: Sparkles }]
  return [
    { to: '/niveles', label: 'Inicio', Icon: Layers, alsoActive: inCourse },
    { to: '/expresiones', label: 'Expresiones', Icon: Sparkles },
    {
      to: '/club',
      label: 'Club',
      Icon: Gift,
      count: club?.new,
      badge: 'bg-amber-400 text-amber-950',
      ariaLabel: club?.new ? `Club, ${club.new} sorpresas nuevas` : undefined,
    },
    {
      to: '/repaso',
      label: 'Repaso',
      Icon: Brain,
      count: srs?.due,
      badge: 'bg-indigo-600 text-white',
      ariaLabel: srs?.due ? `Repaso, ${srs.due} pendientes` : undefined,
    },
  ]
}

const Badge = ({ s, className = '' }: { s: Section; className?: string }) =>
  s.count ? <span className={`grid h-5 min-w-5 place-items-center rounded-full px-1.5 text-xs font-bold ${s.badge} ${className}`}>{s.count}</span> : null

export default function Navbar() {
  const { user, loading } = useAuth()
  const sections = useSections()

  return (
    <>
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/80 backdrop-blur print:hidden">
        {/* Three columns so the section links stay centred whatever the width of the sides. */}
        <nav className="mx-auto grid h-16 max-w-6xl grid-cols-[1fr_auto_1fr] items-center gap-2 px-4">
          <Link
            to={user ? '/niveles' : '/'}
            aria-label={user ? 'Fluently, ir a Inicio' : 'Fluently'}
            className="flex items-center gap-2 justify-self-start text-lg font-bold text-slate-900"
          >
            <img src="/favicon.svg" alt="" className="h-9 w-9" />
            <span className="font-display text-xl">Fluently</span>
          </Link>

          {/* On phones signed-in learners get the bottom bar instead. */}
          <div className={`items-center gap-1 text-sm ${loading ? 'invisible' : ''} ${user ? 'hidden sm:flex' : 'hidden min-[420px]:flex'}`}>
            {sections.map((s) => (
              <NavLink
                key={s.to}
                to={s.to}
                aria-label={s.ariaLabel}
                className={({ isActive }) =>
                  `relative flex items-center gap-1.5 rounded-lg px-3 py-2 font-medium transition ${
                    isActive || s.alsoActive ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-100'
                  }`
                }
              >
                <s.Icon className="h-4 w-4" /> {s.label}
                <Badge s={s} />
              </NavLink>
            ))}
          </div>

          {/* While the session is being checked, show neither side: no flash of "Iniciar sesión" for signed-in learners. */}
          {loading ? null : user ? (
            <div className="col-start-3 flex justify-self-end text-sm">
              <UserMenu />
            </div>
          ) : (
            <div className="col-start-3 flex items-center gap-1 justify-self-end text-sm sm:gap-2">
              <Link to="/login" className="whitespace-nowrap rounded-lg px-2 py-2 font-medium text-slate-600 hover:bg-slate-100 sm:px-3">
                Iniciar sesión
              </Link>
              <Link to="/register" className={buttonClass({ size: 'sm', className: 'whitespace-nowrap' })}>
                Empieza gratis
              </Link>
            </div>
          )}
        </nav>
      </header>

      {user && (
        <nav
          aria-label="Secciones"
          className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-4 border-t border-slate-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur sm:hidden print:hidden"
        >
          {sections.map((s) => (
            <NavLink
              key={s.to}
              to={s.to}
              aria-label={s.ariaLabel}
              className={({ isActive }) =>
                `relative flex flex-col items-center gap-0.5 py-2 text-[11px] font-medium transition ${
                  isActive || s.alsoActive ? 'text-indigo-700' : 'text-slate-500'
                }`
              }
            >
              <s.Icon className="h-5 w-5" />
              {s.label}
              <Badge s={s} className="absolute top-1 left-1/2 ml-2" />
            </NavLink>
          ))}
        </nav>
      )}
    </>
  )
}

/** Room at the bottom of the page for the phone bottom bar, so it never covers the footer. */
export function BottomNavSpacer() {
  const { user } = useAuth()
  return user ? <div aria-hidden="true" className="h-16 sm:hidden print:hidden" /> : null
}
