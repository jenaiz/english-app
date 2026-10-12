import { Fragment, useEffect, useMemo, useRef, useState } from 'react'
import { BookOpen, ListChecks, Volume2, X } from 'lucide-react'
import { canSpeak, speak, stopSpeaking } from '../../lib/speech'
import type { ExerciseResult, ReadingContent } from '../../types'
import SpeakButton from '../SpeakButton'
import MultipleChoice from '../exercises/MultipleChoice'

interface Props {
  content: ReadingContent
  onFinish: (r: ExerciseResult) => void
}

/** Escapes a glossary entry for use in a RegExp. */
const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/**
 * A long reading in reader mode: glossary words are underlined and show their meaning when
 * tapped, and a comprehension test follows the text (which stays above, to look things up).
 */
export default function ReadingPlayer({ content, onFinish }: Props) {
  const [testing, setTesting] = useState(false)
  const [progress, setProgress] = useState(0)
  const [term, setTerm] = useState<string | null>(null)
  const articleRef = useRef<HTMLElement>(null)
  const testRef = useRef<HTMLElement>(null)

  const lookup = useMemo(() => {
    const m = new Map<string, string>()
    for (const [k, v] of Object.entries(content.glossary ?? {})) m.set(k.toLowerCase(), v)
    return m
  }, [content.glossary])
  // Longest entries first, so "look forward to" wins over "look".
  const pattern = useMemo(() => {
    const keys = [...lookup.keys()].sort((a, b) => b.length - a.length)
    return keys.length ? new RegExp(`\\b(${keys.map(escape).join('|')})\\b`, 'gi') : null
  }, [lookup])

  // How far through the text the reader is, for the bar at the top.
  useEffect(() => {
    const onScroll = () => {
      const el = articleRef.current
      if (!el) return
      const r = el.getBoundingClientRect()
      const read = Math.min(1, Math.max(0, (window.innerHeight - r.top) / r.height))
      setProgress(read)
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
      stopSpeaking()
    }
  }, [])

  useEffect(() => {
    if (testing) testRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [testing])

  const words = content.paragraphs.reduce((n, p) => n + p.split(/\s+/).length, 0)

  const renderText = (text: string, pi: number) => {
    if (!pattern) return text
    return text.split(pattern).map((part, i) => {
      const meaning = i % 2 === 1 ? lookup.get(part.toLowerCase()) : undefined
      if (!meaning) return <Fragment key={`${pi}-${i}`}>{part}</Fragment>
      const active = term === `${pi}-${i}`
      return (
        <span key={`${pi}-${i}`} className="relative inline-block">
          <button
            type="button"
            onClick={() => setTerm(active ? null : `${pi}-${i}`)}
            className={`cursor-help rounded-sm underline decoration-emerald-400 decoration-dotted decoration-2 underline-offset-4 transition ${active ? 'bg-emerald-100' : 'hover:bg-emerald-50'}`}
            aria-expanded={active}
          >
            {part}
          </button>
          {active && (
            <span
              role="tooltip"
              className="absolute bottom-full left-1/2 z-10 mb-2 flex w-max max-w-[16rem] -translate-x-1/2 items-center gap-2 rounded-xl bg-slate-900 py-2 pr-2 pl-3 font-sans text-sm leading-snug text-white shadow-xl"
            >
              <span>{meaning}</span>
              <SpeakButton text={part} dark />
              <button type="button" onClick={() => setTerm(null)} aria-label="Cerrar" className="rounded-full p-1 text-white/60 hover:text-white">
                <X className="h-3.5 w-3.5" />
              </button>
            </span>
          )}
        </span>
      )
    })
  }

  return (
    <div>
      <div className="fixed top-16 right-0 left-0 z-10 h-1 bg-transparent" aria-hidden>
        <div className="h-full bg-emerald-500 transition-[width] duration-150" style={{ width: `${progress * 100}%` }} />
      </div>

      <article ref={articleRef} className="mx-auto max-w-2xl rounded-3xl border border-slate-200 bg-white px-5 py-8 shadow-sm md:px-12 md:py-12">
        <div className="mb-6 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-slate-500">
          {content.kind && (
            <span className="flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 font-semibold text-emerald-700">
              <BookOpen className="h-4 w-4" /> {content.kind}
            </span>
          )}
          <span>{words} palabras</span>
          {pattern && <span>Toca las palabras subrayadas para ver qué significan</span>}
        </div>
        <div className="space-y-5 font-serif text-lg leading-relaxed text-slate-800 md:text-xl md:leading-relaxed">
          {content.paragraphs.map((p, i) => (
            <div key={i} className="group relative">
              <p>{renderText(p, i)}</p>
              {canSpeak && (
                <button
                  type="button"
                  onClick={() => speak(p, 0.9)}
                  aria-label="Escuchar este párrafo"
                  className="absolute top-1 -left-10 hidden rounded-full p-1.5 text-slate-300 opacity-0 transition group-hover:opacity-100 hover:bg-slate-100 hover:text-slate-600 focus:opacity-100 md:block"
                >
                  <Volume2 className="h-4 w-4" />
                </button>
              )}
            </div>
          ))}
        </div>
        {content.source && <p className="mt-8 text-sm text-slate-400">{content.source}</p>}

        {!testing && (
          <div className="mt-10 flex justify-center">
            <button
              type="button"
              onClick={() => setTesting(true)}
              className="flex items-center gap-2 rounded-xl bg-emerald-600 px-6 py-3 font-semibold text-white shadow-sm transition hover:bg-emerald-700"
            >
              <ListChecks className="h-5 w-5" /> He terminado: hacer el test
            </button>
          </div>
        )}
      </article>

      {testing && (
        <section ref={testRef} className="mx-auto mt-6 max-w-2xl scroll-mt-24 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm md:p-8">
          <h2 className="mb-4 flex items-center gap-2 font-display text-xl font-bold text-slate-900">
            <ListChecks className="h-5 w-5 text-emerald-600" /> ¿Lo has entendido?
          </h2>
          <MultipleChoice
            content={{ instructions: 'Puedes volver a mirar el texto si lo necesitas.', items: content.questions }}
            onComplete={onFinish}
          />
        </section>
      )}
    </div>
  )
}
