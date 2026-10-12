import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, ArrowRight, Loader2 } from 'lucide-react'
import { buildIndex, indexMeta, indexPath, initialIndexData, type ExpressionIndexData, type PageKind } from '../lib/expressionPages'
import { loadExpressions } from '../lib/expressionsCatalog'
import { usePageMeta } from '../lib/usePageMeta'
import ErrorState from '../components/ui/ErrorState'
import PageShell from '../components/ui/PageShell'

const COPY: Record<PageKind, { title: string; intro: string; jump: string; other: string }> = {
  idiom: {
    title: 'Idioms en inglés',
    intro:
      'Expresiones que no se entienden palabra por palabra, como «break the ice» o «a piece of cake». Las tienes ordenadas por nivel, con lo que se dice en español. Entra en cada una para ver ejemplos con audio y cuándo se usa.',
    jump: 'Ir al nivel',
    other: 'Ver la lista de phrasal verbs',
  },
  phrasal: {
    title: 'Phrasal verbs en inglés',
    intro:
      'Verbo más partícula, como «give up» o «look after», y el significado cambia. Están agrupados por verbo para que veas la familia entera de un vistazo. Entra en cada uno para ver un ejemplo con audio y si se puede separar.',
    jump: 'Ir al verbo',
    other: 'Ver la lista de idioms',
  },
}

/** Public list of every idiom or every phrasal verb, linking to their pages. Prerendered for search engines. */
export default function ExpressionIndexPage({ kind }: { kind: PageKind }) {
  const [data, setData] = useState<ExpressionIndexData | null>(() => initialIndexData(kind))
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    if (data?.kind === kind) return
    setData(null)
    setFailed(false)
    loadExpressions()
      .then((catalog) => setData(buildIndex(catalog, kind)))
      .catch(() => setFailed(true))
  }, [kind, data])

  usePageMeta(data?.kind === kind ? indexMeta(data) : null)

  if (failed) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10">
        <ErrorState />
      </div>
    )
  }
  if (!data || data.kind !== kind) {
    return (
      <div className="flex justify-center py-24 text-indigo-500">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  const copy = COPY[kind]
  const other: PageKind = kind === 'idiom' ? 'phrasal' : 'idiom'

  return (
    <PageShell width="medium" as="article">
      <nav aria-label="Migas de pan" className="text-sm font-medium text-slate-500">
        <Link to="/expresiones" className="inline-flex items-center gap-1.5 hover:text-slate-800">
          <ArrowLeft className="h-4 w-4" /> Expresiones
        </Link>
      </nav>

      <header className="mt-6 max-w-3xl">
        <h1 className="h-page">{copy.title}</h1>
        <p className="mt-2 text-lg font-semibold text-indigo-600">
          {data.total} {kind === 'idiom' ? 'expresiones' : 'phrasal verbs'} con su significado en español
        </p>
        <p className="mt-4 text-slate-700">{copy.intro}</p>
      </header>

      <nav aria-label={copy.jump} className="mt-8 flex flex-wrap gap-2">
        {data.groups.map((g) => (
          <a
            key={g.id}
            href={`#${g.id}`}
            className="rounded-full bg-slate-100 px-3 py-1.5 text-sm font-semibold text-slate-700 transition hover:bg-indigo-100 hover:text-indigo-800"
          >
            {g.title}
          </a>
        ))}
      </nav>

      {data.groups.map((g) => (
        <section key={g.id} id={g.id} className="mt-10 scroll-mt-24">
          <h2 className="h-section">
            {g.title} <span className="text-base font-medium text-slate-400 tabular-nums">· {g.links.length}</span>
          </h2>
          <ul className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {g.links.map((l) => (
              <li key={l.path}>
                <Link to={l.path} className="block h-full rounded-xl bg-white px-4 py-3 shadow-sm ring-1 ring-slate-200 transition hover:ring-indigo-300">
                  <span className="font-display font-bold text-indigo-950">{l.term}</span>
                  <span className="block text-sm text-slate-600">{l.translation}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}

      <section className="mt-14 flex flex-wrap items-center justify-between gap-4 rounded-3xl bg-indigo-950 p-6 text-white">
        <div className="max-w-md">
          <h2 className="font-display text-xl font-bold">Apréndelas sin olvidarlas</h2>
          <p className="mt-1 text-sm text-indigo-200">
            Añade las que quieras a tu repaso y te las preguntaremos con ejercicios cortos justo antes de que se te olviden. Es gratis.
          </p>
        </div>
        <Link
          to={kind === 'idiom' ? '/expresiones' : '/expresiones?tab=phrasal'}
          className="inline-flex items-center gap-1.5 rounded-xl bg-yellow-300 px-4 py-2 font-semibold text-slate-900 transition hover:bg-yellow-200"
        >
          Empezar a practicar <ArrowRight className="h-4 w-4" />
        </Link>
      </section>

      <p className="mt-8">
        <Link to={indexPath(other)} className="inline-flex items-center gap-1.5 font-semibold text-indigo-600 hover:text-indigo-800">
          {copy.other} <ArrowRight className="h-4 w-4" />
        </Link>
      </p>
    </PageShell>
  )
}
