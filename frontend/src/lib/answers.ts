// Contractions are expanded so "I'm" and "I am" compare equal.
const CONTRACTIONS: [RegExp, string][] = [
  [/\bcan't\b/g, 'can not'],
  [/\bcannot\b/g, 'can not'],
  [/\bwon't\b/g, 'will not'],
  [/\bshan't\b/g, 'shall not'],
  [/\bain't\b/g, 'am not'],
  [/n't\b/g, ' not'],
  [/\bi'm\b/g, 'i am'],
  [/'re\b/g, ' are'],
  [/'ve\b/g, ' have'],
  [/'ll\b/g, ' will'],
  [/'d\b/g, ' would'],
  [/\b(he|she|it|that|there|what|where|who|how)'s\b/g, '$1 is'],
]

/**
 * Lowercase, unify quotes, expand contractions, drop punctuation, collapse spaces. Apostrophes
 * are dropped too, unless `strict` keeps them: where the apostrophe is what is being practised
 * (possessive 's, yours / your's), "parents' " and "parent's" must not count as the same.
 */
export function normalize(text: string, strict = false): string {
  let s = text.toLowerCase().replace(/[’‘`´]/g, "'").trim()
  for (const [re, rep] of CONTRACTIONS) s = s.replace(re, rep)
  s = s.replace(/[^\p{L}\p{N}\s']/gu, ' ')
  if (!strict) s = s.replace(/'/g, '')
  return s.replace(/\s+/g, ' ').trim()
}

// "pick up", "pickup" and "pick-up" are the same answer: speech recognition often merges words.
const compact = (normalized: string) => normalized.replace(/ /g, '')

export function isCorrect(input: string, accepted: string[], strict = false): boolean {
  const n = normalize(input, strict)
  return n.length > 0 && accepted.some((a) => normalize(a, strict) === n || compact(normalize(a, strict)) === compact(n))
}

/** Word-level similarity (0..1) used to grade speech recognition, which is never perfect. */
export function similarity(a: string, b: string): number {
  if (normalize(a) && compact(normalize(a)) === compact(normalize(b))) return 1
  const wa = normalize(a).split(' ').filter(Boolean)
  const wb = normalize(b).split(' ').filter(Boolean)
  if (wa.length === 0 || wb.length === 0) return 0
  // Longest common subsequence over words.
  const dp = Array.from({ length: wa.length + 1 }, () => new Array<number>(wb.length + 1).fill(0))
  for (let i = 1; i <= wa.length; i++)
    for (let j = 1; j <= wb.length; j++)
      dp[i][j] = wa[i - 1] === wb[j - 1] ? dp[i - 1][j - 1] + 1 : Math.max(dp[i - 1][j], dp[i][j - 1])
  return dp[wa.length][wb.length] / Math.max(wa.length, wb.length)
}

export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

// ---- Spanish meaning checks (SRS "listen and translate") ----

const SPANISH_ARTICLES = /^(el|la|los|las|un|una|unos|unas)\s+/

function normalizeEs(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(SPANISH_ARTICLES, '')
}

/**
 * Accepted Spanish variants of a translation such as "Ticket / recibo", "Encantado/a" or
 * "Nada más... / En cuanto...": splits alternatives and expands the -o/a gender suffix.
 */
export function spanishVariants(translation: string): string[] {
  const expanded = translation
    .replace(/\([^)]*\)/g, '')
    .replace(/(\p{L}+)o\/a\b/gu, '$1o / $1a')
  return expanded
    .split(/\s*\/\s*|,|;/)
    .map(normalizeEs)
    .filter((v) => v.length > 1)
}

function levenshtein(a: string, b: string): number {
  const prev = Array.from({ length: b.length + 1 }, (_, j) => j)
  for (let i = 1; i <= a.length; i++) {
    let diag = prev[0]
    prev[0] = i
    for (let j = 1; j <= b.length; j++) {
      const tmp = prev[j]
      prev[j] = Math.min(prev[j] + 1, prev[j - 1] + 1, diag + (a[i - 1] === b[j - 1] ? 0 : 1))
      diag = tmp
    }
  }
  return prev[b.length]
}

/** True if the answer matches any variant, ignoring accents and articles and allowing small typos. */
export function matchesMeaning(input: string, translation: string): boolean {
  const n = normalizeEs(input)
  if (n.length === 0) return false
  return spanishVariants(translation).some((v) => {
    const allowed = Math.max(1, Math.floor(v.length * 0.15))
    return n === v || levenshtein(n, v) <= allowed
  })
}

/** Best similarity among several speech recognition alternatives. */
export function bestSimilarity(candidates: string[], target: string): number {
  return Math.max(0, ...candidates.map((c) => similarity(c, target)))
}
