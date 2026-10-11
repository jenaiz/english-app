// Recalled this many times in a row, a phrasal verb counts as mastered (it has reached free recall in Repaso).
export const MASTERED_AT = 4

/** queued: added, but waiting for the daily limit of new expressions to enter Repaso. */
export type Progress = 'new' | 'queued' | 'learning' | 'mastered'

/** Progress of an expression from its repetitions in Repaso (undefined: not added). */
export const progressOf = (reps: number | undefined, queued = false): Progress =>
  reps === undefined ? 'new' : queued ? 'queued' : reps >= MASTERED_AT ? 'mastered' : 'learning'

export const PROGRESS_CHIP: Record<Progress, string> = {
  new: 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100',
  queued: 'bg-white text-slate-600 outline-1 outline-dashed outline-slate-400 hover:bg-slate-50',
  learning: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200 hover:bg-amber-100',
  mastered: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200 hover:bg-emerald-100',
}
