// Build-time prerender: writes a static HTML page per idiom and phrasal verb into dist/, plus
// sitemap.xml and robots.txt, so search engines can index them. Runs after the client and SSR builds
// (see "build" in package.json). The SPA takes over in the browser as usual.
//
// CONTENT_DIR points to the expression content files (default: the backend's, in this repo).
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const dist = path.join(root, 'dist')
const contentDir = path.resolve(root, process.env.CONTENT_DIR ?? '../backend/data/expressions')

const ssr = await import(path.join(root, 'dist-ssr', 'entry-server.js'))
const { SITE } = ssr

const readJSON = async (name) => JSON.parse(await readFile(path.join(contentDir, name), 'utf8'))
const catalog = ssr.catalogFromFiles({
  idioms: await readJSON('idioms.json'),
  phrasal_verbs: await readJSON('phrasal_verbs.json'),
  particles: await readJSON('particles.json'),
  packs: await readJSON('packs.json'),
})

const template = await readFile(path.join(dist, 'index.html'), 'utf8')
if (!template.includes('<div id="root"></div>') || !/<title>.*<\/title>/.test(template)) {
  throw new Error('dist/index.html: missing <div id="root"></div> or <title>')
}

// index.html carries the home page's link-preview tags; each page writes its own title, description and
// URL instead (X falls back to og:title and og:description). The image tags are the same everywhere and stay.
const PAGE_OG = /\n\s*<meta (property="og:(type|site_name|locale|title|description|url)"|name="twitter:(title|description)") content="[^"]*" \/>/g
const pageTemplate = template.replace(PAGE_OG, '')

const escapeHTML = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
// JSON inside <script>: "<" can't close the tag once escaped.
const scriptJSON = (v) => JSON.stringify(v).replace(/</g, '\\u003c')

function pageHTML(url, data, meta) {
  const head = [
    `<title>${escapeHTML(meta.title)}</title>`,
    `<link rel="canonical" href="${escapeHTML(meta.canonical)}" />`,
    `<meta property="og:type" content="article" />`,
    `<meta property="og:site_name" content="${escapeHTML(SITE.name)}" />`,
    `<meta property="og:locale" content="es_ES" />`,
    `<meta property="og:title" content="${escapeHTML(meta.title)}" />`,
    `<meta property="og:description" content="${escapeHTML(meta.description)}" />`,
    `<meta property="og:url" content="${escapeHTML(meta.canonical)}" />`,
    `<script type="application/ld+json">${scriptJSON(meta.jsonLd)}</script>`,
  ].join('\n    ')
  return pageTemplate
    .replace(/<title>.*<\/title>/, head)
    .replace(/<meta name="description" content="[^"]*"\s*\/?>/, `<meta name="description" content="${escapeHTML(meta.description)}" />`)
    .replace(
      '<div id="root"></div>',
      `<div id="root">${ssr.render(url, data)}</div>\n    <script type="application/json" id="${ssr.PAGE_DATA_ID}">${scriptJSON(data)}</script>`,
    )
}

const pages = ssr.allPages(catalog)
for (const { kind, id } of pages) {
  const url = ssr.pagePath(kind, id)
  const page = ssr.buildPage(catalog, kind, id)
  // A file next to its siblings (break-the-ice.html), not a directory: nginx would redirect a directory
  // to the URL with a trailing slash. nginx.conf serves it with try_files $uri.html.
  const file = path.join(dist, `${url}.html`)
  await mkdir(path.dirname(file), { recursive: true })
  await writeFile(file, pageHTML(url, page, ssr.pageMeta(page)))
}

// The lists of every idiom and every phrasal verb (idioms.html, next to the idioms/ directory).
const indexes = []
for (const kind of ['idiom', 'phrasal']) {
  const url = ssr.indexPath(kind)
  const data = ssr.buildIndex(catalog, kind)
  await writeFile(path.join(dist, `${url}.html`), pageHTML(url, data, ssr.indexMeta(data)))
  indexes.push(url)
}

// Served by nginx with a real 404 status for expression pages that don't exist (see nginx.conf).
// The SPA renders its "not found" page there, so only the markup and the robots tag matter.
await writeFile(
  path.join(dist, '404.html'),
  pageTemplate
    .replace(/<title>.*<\/title>/, `<title>Página no encontrada | ${escapeHTML(SITE.name)}</title>\n    <meta name="robots" content="noindex" />`)
    .replace('<div id="root"></div>', `<div id="root">${ssr.render('/404', null)}</div>`),
)

const urls = ['/', '/expresiones', ...indexes, ...catalog.packs.map((p) => `/expresiones/packs/${p.id}`), ...pages.map((p) => ssr.pagePath(p.kind, p.id))]
await writeFile(
  path.join(dist, 'sitemap.xml'),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls
    .map((u) => `  <url><loc>${escapeHTML(SITE.url + (u === '/' ? '/' : u))}</loc></url>`)
    .join('\n')}\n</urlset>\n`,
)
await writeFile(path.join(dist, 'robots.txt'), `User-agent: *\nDisallow: /api/\n\nSitemap: ${SITE.url}/sitemap.xml\n`)

console.log(`prerender: ${pages.length} expression pages, ${indexes.length} lists, sitemap with ${urls.length} URLs`)
