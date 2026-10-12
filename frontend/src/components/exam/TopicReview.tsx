import { Link } from 'react-router-dom'
import { BookOpen } from 'lucide-react'
import type { TopicScore } from '../../types'

/** The topics with mistakes, weakest first. */
export const weakest = (topics: TopicScore[]) => topics.filter((t) => t.correct < t.total).sort((a, b) => a.correct / a.total - b.correct / b.total)

/** Topics to review, each with its score and links to the units that teach it. */
export default function TopicReview({ topics }: { topics: TopicScore[] }) {
  return (
    <ul className="mt-4 divide-y divide-slate-200 rounded-2xl border border-slate-200 bg-white">
      {topics.map((t) => (
        <li key={t.tag} className="flex flex-wrap items-center gap-x-4 gap-y-2 p-4">
          <div className="min-w-0 flex-1">
            <p className="font-medium text-slate-900">{t.label}</p>
            <p className="mt-1 flex flex-wrap gap-2 text-sm">
              {t.units.map((u) => (
                <Link
                  key={u.unit_id}
                  to={`/unidades/${u.unit_id}/estudiar?level=${u.level_id}&tab=grammar`}
                  className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 font-medium text-slate-700 hover:bg-indigo-50 hover:text-indigo-700"
                >
                  <BookOpen className="h-3.5 w-3.5" /> {u.title}
                </Link>
              ))}
            </p>
          </div>
          <span className={`text-sm font-semibold tabular-nums ${t.correct === 0 ? 'text-red-700' : 'text-amber-700'}`}>
            {t.correct}/{t.total}
          </span>
        </li>
      ))}
    </ul>
  )
}
