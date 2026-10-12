import { useEffect, type ReactNode } from 'react'
import { useLocation } from 'react-router-dom'
import { SITE } from '../lib/site'

export interface LegalSection {
  id: string
  title: string
  body: ReactNode
}

interface Props {
  title: string
  intro?: ReactNode
  sections: LegalSection[]
  /** Hide the "Última actualización" line (e.g. on the contact page). */
  hideUpdated?: boolean
}

/** Layout for long-form pages: title, table of contents and readable sections. */
export default function LegalPage({ title, intro, sections, hideUpdated }: Props) {
  const { hash } = useLocation()

  useEffect(() => {
    const previous = document.title
    document.title = `${title} · ${SITE.name}`
    return () => {
      document.title = previous
    }
  }, [title])

  useEffect(() => {
    const target = hash ? document.getElementById(decodeURIComponent(hash.slice(1))) : null
    if (target) target.scrollIntoView()
    else window.scrollTo(0, 0)
  }, [hash])

  return (
    <article className="mx-auto max-w-3xl px-4 py-12 pb-28">
      <h1 className="h-page">{title}</h1>
      {!hideUpdated && <p className="mt-2 text-sm text-slate-500">Última actualización: {SITE.legalUpdated}</p>}
      {intro && <div className="legal-body mt-6">{intro}</div>}

      {sections.length > 2 && (
        <nav aria-label="Índice" className="mt-8 rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-sm font-semibold text-slate-900">Contenido</p>
          <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm">
            {sections.map((s) => (
              <li key={s.id}>
                <a href={`#${s.id}`} className="text-indigo-600 hover:underline">
                  {s.title}
                </a>
              </li>
            ))}
          </ol>
        </nav>
      )}

      {sections.map((s) => (
        <section key={s.id} id={s.id} className="mt-10 scroll-mt-24">
          <h2 className="font-display text-xl font-bold text-slate-900">{s.title}</h2>
          <div className="legal-body mt-3">{s.body}</div>
        </section>
      ))}
    </article>
  )
}
