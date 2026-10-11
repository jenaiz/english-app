import { MASTERED_AT } from '../components/expressions/progress'
import type { ExpressionKind, Pack } from '../types'

export interface PackProgress {
  total: number
  /** In Repaso (or queued for it). */
  added: number
  /** Recalled MASTERED_AT times in a row. A pack is complete when every item is mastered. */
  mastered: number
}

const split = (item: string) => item.split(':') as [ExpressionKind, string]

export function packProgress(pack: Pack, repetitionsOf: (kind: ExpressionKind, id: string) => number | undefined): PackProgress {
  let added = 0
  let mastered = 0
  for (const item of pack.items) {
    const reps = repetitionsOf(...split(item))
    if (reps === undefined) continue
    added++
    if (reps >= MASTERED_AT) mastered++
  }
  return { total: pack.items.length, added, mastered }
}

const LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2']

/** Packs of the level first, then the closest levels, keeping the content order within a level. */
export function packsForLevel(packs: Pack[], level: string): Pack[] {
  if (level === 'all') return packs
  const at = LEVELS.indexOf(level)
  return [...packs].sort((a, b) => Math.abs(LEVELS.indexOf(a.level) - at) - Math.abs(LEVELS.indexOf(b.level) - at))
}
