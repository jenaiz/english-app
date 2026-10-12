import { useState } from 'react'
import GradeButtons, { type PassGrade } from '../review/GradeButtons'
import { buttonClass } from '../ui/Button'

// The same buttons as in Repaso, with the intervals a new card would get.
const INTERVALS: Record<PassGrade, string> = { hard: '1 d', good: '3 d', easy: '7 d' }
const WHEN: Record<PassGrade, string> = { hard: 'mañana', good: 'en 3 días', easy: 'en una semana' }

// Gaps between reviews grow each time you remember a word.
const TIMELINE = [
  { label: 'Hoy', at: 0 },
  { label: 'Mañana', at: 12 },
  { label: '3 días', at: 30 },
  { label: '1 semana', at: 58 },
  { label: '3 semanas', at: 100 },
]

export default function ReviewSection() {
  const [revealed, setRevealed] = useState(false)
  const [graded, setGraded] = useState<PassGrade | null>(null)

  return (
    <section className="overflow-hidden border-y border-slate-200 bg-white">
      <div className="mx-auto grid max-w-6xl items-center gap-14 px-4 py-20 md:grid-cols-2 md:py-28">
        <div>
          <h2 className="font-display text-4xl font-bold leading-tight tracking-tight text-indigo-950 md:text-5xl">
            Repasa justo antes de olvidar
          </h2>
          <p className="mt-4 text-lg text-slate-600">
            Cada palabra que aprendes se convierte en una tarjeta. Fluently te la vuelve a enseñar cuando estás a punto de
            olvidarla, y cada vez la espera es más larga. Unos minutos al día bastan.
          </p>

          <div className="relative mt-10 h-12" aria-label="Los repasos se van espaciando">
            <div className="absolute inset-x-2 top-2 h-0.5 bg-slate-200" />
            {TIMELINE.map(({ label, at }, i) => (
              <div
                key={label}
                className={`absolute top-0 flex flex-col ${i === 0 ? 'items-start' : i === TIMELINE.length - 1 ? 'items-end' : 'items-center'}`}
                style={{ left: `${at}%`, transform: `translateX(-${at}%)` }}
              >
                <span className="h-4 w-4 rounded-full border-4 border-white bg-indigo-600 ring-1 ring-indigo-200" />
                <span className="mt-1.5 whitespace-nowrap text-xs text-slate-500">{label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="relative mx-auto w-full max-w-md">
          <div aria-hidden className="absolute inset-0 translate-x-4 translate-y-4 rotate-3 rounded-3xl bg-indigo-200" />
          <div aria-hidden className="absolute inset-0 translate-x-2 translate-y-2 rotate-1 rounded-3xl bg-indigo-400" />
          <div className="relative rounded-3xl border border-slate-200 bg-white p-8 shadow-xl">
            <p className="text-sm text-slate-500">Tarjeta de repaso</p>
            <p className="mt-6 text-center font-display text-4xl font-extrabold text-indigo-950">look forward to</p>
            <div className="mt-6 min-h-16 text-center">
              {revealed ? (
                <>
                  <p className="text-lg font-semibold text-slate-800">tener ganas de</p>
                  <p className="mt-1 text-sm italic text-slate-500">“I'm looking forward to the weekend.”</p>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => setRevealed(true)}
                  className={buttonClass()}
                >
                  Mostrar respuesta
                </button>
              )}
            </div>
            {revealed && (
              <div className="mt-6">
                <GradeButtons intervals={INTERVALS} onGrade={setGraded} selected={graded} />
              </div>
            )}
            {graded !== null && (
              <p className="mt-3 text-center text-sm text-slate-500">
                La volverás a ver <strong className="text-slate-800">{WHEN[graded]}</strong>.
              </p>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
