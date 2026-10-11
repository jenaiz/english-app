import { useMemo, useState, type ReactNode } from 'react'
import { Check, Mic, Volume2 } from 'lucide-react'
import { PHASES } from '../../lib/phases'
import { canSpeak, speak } from '../../lib/speech'
import type { Phase } from '../../types'

// Phases where the learner does exercises (the rest are reading/listening).
const HANDS_ON: Phase[] = ['discovery', 'practice', 'production', 'review']

const PHASE_TEXT: Record<Phase, string> = {
  context: 'Escuchas o lees una situación real.',
  discovery: 'Deduces la regla antes de que te la cuenten.',
  grammar: 'La regla, clara y en español.',
  practice: 'Huecos, ordenar frases, transformar.',
  production: 'Traduces, escribes al dictado y hablas.',
  vocabulary: 'Las palabras clave, con su audio.',
  review: 'Quiz contrarreloj y tarjetas de repaso.',
}

const MORE_TYPES = ['Opción múltiple', 'Emparejar', 'Transformar frases', 'Traducción', 'Quiz contrarreloj']

export default function MethodSection() {
  return (
    <section className="bg-indigo-950 text-white">
      <div className="mx-auto max-w-6xl px-4 py-20 md:py-28">
        <h2 className="max-w-3xl font-display text-4xl font-bold leading-tight tracking-tight md:text-5xl">
          Siete pasos por lección. En cuatro, practicas tú.
        </h2>
        <p className="mt-4 max-w-2xl text-lg text-indigo-200">
          Nada de leer reglas y pasar página. Cada lección te hace usar lo que aprendes hasta que te sale sin pensar.
        </p>

        <ol className="mt-12 grid gap-px overflow-hidden rounded-2xl bg-indigo-800/60 sm:grid-cols-2 lg:grid-cols-7">
          {PHASES.map(({ id, label, Icon }, i) => {
            const active = HANDS_ON.includes(id)
            return (
              <li key={id} className={`px-5 py-4 lg:p-5 ${active ? 'bg-indigo-600' : 'bg-indigo-900/70'}`}>
                <div className="flex items-center justify-between">
                  <span className={`font-display text-sm font-bold ${active ? 'text-indigo-200' : 'text-indigo-400'}`}>
                    {i + 1}
                  </span>
                  <Icon className={`h-5 w-5 ${active ? 'text-white' : 'text-indigo-400'}`} />
                </div>
                <p className="mt-1 font-semibold lg:mt-6">{label}</p>
                <p className={`mt-1 text-sm leading-snug ${active ? 'text-indigo-100' : 'text-indigo-300'}`}>{PHASE_TEXT[id]}</p>
              </li>
            )
          })}
        </ol>
        <p className="mt-3 flex items-center gap-2 text-sm text-indigo-300">
          <span className="h-3 w-3 rounded-sm bg-indigo-600" /> Pasos con ejercicios
        </p>

        <h3 className="mt-20 font-display text-2xl font-bold">Pruébalos aquí mismo</h3>
        <div className="mt-6 grid gap-5 md:grid-cols-2">
          <FillBlankDemo />
          <WordOrderDemo />
          <DictationDemo />
          <SpeakingDemo />
        </div>
        <div className="mt-6 flex flex-wrap items-center gap-2 text-sm">
          <span className="mr-1 text-indigo-300">Y además:</span>
          {MORE_TYPES.map((t) => (
            <span key={t} className="rounded-full border border-indigo-700 px-3 py-1 text-indigo-100">
              {t}
            </span>
          ))}
        </div>
      </div>
    </section>
  )
}

function Demo({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-2xl bg-white p-6 text-slate-800 shadow-xl shadow-black/20">
      <p className="text-sm font-semibold text-indigo-600">{title}</p>
      <div className="mt-4">{children}</div>
    </div>
  )
}

function FillBlankDemo() {
  const [value, setValue] = useState('')
  const ok = value.trim().toLowerCase() === 'checked'
  return (
    <Demo title="Rellenar huecos">
      <p className="flex flex-wrap items-baseline gap-2 text-xl font-medium">
        We
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          aria-label="Palabra que falta"
          placeholder="…"
          className={`w-28 border-b-2 bg-transparent px-1 text-center outline-none transition ${
            ok ? 'border-emerald-500 text-emerald-700' : 'border-slate-300 focus:border-indigo-500'
          }`}
        />
        in at three.
      </p>
      <p className="mt-3 text-sm text-slate-500">
        {ok ? (
          <span className="inline-flex items-center gap-1 text-emerald-700">
            <Check className="h-4 w-4" /> <em>Check in</em>: registrarse en el hotel.
          </span>
        ) : (
          <>
            Pista: <em>check in</em>, en pasado.
          </>
        )}
      </p>
    </Demo>
  )
}

const ORDER_ANSWER = ["I'm", 'looking', 'forward', 'to', 'it']

function WordOrderDemo() {
  const shuffled = useMemo(() => ['forward', "I'm", 'it', 'looking', 'to'], [])
  const [chosen, setChosen] = useState<number[]>([])
  const sentence = chosen.map((i) => shuffled[i])
  const done = sentence.length === ORDER_ANSWER.length
  const ok = done && sentence.join(' ') === ORDER_ANSWER.join(' ')

  return (
    <Demo title="Ordenar palabras">
      <div
        className={`flex min-h-12 flex-wrap items-center gap-2 rounded-xl border-2 border-dashed px-3 py-2 ${
          ok ? 'border-emerald-400 bg-emerald-50' : done ? 'border-red-300 bg-red-50' : 'border-slate-200'
        }`}
      >
        {sentence.length === 0 && <span className="text-sm text-slate-400">Toca las palabras en orden</span>}
        {chosen.map((i) => (
          <button
            key={i}
            type="button"
            onClick={() => setChosen((c) => c.filter((x) => x !== i))}
            className="rounded-lg bg-indigo-600 px-3 py-1.5 font-medium text-white"
          >
            {shuffled[i]}
          </button>
        ))}
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {shuffled.map((w, i) => (
          <button
            key={w}
            type="button"
            disabled={chosen.includes(i)}
            onClick={() => setChosen((c) => [...c, i])}
            className="rounded-lg border border-slate-300 px-3 py-1.5 font-medium transition hover:border-indigo-400 disabled:opacity-25"
          >
            {w}
          </button>
        ))}
      </div>
      <p className="mt-3 text-sm text-slate-500">
        {ok ? (
          <span className="inline-flex items-center gap-1 text-emerald-700">
            <Check className="h-4 w-4" /> Tengo muchas ganas.
          </span>
        ) : done ? (
          <button type="button" onClick={() => setChosen([])} className="text-red-600 underline">
            Casi. Vuelve a intentarlo
          </button>
        ) : (
          'Significa: «Tengo muchas ganas».'
        )}
      </p>
    </Demo>
  )
}

const DICTATION = 'Could you give me a hand?'

function DictationDemo() {
  const [value, setValue] = useState('')
  const norm = (s: string) => s.toLowerCase().replace(/[^a-z ]/g, '').replace(/\s+/g, ' ').trim()
  const ok = norm(value) === norm(DICTATION)
  return (
    <Demo title="Dictado">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => speak(DICTATION, 0.85)}
          disabled={!canSpeak}
          aria-label="Escuchar la frase"
          className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-indigo-600 text-white transition hover:bg-indigo-700 disabled:opacity-40"
        >
          <Volume2 className="h-5 w-5" />
        </button>
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          aria-label="Escribe lo que oyes"
          placeholder="Escribe lo que oyes"
          className={`w-full rounded-lg border-2 px-3 py-2.5 outline-none transition ${
            ok ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200 focus:border-indigo-500'
          }`}
        />
      </div>
      <p className="mt-3 text-sm text-slate-500">
        {ok ? (
          <span className="inline-flex items-center gap-1 text-emerald-700">
            <Check className="h-4 w-4" /> ¿Me echas una mano?
          </span>
        ) : canSpeak ? (
          'Pulsa el altavoz y escribe la frase.'
        ) : (
          'Tu navegador no puede reproducir audio.'
        )}
      </p>
    </Demo>
  )
}

const SPOKEN = ["I'd", 'rather', 'stay', 'in', 'tonight']

function SpeakingDemo() {
  const [heard, setHeard] = useState(0)
  const listen = () => {
    setHeard(0)
    SPOKEN.forEach((_, i) => setTimeout(() => setHeard(i + 1), 350 * (i + 1)))
  }
  const done = heard === SPOKEN.length
  return (
    <Demo title="Hablar">
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={listen}
          aria-label="Ver un ejemplo de pronunciación"
          className={`relative grid h-12 w-12 shrink-0 place-items-center rounded-full text-white transition ${
            heard > 0 && !done ? 'bg-red-500' : 'bg-indigo-600 hover:bg-indigo-700'
          }`}
        >
          {heard > 0 && !done && <span className="absolute inset-0 animate-ping rounded-full bg-red-400/60" />}
          <Mic className="relative h-5 w-5" />
        </button>
        <p className="text-xl font-medium">
          {SPOKEN.map((w, i) => (
            <span key={w} className={`transition-colors ${i < heard ? 'text-emerald-600' : 'text-slate-300'}`}>
              {w}{' '}
            </span>
          ))}
        </p>
      </div>
      <p className="mt-3 text-sm text-slate-500">
        {done ? (
          <span className="inline-flex items-center gap-1 text-emerald-700">
            <Check className="h-4 w-4" /> Pronunciación reconocida.
          </span>
        ) : (
          'Lees en voz alta y el reconocimiento de voz te corrige palabra a palabra.'
        )}
      </p>
    </Demo>
  )
}
