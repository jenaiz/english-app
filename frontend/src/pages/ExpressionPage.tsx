import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { AlertCircle, ArrowLeft, ArrowRight, Layers, Loader2 } from 'lucide-react'
import AddToReview from '../components/expressions/AddToReview'
import SpeakButton from '../components/SpeakButton'
import { useAuth } from '../context/AuthContext'
import { buildPage, initialPageData, kindFromSegment, pageMeta, type ExpressionPageData, type PageLink } from '../lib/expressionPages'
import { loadExpressions } from '../lib/expressionsCatalog'
import { useSavedExpressions } from '../lib/useSavedExpressions'
import NotFound from './NotFound'

/** Public page of one idiom or phrasal verb. Prerendered at build time for search engines. */
export default function ExpressionPage() {
  const { segment, id } = useParams()
  const kind = kindFromSegment(segment)
  const [page, setPage] = useState<ExpressionPageData | null>(() => initialPageData(kind, id))
  const [state, setState] = useState<'ready' | 'loading' | 'missing' | 'error'>(page ? 'ready' : 'loading')
  const { user } = useAuth()
  const { statusOf, add } = useSavedExpressions(!!user)

  useEffect(() => {
    if (page?.kind === kind && page.id === id) return
    if (!kind || !id) {
      setState('missing')
      return
    }
    setState('loading')
    loadExpressions()
      .then((catalog) => {
        const p = buildPage(catalog, kind, id)
        setPage(p)
        setState(p ? 'ready' : 'missing')
      })
      .catch(() => setState('error'))
  }, [kind, id, page])

  useEffect(() => {
    if (!page) return
    const meta = pageMeta(page)
    document.title = meta.title
    document.querySelector('meta[name="description"]')?.setAttribute('content', meta.description)
    window.scrollTo(0, 0)
  }, [page])

  if (state === 'missing') return <NotFound />
  if (state === 'error') {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10">
        <p className="flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          <AlertCircle className="h-4 w-4" /> No se ha podido cargar la expresión.
        </p>
      </div>
    )
  }
  if (!page || state === 'loading') {
    return (
      <div className="flex justify-center py-24 text-indigo-500">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  const isIdiom = page.kind === 'idiom'
  const translation = isIdiom ? page.idiom.equivalent_es : page.verb.translation
  const definition = isIdiom ? page.idiom.definition : page.verb.meaning
  const examples = isIdiom ? page.idiom.examples : [page.verb.example]

  return (
    <article className="mx-auto max-w-3xl px-4 py-10 md:py-14">
      <nav aria-label="Migas de pan" className="flex items-center gap-1.5 text-sm font-medium text-slate-500">
        <Link to="/expresiones" className="inline-flex items-center gap-1.5 hover:text-slate-800">
          <ArrowLeft className="h-4 w-4" /> Expresiones
        </Link>
        <span aria-hidden="true">·</span>
        <Link to={isIdiom ? '/expresiones' : '/expresiones?tab=phrasal'} className="hover:text-slate-800">
          {isIdiom ? 'Idioms' : 'Phrasal verbs'}
        </Link>
      </nav>

      <header className="mt-6">
        <div className="flex flex-wrap gap-2 text-xs font-semibold">
          <span className="rounded-full bg-yellow-300 px-2.5 py-1 text-slate-900">{page.level}</span>
          <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-indigo-700">{isIdiom ? 'Idiom' : 'Phrasal verb'}</span>
          {isIdiom && <span className="rounded-full bg-slate-100 px-2.5 py-1 text-slate-700">{page.idiom.topic}</span>}
          {isIdiom && <span className="rounded-full bg-slate-100 px-2.5 py-1 text-slate-700">{page.idiom.register}</span>}
        </div>
        <div className="mt-4 flex items-center gap-3">
          <h1 className="font-display text-5xl leading-none font-extrabold tracking-tight text-indigo-950 md:text-6xl">{page.term}</h1>
          <SpeakButton text={page.term} />
        </div>
        <p className="mt-5 text-xl text-slate-700">
          Significa <strong className="text-slate-900">«{translation}»</strong>.
        </p>
        {isIdiom && page.idiom.literal_es && (
          <p className="mt-1 text-slate-500">Literalmente sería «{page.idiom.literal_es}», pero no se traduce palabra por palabra.</p>
        )}
      </header>

      <section className="mt-8 rounded-3xl bg-indigo-50 p-6">
        <h2 className="text-sm font-semibold tracking-wide text-indigo-600 uppercase">Definición en inglés</h2>
        <p className="mt-2 text-lg leading-snug font-semibold text-slate-900">{definition}</p>
      </section>

      <section className="mt-8">
        <h2 className="font-display text-2xl font-bold text-indigo-950">{examples.length > 1 ? 'Ejemplos' : 'Ejemplo'}</h2>
        <ul className="mt-3 space-y-2">
          {examples.map((ex) => (
            <li key={ex} className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 px-4 py-3 text-slate-700 italic">
              “{ex}”
              <SpeakButton text={ex} />
            </li>
          ))}
        </ul>
      </section>

      {isIdiom && (page.idiom.situation || page.idiom.note) && (
        <section className="mt-8">
          <h2 className="font-display text-2xl font-bold text-indigo-950">Cuándo se usa</h2>
          {page.idiom.situation && <p className="mt-2 text-slate-700">{page.idiom.situation}</p>}
          {page.idiom.note && <p className="mt-2 text-slate-600">{page.idiom.note}</p>}
        </section>
      )}

      {!isIdiom && (
        <section className="mt-8 space-y-4">
          <div>
            <h2 className="font-display text-2xl font-bold text-indigo-950">Cómo se usa</h2>
            <p className="mt-2 text-slate-700">
              {page.verb.separable ? (
                <>
                  Es <strong>separable</strong>: el objeto puede ir en medio, «{page.root} it {page.verb.particle}», y tiene que ir en medio
                  cuando es un pronombre.
                </>
              ) : (
                <>
                  <strong>No se separa</strong>: el objeto va siempre detrás, «{page.term} something».
                </>
              )}
            </p>
          </div>
          {page.particle && (
            <div className="rounded-3xl bg-yellow-300 p-6 text-slate-900">
              <p className="font-display text-3xl font-extrabold">{page.particle.particle}</p>
              <p className="mt-2">
                Con esta partícula, el verbo suele significar <strong>{page.particle.idea}</strong>.
              </p>
              {page.particle.note && <p className="mt-1 text-slate-800">{page.particle.note}</p>}
            </div>
          )}
        </section>
      )}

      <section className="mt-10 flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-indigo-100 bg-white p-6 shadow-sm">
        <div className="max-w-md">
          <h2 className="font-display text-xl font-bold text-indigo-950">Que no se te olvide</h2>
          <p className="mt-1 text-sm text-slate-600">
            Añádela a tu repaso y te la preguntaremos con ejercicios cortos justo antes de que la olvides. Es gratis.
          </p>
        </div>
        <AddToReview kind={page.kind} id={page.id} status={statusOf(page.kind, page.id)} onAdd={(k, i) => add(k, i, 'page')} />
      </section>

      {page.packs.length > 0 && (
        <section className="mt-10">
          <h2 className="font-display text-2xl font-bold text-indigo-950">Está en estos packs</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {page.packs.map((p) => (
              <Link
                key={p.id}
                to={`/expresiones/packs/${p.id}`}
                className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-800"
              >
                <Layers className="h-4 w-4" /> {p.title}
              </Link>
            ))}
          </div>
        </section>
      )}

      <RelatedLinks title={isIdiom ? 'Expresiones parecidas' : 'Phrasal verbs parecidos'} links={page.similar} />
      {isIdiom ? (
        <RelatedLinks title={`Más idioms de ${page.idiom.topic}`} links={page.sameTopic} />
      ) : (
        <RelatedLinks title={`Otros phrasal verbs con ${page.root}`} links={page.family} />
      )}

      <p className="mt-12">
        <Link to="/expresiones" className="inline-flex items-center gap-1.5 font-semibold text-indigo-600 hover:text-indigo-800">
          Ver todas las expresiones <ArrowRight className="h-4 w-4" />
        </Link>
      </p>
    </article>
  )
}

function RelatedLinks({ title, links }: { title: string; links: PageLink[] }) {
  if (links.length === 0) return null
  return (
    <section className="mt-10">
      <h2 className="font-display text-2xl font-bold text-indigo-950">{title}</h2>
      <ul className="mt-3 grid gap-3 sm:grid-cols-2">
        {links.map((l) => (
          <li key={l.path}>
            <Link to={l.path} className="block rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200 transition hover:ring-indigo-300">
              <span className="font-display text-lg font-bold text-indigo-950">{l.term}</span>
              <span className="block text-sm text-slate-600">{l.translation}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}
