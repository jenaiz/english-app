import type { Grade } from '../../types'

export type PassGrade = Exclude<Grade, 'again'>

/** How a right answer felt. Keys 1-3 pick them in Repaso. */
export const PASS_GRADES: { grade: PassGrade; label: string; cls: string; key: string }[] = [
  { grade: 'hard', label: 'Difícil', cls: 'bg-amber-700 hover:bg-amber-800', key: '1' },
  { grade: 'good', label: 'Bien', cls: 'bg-emerald-700 hover:bg-emerald-800', key: '2' },
  { grade: 'easy', label: 'Fácil', cls: 'bg-sky-700 hover:bg-sky-800', key: '3' },
]

/** Time until a card comes back, short: "10 min", "5 h", "1,3 d", "2 meses". */
export function formatInterval(days: number) {
  if (days < 1 / 24) return `${Math.max(1, Math.round(days * 24 * 60))} min`
  if (days < 1) return `${Math.round(days * 24)} h`
  if (days < 30) return `${(Math.round(days * 10) / 10).toLocaleString('es-ES')} d`
  const months = Math.round(days / 30)
  return `${months} ${months === 1 ? 'mes' : 'meses'}`
}

interface Props {
  /** When each grade brings the card back, already formatted. */
  intervals: Record<PassGrade, string>
  onGrade: (grade: PassGrade) => void
  disabled?: boolean
  /** Highlights the chosen one (the home page demo). */
  selected?: PassGrade | null
}

/** "¿Qué tal te ha costado?" with the three grades: the same in Repaso and on the home page. */
export default function GradeButtons({ intervals, onGrade, disabled, selected }: Props) {
  return (
    <>
      <p className="mb-2 text-center text-xs text-slate-500">¿Qué tal te ha costado?</p>
      <div className="grid grid-cols-3 gap-2">
        {PASS_GRADES.map((g) => (
          <button
            key={g.grade}
            type="button"
            disabled={disabled}
            aria-pressed={selected === undefined ? undefined : selected === g.grade}
            onClick={() => onGrade(g.grade)}
            className={`flex flex-col items-center rounded-xl px-2 py-2.5 font-semibold text-white transition focus-visible:ring-4 focus-visible:ring-slate-300 focus-visible:outline-none disabled:opacity-50 ${g.cls} ${
              selected === g.grade ? 'ring-4 ring-slate-300' : ''
            }`}
          >
            <span className="text-sm">{g.label}</span>
            <span className="text-xs font-medium opacity-80">{intervals[g.grade]}</span>
          </button>
        ))}
      </div>
    </>
  )
}
