// Recalled this many times in a row, a phrasal verb counts as mastered (it has reached free recall in Repaso).
export const MASTERED_AT = 4

export type Progress = 'new' | 'learning' | 'mastered'

/** Progress of an expression from its repetitions in Repaso (undefined: not added). */
export const progressOf = (reps: number | undefined): Progress =>
  reps === undefined ? 'new' : reps >= MASTERED_AT ? 'mastered' : 'learning'

export const PROGRESS_CHIP: Record<Progress, string> = {
  new: 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100',
  learning: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200 hover:bg-amber-100',
  mastered: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200 hover:bg-emerald-100',
}
