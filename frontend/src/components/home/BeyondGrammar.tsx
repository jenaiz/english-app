import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, RefreshCw } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { pagePath } from '../../lib/expressionPages'
import { loadExpressions } from '../../lib/expressionsCatalog'
import { todaySelection } from '../../lib/todayPicks'
import { useLearnerLevel } from '../../lib/useLearnerLevel'
import { useSavedExpressions } from '../../lib/useSavedExpressions'
import type { ExpressionsCatalog } from '../../types'
import SpeakButton from '../SpeakButton'

interface HomeIdiom {
  id?: string
  idiom: string
  meaning: string
  /** English definition, under the Spanish meaning. */
  definition?: string
  example: string
}

// Shown until the catalog loads (and if it can't).
const FALLBACK_IDIOMS: HomeIdiom[] = [
  { idiom: 'break the ice', meaning: 'Romper el hielo: empezar a hablar para quitar la tensión.', example: 'He told a joke to break the ice.' },
  { idiom: 'a piece of cake', meaning: 'Pan comido: algo muy fácil.', example: "The exam was a piece of cake." },
  { idiom: 'call it a day', meaning: 'Dar algo por terminado por hoy.', example: "We're tired, let's call it a day." },
]

/** The idioms of today's selection in Expresiones, the same the visitor will find there. */
function useTodayIdioms(): HomeIdiom[] | null {
  const { user } = useAuth()
  const learnerLevel = useLearnerLevel(!!user)
  const { addedBeforeToday } = useSavedExpressions(!!user)
  const [catalog, setCatalog] = useState<ExpressionsCatalog | null>(null)
  useEffect(() => {
    loadExpressions()
      .then(setCatalog)
      .catch(() => {})
  }, [])
  if (!catalog || learnerLevel === undefined) return null
  const idioms = todaySelection(catalog, learnerLevel, user?.id, addedBeforeToday).picks.filter((p) => p.kind === 'idiom')
  if (idioms.length === 0) return null
  return idioms.map((p) => ({ id: p.id, idiom: p.term, meaning: capitalize(p.translation), definition: p.definition, example: p.example }))
}

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

const PARTICLES = [
  { particle: 'up', meaning: 'buscar (en un diccionario, en internet)', example: 'Look it up online.' },
  { particle: 'after', meaning: 'cuidar de alguien', example: 'Can you look after my dog?' },
  { particle: 'forward to', meaning: 'tener ganas de algo', example: "I'm looking forward to the trip." },
  { particle: 'into', meaning: 'investigar, estudiar un asunto', example: "We'll look into the problem." },
]

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

      <Link
        to="/expresiones"
        className="mt-8 inline-flex items-center gap-2 rounded-full bg-indigo-50 px-5 py-2.5 font-semibold text-indigo-700 transition hover:bg-indigo-100"
      >
        Ver las expresiones de hoy <ArrowRight className="h-4 w-4" />
      </Link>
    </section>
  )
}

function IdiomCard() {
  const today = useTodayIdioms()
  const items = today ?? FALLBACK_IDIOMS
  const [index, setIndex] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const item = items[index % items.length]

  return (
    <div className="relative flex flex-col lg:col-span-5 lg:row-span-2">
      <button
        type="button"
        onClick={() => {
          setFlipped(false)
          setIndex((i) => (i + 1) % items.length)
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
              <span className="block text-lg font-semibold">{today ? 'Idioms de hoy' : 'Idioms'}</span>
              <span className="text-sm text-indigo-200">¿Qué significa?</span>
            </span>
            <p className="font-display text-5xl font-extrabold leading-none tracking-tight md:text-6xl">{item.idiom}</p>
            <span className="text-sm text-indigo-200 group-hover:text-white">Toca la tarjeta para darle la vuelta</span>
          </div>
          <div aria-hidden={!flipped} className="absolute inset-0 flex flex-col justify-between rounded-3xl border-2 border-indigo-600 bg-white p-8 rotate-y-180 backface-hidden">
            <span>
              <span className="block text-lg font-semibold text-slate-900">{today ? 'Idioms de hoy' : 'Idioms'}</span>
              <span className="font-display text-xl font-bold text-indigo-600">{item.idiom}</span>
            </span>
            <div>
              <p className="text-2xl font-semibold leading-snug text-slate-900">{item.meaning}</p>
              {item.definition && <p className="mt-2 text-slate-600">{item.definition}</p>}
            </div>
            <div>
              <div className="flex items-center justify-between gap-3">
                <p className="italic text-slate-600">“{item.example}”</p>
                <SpeakButton text={item.example} />
              </div>
              {item.id && (
                <Link
                  to={pagePath('idiom', item.id)}
                  onClick={(e) => e.stopPropagation()}
                  tabIndex={flipped ? 0 : -1}
                  className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-indigo-600 hover:text-indigo-800"
                >
                  Ver la ficha completa <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              )}
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
