// Server entry for the build-time prerender (scripts/prerender.mjs): renders the app to HTML in Node.
import { StrictMode } from 'react'
import { renderToString } from 'react-dom/server'
import { StaticRouter } from 'react-router-dom/server'
import App from './App'
import { primePageData, type ExpressionPageData } from './lib/expressionPages'
import type { ExpressionsCatalog, Idiom, Pack, Particle, PhrasalFamily } from './types'

export { allPages, buildPage, PAGE_DATA_ID, pageMeta, pagePath } from './lib/expressionPages'
export { SITE } from './lib/site'

/** The app's markup at url, with the expression page's data ready so it renders without fetching. */
export function render(url: string, page: ExpressionPageData | null): string {
  primePageData(page)
  try {
    return renderToString(
      <StrictMode>
        <StaticRouter location={url}>
          <App />
        </StaticRouter>
      </StrictMode>,
    )
  } finally {
    primePageData(null)
  }
}

interface ContentFiles {
  idioms: Idiom[]
  phrasal_verbs: PhrasalFamily[]
  particles: Particle[]
  packs: Pack[]
}

const slug = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

/** The catalog as GET /api/expressions returns it, built from the content files (backend/data/expressions). */
export function catalogFromFiles(files: ContentFiles): ExpressionsCatalog {
  // Only what the pages use; the rest of the catalog stays empty.
  return {
    idioms: files.idioms,
    // Like the backend, phrasal verb ids are derived from root and particle.
    phrasal_verbs: files.phrasal_verbs.map((f) => ({ ...f, items: f.items.map((v) => ({ ...v, id: slug(`${f.root} ${v.particle}`) })) })),
    particles: files.particles,
    packs: files.packs,
    hacks: [],
    unit_expressions: {},
    irregular_verbs: [],
  } as ExpressionsCatalog
}
