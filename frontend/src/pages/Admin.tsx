import { useCallback, useEffect, useMemo, useState } from 'react'
import { BadgeCheck, Loader2, Mail, Search, Trash2, X } from 'lucide-react'
import { api } from '../api/client'
import Button from '../components/ui/Button'
import Dialog from '../components/ui/Dialog'
import ErrorState from '../components/ui/ErrorState'
import LevelBadge from '../components/ui/LevelBadge'
import PageShell from '../components/ui/PageShell'
import { PageSkeleton } from '../components/ui/Skeleton'
import { inputClass, pillClass, pillCountClass } from '../components/ui/styles'
import { useAuth } from '../context/AuthContext'
import type { AdminStats, AdminUser, AdminUserDetail } from '../types'
import NotFound from './NotFound'

const DAY = 24 * 60 * 60 * 1000
/** Users not seen for this long are flagged as inactive. */
const INACTIVE_DAYS = 14

const rtf = new Intl.RelativeTimeFormat('es', { numeric: 'auto' })
const dateFmt = new Intl.DateTimeFormat('es', { day: 'numeric', month: 'short', year: 'numeric' })

/** "hace 3 días", "ayer", "hace 2 horas"… */
function ago(iso: string) {
  const diff = (new Date(iso).getTime() - Date.now()) / 1000
  const units: [Intl.RelativeTimeFormatUnit, number][] = [
    ['year', 365 * 86400],
    ['month', 30 * 86400],
    ['week', 7 * 86400],
    ['day', 86400],
    ['hour', 3600],
    ['minute', 60],
  ]
  for (const [unit, secs] of units) {
    if (Math.abs(diff) >= secs) return rtf.format(Math.round(diff / secs), unit)
  }
  return 'ahora mismo'
}

const daysSince = (iso: string | null) => (iso ? (Date.now() - new Date(iso).getTime()) / DAY : Infinity)

type Filter = 'all' | 'unverified' | 'inactive'
type Sort = 'created' | 'seen' | 'level'

const FILTERS: { id: Filter; label: string; test: (u: AdminUser) => boolean }[] = [
  { id: 'all', label: 'Todos', test: () => true },
  { id: 'unverified', label: 'Sin verificar', test: (u) => !u.email_verified },
  { id: 'inactive', label: `Inactivos +${INACTIVE_DAYS} días`, test: (u) => daysSince(u.last_seen_at) > INACTIVE_DAYS },
]

const LEVEL_ORDER = ['A1', 'A2', 'B1', 'B2', 'C1']
const levelRank = (l: string) => (l ? LEVEL_ORDER.indexOf(l.toUpperCase()) : -1)

const SORTS: Record<Sort, { label: string; cmp: (a: AdminUser, b: AdminUser) => number }> = {
  created: { label: 'Alta más reciente', cmp: (a, b) => b.created_at.localeCompare(a.created_at) },
  seen: { label: 'Último acceso', cmp: (a, b) => (b.last_seen_at ?? '').localeCompare(a.last_seen_at ?? '') },
  level: { label: 'Nivel', cmp: (a, b) => levelRank(b.level) - levelRank(a.level) },
}

/** Admin panel: who signed up, whether they verified, where they are and when they last came. */
export default function Admin() {
  const { user } = useAuth()
  if (!user?.is_admin) return <NotFound />
  return <AdminPanel />
}

function AdminPanel() {
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [users, setUsers] = useState<AdminUser[] | null>(null)
  const [limit, setLimit] = useState(0)
  const [error, setError] = useState(false)
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<Filter>('all')
  const [sort, setSort] = useState<Sort>('created')
  const [selected, setSelected] = useState<string | null>(null)

  const load = useCallback(() => {
    setError(false)
    Promise.all([api.admin.stats(), api.admin.users()])
      .then(([s, u]) => {
        setStats(s)
        setUsers(u.users)
        setLimit(u.limit)
      })
      .catch(() => setError(true))
  }, [])
  useEffect(load, [load])

  const shown = useMemo(() => {
    if (!users) return []
    const q = query.trim().toLowerCase()
    const test = FILTERS.find((f) => f.id === filter)!.test
    return users
      .filter((u) => test(u) && (!q || u.email.toLowerCase().includes(q) || u.name.toLowerCase().includes(q)))
      .sort(SORTS[sort].cmp)
  }, [users, query, filter, sort])

  if (error) return <ErrorState onRetry={load} />
  if (!stats || !users) return <PageSkeleton cards={4} />

  return (
    <PageShell width="wide">
      <h1 className="h-page">Administración</h1>

      <dl className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Usuarios" value={stats.users} hint={`${stats.google} con Google`} />
        <Stat label="Verificados" value={stats.verified} hint={stats.users ? `${Math.round((stats.verified / stats.users) * 100)}%` : '—'} />
        <Stat label="Altas" value={stats.new_7d} hint={`7 días · ${stats.new_30d} en 30`} />
        <Stat label="Activos" value={stats.active_7d} hint={`7 días · ${stats.active_1d} hoy · ${stats.active_30d} en 30`} />
      </dl>

      <div className="mt-8 flex flex-wrap items-center gap-3">
        <div className="relative min-w-[14rem] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por email o nombre"
            aria-label="Buscar usuarios"
            className={`${inputClass()} pl-9`}
          />
        </div>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as Sort)}
          aria-label="Ordenar"
          className="rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-700"
        >
          {Object.entries(SORTS).map(([id, s]) => (
            <option key={id} value={id}>
              {s.label}
            </option>
          ))}
        </select>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button key={f.id} type="button" onClick={() => setFilter(f.id)} className={pillClass(filter === f.id)} aria-pressed={filter === f.id}>
            {f.label} <span className={pillCountClass(filter === f.id)}>{users.filter(f.test).length}</span>
          </button>
        ))}
      </div>

      <div className="mt-4 overflow-x-auto rounded-2xl border border-slate-200 bg-white">
        <table className="w-full min-w-[44rem] text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3 font-semibold">Usuario</th>
              <th className="px-4 py-3 font-semibold">Nivel</th>
              <th className="px-4 py-3 font-semibold">Lecciones</th>
              <th className="px-4 py-3 font-semibold">Último acceso</th>
              <th className="px-4 py-3 font-semibold">Alta</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {shown.map((u) => (
              <tr key={u.id} onClick={() => setSelected(u.id)} className="cursor-pointer hover:bg-slate-50">
                <td className="px-4 py-3">
                  <button type="button" onClick={() => setSelected(u.id)} className="text-left font-medium text-slate-900 hover:text-indigo-700">
                    {u.email}
                  </button>
                  <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-slate-500">
                    {u.name && <span>{u.name}</span>}
                    <AccountBadges user={u} />
                  </div>
                </td>
                <td className="px-4 py-3">
                  <Levels user={u} />
                </td>
                <td className="px-4 py-3 tabular-nums text-slate-700">{u.lessons_done}</td>
                <td className="px-4 py-3">
                  <LastSeen iso={u.last_seen_at} />
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-slate-500">{dateFmt.format(new Date(u.created_at))}</td>
              </tr>
            ))}
            {shown.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-slate-500">
                  Ningún usuario coincide.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {users.length >= limit && <p className="mt-2 text-xs text-slate-500">Se muestran las {limit} altas más recientes.</p>}

      {selected && (
        <UserDialog
          id={selected}
          onClose={() => setSelected(null)}
          onDeleted={() => {
            setSelected(null)
            load()
          }}
        />
      )}
    </PageShell>
  )
}

function Stat({ label, value, hint }: { label: string; value: number; hint: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
      <dt className="text-sm text-slate-500">{label}</dt>
      <dd className="font-display text-3xl font-bold tabular-nums text-slate-900">{value}</dd>
      <dd className="text-xs text-slate-500">{hint}</dd>
    </div>
  )
}

function AccountBadges({ user }: { user: AdminUser }) {
  return (
    <>
      {user.email_verified ? (
        <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-50 px-2 py-0.5 font-medium text-emerald-700">
          <BadgeCheck className="h-3 w-3" /> Verificado
        </span>
      ) : (
        <span className="rounded-full bg-amber-50 px-2 py-0.5 font-medium text-amber-700">Sin verificar</span>
      )}
      {user.has_google && <span className="rounded-full bg-slate-100 px-2 py-0.5 font-medium text-slate-600">Google</span>}
      {user.has_password && <span className="rounded-full bg-slate-100 px-2 py-0.5 font-medium text-slate-600">Contraseña</span>}
    </>
  )
}

function Levels({ user }: { user: AdminUser }) {
  if (!user.level && !user.certified_level) return <span className="text-slate-400">Sin empezar</span>
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {user.level && <LevelBadge level={user.level} />}
      {user.certified_level && <span className="text-xs text-slate-500">aprobado {user.certified_level}</span>}
    </div>
  )
}

function LastSeen({ iso }: { iso: string | null }) {
  if (!iso) return <span className="text-slate-400">Nunca</span>
  const stale = daysSince(iso) > INACTIVE_DAYS
  return (
    <span title={new Date(iso).toLocaleString('es')} className={stale ? 'font-medium text-amber-700' : 'text-slate-700'}>
      {ago(iso)}
    </span>
  )
}

function UserDialog({ id, onClose, onDeleted }: { id: string; onClose: () => void; onDeleted: () => void }) {
  const [detail, setDetail] = useState<AdminUserDetail | null>(null)
  const [error, setError] = useState(false)
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [typed, setTyped] = useState('')

  const fetchDetail = useCallback(() => {
    setError(false)
    api.admin.user(id).then(setDetail).catch(() => setError(true))
  }, [id])
  useEffect(fetchDetail, [fetchDetail])

  /** Sends one of the account emails; the backend skips it if the same one went out under a minute ago. */
  const send = async (call: (id: string) => Promise<{ sent: boolean }>, what: string) => {
    setBusy(true)
    setNotice('')
    try {
      const { sent } = await call(id)
      setNotice(sent ? `Email de ${what} enviado.` : 'No se ha enviado: ya se mandó uno hace menos de un minuto.')
    } catch {
      setNotice('No se ha podido enviar el email.')
    } finally {
      setBusy(false)
    }
  }

  const remove = async () => {
    setBusy(true)
    try {
      await api.admin.deleteUser(id)
      onDeleted()
    } catch {
      setNotice('No se ha podido borrar la cuenta.')
      setBusy(false)
    }
  }

  const u = detail?.user
  return (
    <Dialog labelledBy="admin-user-title" onClose={busy ? undefined : onClose} className="max-w-xl">
      <div className="flex items-start justify-between gap-3">
        <h2 id="admin-user-title" className="break-all font-display text-xl font-bold text-slate-900">
          {u?.email ?? 'Usuario'}
        </h2>
        <button type="button" onClick={onClose} aria-label="Cerrar" className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
          <X className="h-5 w-5" />
        </button>
      </div>

      {error && <ErrorState inline onRetry={fetchDetail} className="mt-4" />}
      {!detail && !error && <Loader2 className="mx-auto my-10 h-6 w-6 animate-spin text-indigo-500" />}

      {detail && u && (
        <>
          <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs text-slate-500">
            {u.name && <span>{u.name}</span>}
            <AccountBadges user={u} />
          </div>
          <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
            <dt className="text-slate-500">Alta</dt>
            <dd className="text-slate-800">{dateFmt.format(new Date(u.created_at))}</dd>
            <dt className="text-slate-500">Último acceso</dt>
            <dd>
              <LastSeen iso={u.last_seen_at} />
            </dd>
            <dt className="text-slate-500">Lecciones</dt>
            <dd className="text-slate-800">
              {u.lessons_done} completadas · {detail.lessons_started} empezadas
            </dd>
            <dt className="text-slate-500">Repaso</dt>
            <dd className="text-slate-800">
              {detail.cards_total} tarjetas · {detail.cards_due} pendientes
            </dd>
            <dt className="text-slate-500">Club</dt>
            <dd className="text-slate-800">
              {detail.club_completed} completadas de {detail.club_unlocked} desbloqueadas
            </dd>
          </dl>

          <h3 className="mt-6 text-sm font-semibold text-slate-900">Progreso por nivel</h3>
          <ul className="mt-2 space-y-2">
            {detail.levels.map((lv) => (
              <li key={lv.level_id} className="flex items-center gap-3 text-sm">
                <LevelBadge level={lv.level_id} className="w-10 justify-center" />
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full rounded-full bg-indigo-500" style={{ width: `${lv.units_total ? (lv.units_done / lv.units_total) * 100 : 0}%` }} />
                </div>
                <span className="w-14 text-right tabular-nums text-slate-600">
                  {lv.units_done}/{lv.units_total}
                </span>
              </li>
            ))}
          </ul>

          {detail.exams.length > 0 && (
            <>
              <h3 className="mt-6 text-sm font-semibold text-slate-900">Exámenes</h3>
              <ul className="mt-2 space-y-1 text-sm">
                {detail.exams.map((e, i) => (
                  <li key={i} className="flex items-center gap-2">
                    <LevelBadge level={e.level_id} />
                    <span className="text-slate-500">{dateFmt.format(new Date(e.started_at))}</span>
                    <span className="ml-auto font-medium">
                      {e.submitted_at ? (
                        <span className={e.passed ? 'text-emerald-700' : 'text-red-700'}>
                          {e.score}% · {e.passed ? 'aprobado' : 'suspendido'}
                        </span>
                      ) : (
                        <span className="text-slate-500">en curso</span>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            </>
          )}

          <h3 className="mt-6 text-sm font-semibold text-slate-900">Acciones</h3>
          <div className="mt-2 flex flex-wrap gap-2">
            {!u.email_verified && (
              <Button variant="secondary" size="sm" disabled={busy} onClick={() => send(api.admin.resendVerification, 'verificación')}>
                <Mail className="h-4 w-4" /> Reenviar verificación
              </Button>
            )}
            <Button variant="secondary" size="sm" disabled={busy} onClick={() => send(api.admin.sendReset, 'restablecer contraseña')}>
              <Mail className="h-4 w-4" /> Enviar reset de contraseña
            </Button>
            {!confirming && (
              <Button variant="danger-outline" size="sm" disabled={busy} onClick={() => setConfirming(true)}>
                <Trash2 className="h-4 w-4" /> Borrar cuenta
              </Button>
            )}
          </div>
          {notice && (
            <p role="status" className="mt-3 text-sm text-slate-700">
              {notice}
            </p>
          )}

          {confirming && (
            <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4">
              <p className="text-sm text-red-800">
                Se borrarán la cuenta y todo su progreso. No se puede deshacer. Escribe <strong className="break-all">{u.email}</strong> para confirmar.
              </p>
              <input
                value={typed}
                onChange={(e) => setTyped(e.target.value)}
                aria-label="Email del usuario"
                data-autofocus
                className={`${inputClass({ tone: 'danger' })} mt-3`}
              />
              <div className="mt-3 flex gap-2">
                <Button variant="danger" size="sm" disabled={busy || typed.trim().toLowerCase() !== u.email} onClick={remove}>
                  Borrar definitivamente
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setConfirming(false)
                    setTyped('')
                  }}
                >
                  Cancelar
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </Dialog>
  )
}
