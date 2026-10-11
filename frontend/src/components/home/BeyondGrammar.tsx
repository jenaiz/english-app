import { useState } from 'react'
import { RefreshCw, Volume2 } from 'lucide-react'
import { canSpeak, speak } from '../../lib/speech'

const IDIOMS = [
  { idiom: 'break the ice', meaning: 'Romper el hielo: empezar a hablar para quitar la tensión.', example: 'He told a joke to break the ice.' },
  { idiom: 'a piece of cake', meaning: 'Pan comido: algo muy fácil.', example: "The exam was a piece of cake." },
  { idiom: 'call it a day', meaning: 'Dar algo por terminado por hoy.', example: "We're tired, let's call it a day." },
]

const PARTICLES = [
  { particle: 'up', meaning: 'buscar (en un diccionario, en internet)', example: 'Look it up online.' },
  { particle: 'after', meaning: 'cuidar de alguien', example: 'Can you look after my dog?' },
  { particle: 'forward to', meaning: 'tener ganas de algo', example: "I'm looking forward to the trip." },
  { particle: 'into', meaning: 'investigar, estudiar un asunto', example: "We'll look into the problem." },
]

function SpeakButton({ text, dark }: { text: string; dark?: boolean }) {
  if (!canSpeak) return null
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation()
        speak(text)
      }}
      aria-label={`Escuchar: ${text}`}
      className={`grid h-9 w-9 shrink-0 place-items-center rounded-full transition ${
        dark ? 'bg-white/15 text-white hover:bg-white/25' : 'bg-slate-900/5 text-slate-700 hover:bg-slate-900/10'
      }`}
    >
      <Volume2 className="h-4 w-4" />
    </button>
  )
}

export default function BeyondGrammar() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-20 md:py-28">
      <h2 className="max-w-3xl font-display text-4xl font-bold leading-tight tracking-tight text-indigo-950 md:text-5xl">
        El inglés que no viene en los libros
      </h2>
      <p className="mt-4 max-w-2xl text-lg text-slate-600">
        Idioms, phrasal verbs y trucos de gramática funcional: lo que dicen los nativos a diario y casi nadie te explica.
      </p>

      <div className="mt-12 grid gap-5 lg:grid-cols-12">
        <IdiomCard />
        <PhrasalVerbs />
        <EnglishHack />
      </div>
    </section>
  )
}

function IdiomCard() {
  const [index, setIndex] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const item = IDIOMS[index]

  return (
    <div className="relative flex flex-col lg:col-span-5 lg:row-span-2">
      <button
        type="button"
        onClick={() => {
          setFlipped(false)
          setIndex((i) => (i + 1) % IDIOMS.length)
        }}
        className={`absolute right-6 top-6 z-10 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition ${
          flipped ? 'text-indigo-600 hover:bg-indigo-50' : 'text-white hover:bg-white/15'
        }`}
      >
        <RefreshCw className="h-4 w-4" /> Otro
      </button>
      {/* A div, not a button: the back face holds its own audio button. */}
      <div
        role="button"
        tabIndex={0}
        onClick={() => setFlipped((f) => !f)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            setFlipped((f) => !f)
          }
        }}
        aria-pressed={flipped}
        className="group min-h-80 flex-1 cursor-pointer rounded-3xl text-left perspective-[1200px] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-indigo-200"
      >
        <div
          className={`relative h-full min-h-80 rounded-3xl transition-transform duration-500 transform-3d ${flipped ? 'rotate-y-180' : ''}`}
        >
          <div aria-hidden={flipped} className="absolute inset-0 flex flex-col justify-between rounded-3xl bg-indigo-600 p-8 text-white backface-hidden">
            <span>
              <span className="block text-lg font-semibold">Idioms</span>
              <span className="text-sm text-indigo-200">¿Qué significa?</span>
            </span>
            <p className="font-display text-5xl font-extrabold leading-none tracking-tight md:text-6xl">{item.idiom}</p>
            <span className="text-sm text-indigo-200 group-hover:text-white">Toca la tarjeta para darle la vuelta</span>
          </div>
          <div aria-hidden={!flipped} className="absolute inset-0 flex flex-col justify-between rounded-3xl border-2 border-indigo-600 bg-white p-8 rotate-y-180 backface-hidden">
            <span>
              <span className="block text-lg font-semibold text-slate-900">Idioms</span>
              <span className="font-display text-xl font-bold text-indigo-600">{item.idiom}</span>
            </span>
            <p className="text-2xl font-semibold leading-snug text-slate-900">{item.meaning}</p>
            <div className="flex items-center justify-between gap-3">
              <p className="italic text-slate-600">“{item.example}”</p>
              <SpeakButton text={item.example} />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function PhrasalVerbs() {
  const [selected, setSelected] = useState(0)
  const item = PARTICLES[selected]

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-8 lg:col-span-7">
      <h3 className="text-lg font-semibold text-slate-900">Phrasal verbs</h3>
      <p className="mt-1 text-sm text-slate-500">Un verbo, muchas partículas, significados que no se adivinan.</p>
      <div className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-3">
        <span className="font-display text-6xl font-extrabold tracking-tight text-indigo-950">look</span>
        <div className="flex flex-wrap gap-2" role="tablist" aria-label="Partículas">
          {PARTICLES.map((p, i) => (
            <button
              key={p.particle}
              type="button"
              role="tab"
              aria-selected={i === selected}
              onClick={() => setSelected(i)}
              className={`rounded-full px-4 py-2 font-semibold transition ${
                i === selected ? 'bg-indigo-600 text-white' : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100'
              }`}
            >
              {p.particle}
            </button>
          ))}
        </div>
      </div>
      <div className="mt-6 flex items-end justify-between gap-4 border-t border-slate-100 pt-5">
        <div>
          <p className="text-xl font-semibold text-slate-900">
            look {item.particle}: <span className="font-normal">{item.meaning}</span>
          </p>
          <p className="mt-1 italic text-slate-600">“{item.example}”</p>
        </div>
        <SpeakButton text={item.example} />
      </div>
    </div>
  )
}

function EnglishHack() {
  return (
    <div className="relative rounded-3xl bg-yellow-300 p-8 text-slate-900 lg:col-span-7">
      <h3 className="text-lg font-semibold">English hacks</h3>
      <p className="mt-4 font-display text-3xl font-bold leading-tight">
        Para decir lo que prefieres, usa <span className="whitespace-nowrap">I'd rather</span> + verbo sin <em>to</em>.
      </p>
      <p className="mt-2 text-slate-800">Suena mucho más natural que «I prefer to…» y te sirve para casi todo.</p>
      <ul className="mt-5 space-y-2">
        {["I'd rather walk.", "I'd rather not say.", "I'd rather stay in tonight."].map((s) => (
          <li key={s} className="flex items-center justify-between gap-3 rounded-xl bg-white/60 px-4 py-2.5 font-medium">
            {s}
            <SpeakButton text={s} />
          </li>
        ))}
      </ul>
    </div>
  )
}
