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

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

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
        url: `${SITE.url}/expresiones`,
      },
    },
  }
}

// The prerendered HTML carries the page's data, so the SPA can take over without fetching the catalog
// and without flashing a spinner over content that is already on screen.
export const PAGE_DATA_ID = 'expression-page-data'
let primed: ExpressionPageData | null = null

/** Used by the prerender, which has no DOM, before rendering a page. */
export function primePageData(page: ExpressionPageData | null) {
  primed = page
}

/** The data the page was prerendered with, if it is this expression's page. */
export function initialPageData(kind: PageKind | null, id: string | undefined): ExpressionPageData | null {
  let page = primed
  if (!page && typeof document !== 'undefined') {
    try {
      const el = document.getElementById(PAGE_DATA_ID)
      page = el?.textContent ? (JSON.parse(el.textContent) as ExpressionPageData) : null
    } catch {
      page = null
    }
  }
  return page && page.kind === kind && page.id === id ? page : null
}
