import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Check, RotateCcw } from 'lucide-react'

const OPTIONS = [
  { word: 'Memorize', hint: 'Memorizar ayuda, pero se olvida rápido. Prueba otra.' },
  { word: 'Use', hint: '' },
  { word: 'Translate', hint: 'Traducir es el primer paso, no el último. Prueba otra.' },
]
const ANSWER = 'Use'

interface Props {
  cta: { to: string; label: string }
  showLogin: boolean
}

/** The headline is a fill-in-the-blank exercise: the visitor solves it to read it. */
export default function HeroExercise({ cta, showLogin }: Props) {
  const [picked, setPicked] = useState<string | null>(null)
  const [wrong, setWrong] = useState<string[]>([])
  const solved = picked === ANSWER
  const hint = picked && !solved ? OPTIONS.find((o) => o.word === picked)?.hint : ''

  const choose = (word: string) => {
    if (solved) return
    setPicked(word)
    if (word !== ANSWER) setWrong((w) => (w.includes(word) ? w : [...w, word]))
  }

  return (
    <section className="relative overflow-hidden bg-slate-50">
      {/* Exercise-book ruling behind the headline. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-60 [background-image:repeating-linear-gradient(to_bottom,transparent_0,transparent_47px,#e0e7ff_47px,#e0e7ff_48px)] [mask-image:linear-gradient(to_bottom,black,transparent_85%)]"
      />
      <div aria-hidden className="pointer-events-none absolute inset-y-0 left-[max(1rem,calc(50%-36rem))] hidden w-px bg-rose-200/70 sm:block" />

      <div className="relative mx-auto max-w-6xl px-4 pb-20 pt-14 sm:pl-10 md:pb-28 md:pt-20">
        <div className="flex items-center gap-3 text-sm font-medium text-slate-500">
          <span>Tu primer ejercicio</span>
          <span className="h-1.5 w-24 overflow-hidden rounded-full bg-slate-200">
            <span className={`block h-full rounded-full bg-emerald-500 transition-all duration-700 ${solved ? 'w-full' : 'w-0'}`} />
          </span>
        </div>

        <h1 className="mt-6 font-display text-[clamp(2.75rem,9vw,6.5rem)] font-extrabold leading-[0.95] tracking-tight text-indigo-950">
          <span className="block">Don't just study English.</span>
          <span className="mt-2 flex flex-wrap items-baseline gap-x-[0.25em]">
            <span
              aria-live="polite"
              className={`relative inline-block min-w-[3.2ch] border-b-[0.09em] px-[0.08em] text-center leading-[0.82] transition-colors duration-500 ${
                solved ? 'border-emerald-500 text-emerald-600' : 'border-indigo-300'
              }`}
            >
              {solved ? (
                <span className="inline-block animate-[fill-in_500ms_cubic-bezier(.2,.9,.3,1.3)]">{ANSWER}</span>
              ) : (
                <span className="sr-only">hueco</span>
              )}
            </span>
            <span>it.</span>
            {solved && <Check className="h-[0.6em] w-[0.6em] self-center text-emerald-500" strokeWidth={3} aria-label="Correcto" />}
          </span>
        </h1>

        <div className="mt-8 min-h-[7.5rem]">
          {!solved ? (
            <>
              <p className="text-slate-600">Completa la frase:</p>
              <div className="mt-3 flex flex-wrap gap-3">
                {OPTIONS.map(({ word }) => {
                  const isWrong = wrong.includes(word)
                  return (
                    <button
                      key={word}
                      type="button"
                      onClick={() => choose(word)}
                      disabled={isWrong}
                      className={`rounded-xl border-2 px-5 py-2.5 text-lg font-semibold transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-indigo-200 ${
                        isWrong
                          ? 'animate-[shake_300ms] border-red-200 bg-red-50 text-red-400 line-through'
                          : 'border-indigo-200 bg-white text-indigo-700 shadow-sm hover:-translate-y-0.5 hover:border-indigo-400'
                      }`}
                    >
                      {word}
                    </button>
                  )
                })}
              </div>
              {hint && <p className="mt-3 text-sm text-red-600">{hint}</p>}
            </>
          ) : (
            <div className="max-w-2xl">
              <p className="text-lg text-slate-700">
                <strong className="text-emerald-700">Exacto.</strong> Así aprendes en Fluently: escuchas una situación
                real, deduces la regla y la practicas con ejercicios como este hasta que te sale sola.
              </p>
              <button
                type="button"
                onClick={() => {
                  setPicked(null)
                  setWrong([])
                }}
                className="mt-2 inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-700"
              >
                <RotateCcw className="h-3.5 w-3.5" /> Repetir
              </button>
            </div>
          )}
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <Link
            to={cta.to}
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-6 py-3.5 font-semibold text-white shadow-lg shadow-indigo-600/20 transition hover:bg-indigo-700"
          >
            {cta.label} <ArrowRight className="h-5 w-5" />
          </Link>
          {showLogin && (
            <Link to="/login" className="rounded-xl px-5 py-3.5 font-semibold text-indigo-700 transition hover:bg-indigo-50">
              Ya tengo cuenta
            </Link>
          )}
          <span className="text-sm text-slate-500">Gratis, del A1 al C1</span>
        </div>
      </div>
    </section>
  )
}
