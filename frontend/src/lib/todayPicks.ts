import type { ExpressionKind, ExpressionsCatalog, Idiom, PhrasalVerb } from '../types'

/** What a compact expression card needs, for idioms and phrasal verbs alike. */
export interface ExpressionSummary {
  kind: ExpressionKind
  id: string
  term: string
  level: string
  definition: string
  translation: string
  example: string
}

/** Looks up an item such as "idiom:break-the-ice" or "phrasal:look-up" in the catalog. */
export function summaryOf(catalog: ExpressionsCatalog, item: string): ExpressionSummary | null {
  const [kind, id] = item.split(':')
  if (kind === 'idiom') {
    const i = catalog.idioms.find((x) => x.id === id)
    return i ? idiomSummary(i) : null
  }
  for (const f of catalog.phrasal_verbs) {
    const v = f.items.find((x) => x.id === id)
    if (v) return phrasalSummary(f.root, v)
  }
  return null
}

const idiomSummary = (i: Idiom): ExpressionSummary => ({
  kind: 'idiom',
  id: i.id,
  term: i.term,
  level: i.level,
  definition: i.definition,
  translation: i.equivalent_es,
  example: i.examples[0] ?? '',
})

const phrasalSummary = (root: string, v: PhrasalVerb): ExpressionSummary => ({
  kind: 'phrasal',
  id: v.id,
  term: `${root} ${v.particle}`,
  level: v.level,
  definition: v.meaning,
  translation: v.translation,
  example: v.example,
})

// Today's selection: two idioms and one phrasal verb.
const IDIOMS_PER_DAY = 2
const PHRASAL_PER_DAY = 1

/** Local calendar date, e.g. "2026-10-11": the selection changes at the learner's midnight. */
export function localDate(d = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// FNV-1a: a small, stable string hash.
function hash(s: string): number {
  let h = 0x811c9dc5
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return h >>> 0
}

/**
 * Orders candidates by a hash of the seed and their id, and takes the first n. Removing a candidate
 * doesn't reorder the rest, so the selection stays the same all day while the seed doesn't change.
 * Essentials come first; other expressions of the level only fill in when the essentials run out.
 */
function pick<T extends { id: string; core?: boolean }>(items: T[], n: number, seed: string): T[] {
  const order = (xs: T[]) => [...xs].sort((a, b) => hash(seed + a.id) - hash(seed + b.id))
  return [...order(items.filter((i) => i.core)), ...order(items.filter((i) => !i.core))].slice(0, n)
}

/**
 * Today's expressions for a level ("all" for any level). exclude leaves out what the learner already
 * had before today; expressions added today stay, so the selection doesn't change as they add them.
 */
export function pickToday(
  catalog: ExpressionsCatalog,
  level: string,
  seed: string,
  exclude: (kind: ExpressionKind, id: string) => boolean,
): ExpressionSummary[] {
  const inLevel = (l: string) => level === 'all' || l === level
  const idioms = pick(
    catalog.idioms.filter((i) => inLevel(i.level) && !exclude('idiom', i.id)),
    IDIOMS_PER_DAY,
    seed,
  ).map(idiomSummary)
  const verbs = catalog.phrasal_verbs.flatMap((f) => f.items.map((v) => ({ ...v, root: f.root })))
  const phrasal = pick(
    verbs.filter((v) => inLevel(v.level) && !exclude('phrasal', v.id)),
    PHRASAL_PER_DAY,
    seed,
  ).map((v) => phrasalSummary(v.root, v))
  return [...idioms, ...phrasal]
}
