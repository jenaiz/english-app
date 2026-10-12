import type { ExpressionsCatalog, Idiom, Particle, PhrasalVerb } from '../types'
import { SITE } from './site'

/**
 * Public pages, one per idiom and phrasal verb: /expresiones/idioms/:id and /expresiones/phrasal-verbs/:id.
 * They are prerendered as static HTML at build time (scripts/prerender.mjs) so search engines can index them,
 * and rendered by the SPA for in-app navigation. Everything here is pure, so it runs in Node and in the browser.
 */
export type PageKind = 'idiom' | 'phrasal'

export interface PageLink {
  path: string
  term: string
  translation: string
}

interface PageBase {
  id: string
  term: string
  level: string
  /** Packs that include the expression. */
  packs: { id: string; title: string }[]
}

export interface IdiomPageData extends PageBase {
  kind: 'idiom'
  idiom: Idiom
  similar: PageLink[]
  /** Other idioms of the same topic. */
  sameTopic: PageLink[]
}

export interface PhrasalPageData extends PageBase {
  kind: 'phrasal'
  root: string
  verb: PhrasalVerb
  /** The general idea of the particle, when there is one. */
  particle?: Particle
  similar: PageLink[]
  /** The other phrasal verbs of the same root verb. */
  family: PageLink[]
}

export type ExpressionPageData = IdiomPageData | PhrasalPageData

const SEGMENT: Record<PageKind, string> = { idiom: 'idioms', phrasal: 'phrasal-verbs' }
const RELATED_LIMIT = 6

export const pagePath = (kind: PageKind, id: string) => `/expresiones/${SEGMENT[kind]}/${id}`
/** The page that lists every idiom or every phrasal verb. */
export const indexPath = (kind: PageKind) => `/expresiones/${SEGMENT[kind]}`

export const kindFromSegment = (segment: string | undefined): PageKind | null =>
  segment === 'idioms' ? 'idiom' : segment === 'phrasal-verbs' ? 'phrasal' : null

const idiomLink = (i: Idiom): PageLink => ({ path: pagePath('idiom', i.id), term: i.term, translation: i.equivalent_es })
const phrasalLink = (root: string, v: PhrasalVerb): PageLink => ({
  path: pagePath('phrasal', v.id),
  term: `${root} ${v.particle}`,
  translation: v.translation,
})

const packsWith = (catalog: ExpressionsCatalog, item: string) =>
  catalog.packs.filter((p) => p.items.includes(item)).map((p) => ({ id: p.id, title: p.title }))

/** Everything a page shows, or null if the expression doesn't exist. */
export function buildPage(catalog: ExpressionsCatalog, kind: PageKind, id: string): ExpressionPageData | null {
  if (kind === 'idiom') {
    const idiom = catalog.idioms.find((i) => i.id === id)
    if (!idiom) return null
    const similar = (idiom.similar ?? []).flatMap((s) => catalog.idioms.filter((i) => i.id === s)).map(idiomLink)
    const taken = new Set([idiom.id, ...(idiom.similar ?? [])])
    const sameTopic = catalog.idioms
      .filter((i) => i.topic === idiom.topic && !taken.has(i.id))
      // Essentials first: they are the ones worth learning next.
      .sort((a, b) => Number(!!b.core) - Number(!!a.core))
      .slice(0, RELATED_LIMIT)
      .map(idiomLink)
    return { kind, id, term: idiom.term, level: idiom.level, idiom, similar, sameTopic, packs: packsWith(catalog, `idiom:${id}`) }
  }
  for (const f of catalog.phrasal_verbs) {
    const verb = f.items.find((v) => v.id === id)
    if (!verb) continue
    const similar = (verb.similar ?? []).flatMap((s) => {
      for (const g of catalog.phrasal_verbs) {
        const v = g.items.find((x) => x.id === s)
        if (v) return [phrasalLink(g.root, v)]
      }
      return []
    })
    const main = verb.particle.split(' ')[0]
    return {
      kind,
      id,
      term: `${f.root} ${verb.particle}`,
      level: verb.level,
      root: f.root,
      verb,
      particle: catalog.particles.find((p) => p.particle === main),
      similar,
      family: f.items.filter((v) => v.id !== id).map((v) => phrasalLink(f.root, v)),
      packs: packsWith(catalog, `phrasal:${id}`),
    }
  }
  return null
}

/** Every page path, for the prerender and the sitemap. */
export function allPages(catalog: ExpressionsCatalog): { kind: PageKind; id: string }[] {
  return [
    ...catalog.idioms.map((i) => ({ kind: 'idiom' as const, id: i.id })),
    ...catalog.phrasal_verbs.flatMap((f) => f.items.map((v) => ({ kind: 'phrasal' as const, id: v.id }))),
  ]
}

export interface IndexGroup {
  id: string
  title: string
  links: PageLink[]
}

/** The list of every idiom (by level) or every phrasal verb (by root verb). */
export interface ExpressionIndexData {
  index: true
  kind: PageKind
  total: number
  groups: IndexGroup[]
}

const LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1']
const byTerm = (a: PageLink, b: PageLink) => a.term.localeCompare(b.term, 'en')

export function buildIndex(catalog: ExpressionsCatalog, kind: PageKind): ExpressionIndexData {
  if (kind === 'idiom') {
    const groups = LEVELS.map((level) => ({
      id: level.toLowerCase(),
      title: `Nivel ${level}`,
      links: catalog.idioms
        .filter((i) => i.level === level)
        .map(idiomLink)
        .sort(byTerm),
    })).filter((g) => g.links.length > 0)
    return { index: true, kind, total: catalog.idioms.length, groups }
  }
  const groups = [...catalog.phrasal_verbs]
    .sort((a, b) => a.root.localeCompare(b.root, 'en'))
    .map((f) => ({ id: f.root, title: f.root, links: f.items.map((v) => phrasalLink(f.root, v)) }))
  return { index: true, kind, total: groups.reduce((n, g) => n + g.links.length, 0), groups }
}

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

/** The site's title and description, as in index.html. */
export const DEFAULT_META = {
  title: 'Fluently · Learn English',
  description: 'Aprende inglés del A1 al C1 con lecciones cortas, idioms, phrasal verbs y repaso espaciado. Gratis.',
}

export interface PageMeta {
  title: string
  description: string
  canonical: string
  /** schema.org structured data. */
  jsonLd: Record<string, unknown>
}

/** Title, description and structured data, written for what Spanish speakers search: "break the ice significado". */
export function pageMeta(page: ExpressionPageData): PageMeta {
  const term = capitalize(page.term)
  const canonical = SITE.url + pagePath(page.kind, page.id)
  let title: string
  let description: string
  let definition: string
  if (page.kind === 'idiom') {
    title = `${term}: qué significa en español y ejemplos`
    description = `«${page.term}» es una expresión inglesa que significa «${page.idiom.equivalent_es}». Significado, ejemplos con audio y cómo usarla (nivel ${page.level}).`
    definition = page.idiom.definition
  } else {
    title = `${term}: significado del phrasal verb en español`
    description = `«${page.term}» es un phrasal verb que significa «${page.verb.translation}». Significado, ejemplo con audio${page.family.length > 0 ? ` y otros phrasal verbs con ${page.root}` : ''} (nivel ${page.level}).`
    definition = page.verb.meaning
  }
  return {
    title: `${title} | ${SITE.name}`,
    description,
    canonical,
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'DefinedTerm',
      name: page.term,
      description: definition,
      inLanguage: 'en',
      url: canonical,
      inDefinedTermSet: {
        '@type': 'DefinedTermSet',
        name: page.kind === 'idiom' ? 'Idioms en inglés' : 'Phrasal verbs en inglés',
        url: SITE.url + indexPath(page.kind),
      },
    },
  }
}

/** Title, description and structured data of a list page: "idioms en inglés", "lista de phrasal verbs". */
export function indexMeta(data: ExpressionIndexData): PageMeta {
  const canonical = SITE.url + indexPath(data.kind)
  const idiom = data.kind === 'idiom'
  const title = idiom
    ? `Idioms en inglés: ${data.total} expresiones con su significado en español`
    : `Lista de phrasal verbs en inglés con su significado en español`
  const description = idiom
    ? `Los ${data.total} idioms en inglés más útiles, ordenados por nivel del A2 al C1, con su equivalente en español, ejemplos y audio.`
    : `${data.total} phrasal verbs en inglés agrupados por verbo (get, take, look, put…), con su significado en español, un ejemplo y audio.`
  return {
    title: `${title} | ${SITE.name}`,
    description,
    canonical,
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'DefinedTermSet',
      name: idiom ? 'Idioms en inglés' : 'Phrasal verbs en inglés',
      description,
      inLanguage: 'en',
      url: canonical,
      hasDefinedTerm: data.groups.flatMap((g) => g.links).map((l) => ({ '@type': 'DefinedTerm', name: l.term, url: SITE.url + l.path })),
    },
  }
}

// The prerendered HTML carries the page's data, so the SPA can take over without fetching the catalog
// and without flashing a spinner over content that is already on screen.
export const PAGE_DATA_ID = 'expression-page-data'
let primed: ExpressionPageData | ExpressionIndexData | null = null

/** Used by the prerender, which has no DOM, before rendering a page. */
export function primePageData(data: ExpressionPageData | ExpressionIndexData | null) {
  primed = data
}

function prerendered(): ExpressionPageData | ExpressionIndexData | null {
  if (primed) return primed
  if (typeof document === 'undefined') return null
  try {
    const el = document.getElementById(PAGE_DATA_ID)
    return el?.textContent ? JSON.parse(el.textContent) : null
  } catch {
    return null
  }
}

/** The data the page was prerendered with, if it is this expression's page. */
export function initialPageData(kind: PageKind | null, id: string | undefined): ExpressionPageData | null {
  const data = prerendered()
  return data && !('index' in data) && data.kind === kind && data.id === id ? data : null
}

/** The data the list page was prerendered with, if it is this kind's list. */
export function initialIndexData(kind: PageKind): ExpressionIndexData | null {
  const data = prerendered()
  return data && 'index' in data && data.kind === kind ? data : null
}
