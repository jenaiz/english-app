import { Link } from 'react-router-dom'
import { CheckCircle2 } from 'lucide-react'
import type { PackProgress } from '../../lib/packs'
import type { Pack } from '../../types'
import LevelBadge from '../ui/LevelBadge'

/** A pack in a list: title, level, size and progress (mastered items). */
export default function PackCard({ pack, progress }: { pack: Pack; progress: PackProgress }) {
  const complete = progress.mastered === progress.total
  const pct = (progress.mastered / progress.total) * 100
  return (
    <Link
      to={`/expresiones/packs/${pack.id}`}
      className="group flex flex-col rounded-2xl border border-slate-200 bg-white p-5 transition hover:border-indigo-300 hover:shadow-sm"
    >
      <div className="flex items-center justify-between gap-2 text-xs font-semibold">
        <span className="text-slate-500">{progress.total} expresiones</span>
        <LevelBadge level={pack.level} />
      </div>
      <h3 className="mt-3 font-display text-lg leading-snug font-bold text-indigo-950 group-hover:text-indigo-700">{pack.title}</h3>
      <p className="mt-1 text-sm text-slate-600">{pack.description}</p>
      <div className="mt-auto pt-4">
        {complete ? (
          <p className="flex items-center gap-1.5 text-sm font-semibold text-emerald-700">
            <CheckCircle2 className="h-4 w-4" /> Completado
          </p>
        ) : (
          <>
            <div className="h-1.5 overflow-hidden rounded-full bg-slate-100" aria-hidden="true">
              <div className="h-full rounded-full bg-emerald-500" style={{ width: `${pct}%` }} />
            </div>
            <p className="mt-1.5 text-xs text-slate-500 tabular-nums">
              {progress.mastered} de {progress.total} dominadas
              {progress.added > progress.mastered && ` · ${progress.added - progress.mastered} aprendiendo`}
            </p>
          </>
        )}
      </div>
    </Link>
  )
}
