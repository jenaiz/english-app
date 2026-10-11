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

export interface PackReview {
  /** Cards of the pack due now (new ones only when they fit in today's limit). */
  due: number
  /** When the next card of the pack is due (ms), when none is due now. */
  nextDue?: number
}

/** What "Repasar este pack" would show: the pack's due cards, matching GET /api/srs/due?pack=. */
export function packReview(
  pack: Pack,
  statusOf: (kind: ExpressionKind, id: string) => 'none' | 'saved' | 'queued',
  dueAtOf: (kind: ExpressionKind, id: string) => number | undefined,
  now = Date.now(),
): PackReview {
  let due = 0
  let nextDue: number | undefined
  for (const item of pack.items) {
    const [kind, id] = split(item)
    const at = dueAtOf(kind, id)
    // Queued cards wait for the daily limit, so they aren't due even if their date has passed.
    if (at === undefined || statusOf(kind, id) !== 'saved') continue
    if (at <= now) due++
    else if (nextDue === undefined || at < nextDue) nextDue = at
  }
  return { due, nextDue: due > 0 ? undefined : nextDue }
}

const LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2']

/** Packs of the level first, then the closest levels, keeping the content order within a level. */
export function packsForLevel(packs: Pack[], level: string): Pack[] {
  if (level === 'all') return packs
  const at = LEVELS.indexOf(level)
  return [...packs].sort((a, b) => Math.abs(LEVELS.indexOf(a.level) - at) - Math.abs(LEVELS.indexOf(b.level) - at))
}
