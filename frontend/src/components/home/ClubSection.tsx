import { Gift, Lock } from 'lucide-react'
import { ROOMS } from '../../lib/club'

/** The Club on the landing: what each room holds and how it fills up as you study. */
export default function ClubSection() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-20 md:py-28">
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div className="max-w-2xl">
          <p className="flex items-center gap-2 text-sm font-semibold text-amber-700">
            <Gift className="h-4 w-4" /> El Club
          </p>
          <h2 className="mt-2 font-display text-4xl font-bold leading-tight tracking-tight text-indigo-950 md:text-5xl">
            Cada unidad que terminas abre una sorpresa
          </h2>
          <p className="mt-4 text-lg text-slate-600">
            Canciones, vídeos, lecturas y juegos de tu nivel para usar lo que acabas de aprender. Tu álbum se va completando a medida que
            avanzas.
          </p>
        </div>
      </div>

      <ul className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {ROOMS.map((r, i) => (
          <li key={r.id} className="flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className={`relative grid aspect-video place-items-center bg-gradient-to-br ${r.bg}`}>
              <r.Icon className="h-12 w-12 text-white/90" strokeWidth={1.5} />
              {/* The last one face down: the album is collected, not handed over. */}
              {i === ROOMS.length - 1 && (
                <span className="absolute inset-0 grid place-items-center bg-slate-900/40">
                  <span className="grid h-11 w-11 place-items-center rounded-full bg-white text-slate-500 shadow-sm">
                    <Lock className="h-5 w-5" />
                  </span>
                </span>
              )}
            </div>
            <div className="flex flex-1 flex-col p-5">
              <h3 className={`flex items-center gap-1.5 text-sm font-semibold tracking-wide uppercase ${r.accent}`}>
                <r.Icon className="h-4 w-4" /> {r.label}
              </h3>
              <p className="mt-2 text-slate-700">{r.intro}</p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}
