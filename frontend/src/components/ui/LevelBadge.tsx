import { colorOf } from '../../lib/levels'

/** A CEFR level as a pill, in that level's own colour (the same everywhere in the app). */
export default function LevelBadge({ level, className = '' }: { level: string; className?: string }) {
  const c = colorOf(level)
  return <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold ${c.soft} ${c.text} ${className}`}>{level}</span>
}
