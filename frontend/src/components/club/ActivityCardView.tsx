import { Link } from 'react-router-dom'
import { CheckCircle2, Clock, Lock } from 'lucide-react'
import { roomOf, youtubeThumb } from '../../lib/club'
import type { ActivityCard } from '../../types'

/** Cover of an unlocked activity: the video thumbnail, or the room's colour and icon. */
export function ActivityCover({ card, className = '' }: { card: Pick<ActivityCard, 'room' | 'youtube_id'>; className?: string }) {
  const room = roomOf(card.room)
  if (card.youtube_id) {
    return <img src={youtubeThumb(card.youtube_id)} alt="" loading="lazy" className={`object-cover ${className}`} />
  }
  return (
    <div className={`grid place-items-center bg-gradient-to-br ${room.bg} ${className}`}>
      <room.Icon className="h-12 w-12 text-white/90" strokeWidth={1.5} />
    </div>
  )
}

/**
 * One card of the Club album. Unlocked cards link to the activity; locked ones lie face down
 * with a hint of what unlocks them.
 */
export default function ActivityCardView({ card }: { card: ActivityCard }) {
  const room = roomOf(card.room)

  if (card.state === 'locked') {
    return (
      <div
        className="flex h-full min-h-56 flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-slate-300 bg-slate-100 bg-[radial-gradient(circle_at_1px_1px,rgb(203_213_225)_1px,transparent_0)] bg-[length:14px_14px] p-4 text-center"
        aria-label={`${room.label}, bloqueada. ${card.hint}`}
      >
        <span className="grid h-12 w-12 place-items-center rounded-full bg-white text-slate-400 shadow-sm">
          <Lock className="h-5 w-5" />
        </span>
        <span className="flex items-center gap-1.5 text-xs font-semibold tracking-wide text-slate-500 uppercase">
          <room.Icon className="h-3.5 w-3.5" /> {room.label} · {card.level}
        </span>
        <span className="text-sm text-slate-500">{card.hint}</span>
      </div>
    )
  }

  return (
    <Link
      to={`/club/${card.id}`}
      className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:border-indigo-300 hover:shadow-md focus-visible:ring-4 focus-visible:ring-indigo-200 focus-visible:outline-none"
    >
      <div className="relative">
        <ActivityCover card={card} className="aspect-video w-full" />
        {card.state === 'new' && (
          <span className="absolute top-2 left-2 rounded-full bg-amber-400 px-2.5 py-0.5 text-xs font-bold text-amber-950 shadow">¡Nueva!</span>
        )}
        {card.state === 'done' && (
          <span className="absolute top-2 left-2 flex items-center gap-1 rounded-full bg-emerald-600 px-2.5 py-0.5 text-xs font-bold text-white shadow">
            <CheckCircle2 className="h-3.5 w-3.5" /> {card.best_score ?? 0}%
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col p-4">
        <span className={`flex items-center gap-1.5 text-xs font-semibold tracking-wide uppercase ${room.accent}`}>
          <room.Icon className="h-3.5 w-3.5" /> {room.label}
        </span>
        <h3 className="mt-1.5 line-clamp-2 font-display text-lg leading-tight font-bold text-slate-900 group-hover:text-indigo-700">{card.title}</h3>
        {card.subtitle && <p className="mt-1 line-clamp-1 text-sm text-slate-500">{card.subtitle}</p>}
        <div className="mt-auto flex items-center gap-2 pt-3 text-xs text-slate-500">
          <span className="rounded-md bg-slate-100 px-1.5 py-0.5 font-semibold text-slate-600">{card.level}</span>
          <span className="flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" /> {card.minutes} min
          </span>
        </div>
      </div>
    </Link>
  )
}
