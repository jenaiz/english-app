import type { CSSProperties } from 'react'
import { colorOf } from '../../lib/levels'

const LEVELS = [
  { id: 'A1', name: 'Beginner', can: 'Presentarte y hablar de ti' },
  { id: 'A2', name: 'Elementary', can: 'Comprar, pedir y quedar con gente' },
  { id: 'B1', name: 'Intermediate', can: 'Viajar y resolver imprevistos' },
  { id: 'B2', name: 'Upper Intermediate', can: 'Dar tu opinión y argumentar' },
  { id: 'C1', name: 'Advanced', can: 'Matizar y sonar natural' },
]

export default function LevelPath() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-20 md:py-28">
      <h2 className="font-display text-4xl font-bold leading-tight tracking-tight text-indigo-950 md:text-5xl">
        Del A1 al C1, siguiendo el marco europeo
      </h2>
      <p className="mt-4 max-w-2xl text-lg text-slate-600">
        Empieza por tu nivel. Cada uno tiene sus unidades temáticas y te deja hacer algo nuevo en inglés.
      </p>
      <ol className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-5 lg:items-end">
        {LEVELS.map((l, i) => {
          const c = colorOf(l.id)
          return (
            <li key={l.id} className="relative">
              {/* On wide screens the cards rise like steps, one per level. */}
              <div
                className={`flex h-full flex-col rounded-2xl p-5 lg:h-[var(--step)] ${c.soft}`}
                style={{ '--step': `${11 + i * 2.5}rem` } as CSSProperties}
              >
                <span className={`font-display text-5xl font-extrabold ${c.text}`}>{l.id}</span>
                <span className="mt-1 text-sm font-medium text-slate-500">{l.name}</span>
                <p className="mt-auto pt-4 font-semibold text-slate-800">{l.can}</p>
              </div>
            </li>
          )
        })}
      </ol>
    </section>
  )
}
