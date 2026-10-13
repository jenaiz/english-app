import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ChevronDown, LogOut, Settings, ShieldCheck } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { displayName } from '../lib/user'

/** Avatar button in the navbar that opens the account menu (user, settings, sign out). */
export default function UserMenu() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onClick = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('mousedown', onClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  if (!user) return null
  const name = displayName(user)

  const handleLogout = async () => {
    setOpen(false)
    await logout()
    navigate('/')
  }

  const itemClass =
    'flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-slate-700 transition hover:bg-slate-100 focus-visible:bg-slate-100 focus-visible:outline-none'

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Menú de la cuenta"
        className="flex items-center gap-1.5 rounded-full py-1 pl-1 pr-2 transition hover:bg-slate-100"
      >
        <span className="grid h-8 w-8 place-items-center rounded-full bg-indigo-100 font-semibold text-indigo-700">
          {name.charAt(0).toUpperCase()}
        </span>
        <span className="hidden max-w-[10rem] truncate font-medium text-slate-700 md:inline">{name}</span>
        <ChevronDown className={`h-4 w-4 text-slate-400 transition ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 mt-2 w-64 rounded-xl border border-slate-200 bg-white p-1.5 shadow-lg"
        >
          <div className="border-b border-slate-100 px-3 pb-2.5 pt-1.5">
            <p className="truncate font-semibold text-slate-900">{name}</p>
            <p className="truncate text-xs text-slate-500">{user.email}</p>
          </div>
          <div className="pt-1.5">
            <Link to="/ajustes" role="menuitem" onClick={() => setOpen(false)} className={itemClass}>
              <Settings className="h-4 w-4 text-slate-400" /> Ajustes
            </Link>
            {user.is_admin && (
              <Link to="/admin" role="menuitem" onClick={() => setOpen(false)} className={itemClass}>
                <ShieldCheck className="h-4 w-4 text-slate-400" /> Administración
              </Link>
            )}
            <button type="button" role="menuitem" onClick={handleLogout} className={itemClass}>
              <LogOut className="h-4 w-4 text-slate-400" /> Salir
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
