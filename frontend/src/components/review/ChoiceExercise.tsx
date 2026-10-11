import type { ReviewChoice } from '../../types'

const INSTRUCTIONS: Record<ReviewChoice['type'], string> = {
  context: '¿Qué significa en esta frase?',
  particle: 'Elige la partícula que falta',
  phrasal: '¿Qué phrasal verb significa esto?',
  meaning: '¿Qué significa este idiom?',
  idiom: '¿Qué idiom significa esto?',
  situation: '¿Qué idiom usarías en esta situación?',
  complete: 'Completa el idiom',
  verb_past: '¿Cuál es el past simple?',
  verb_gap: 'Completa con el verbo en pasado',
  verb_participle: '¿Cuál es el participio?',
}

interface Props {
  choice: ReviewChoice
  picked: string | null
  onPick: (option: string) => void
}

/** Multiple-choice prompt for young idiom, phrasal and irregular verb cards. After picking, it marks the right answer. */
export default function ChoiceExercise({ choice, picked, onPick }: Props) {
  const answered = picked !== null
  const long = choice.type === 'meaning' || choice.type === 'context' // options are whole definitions
  const hasGap = choice.type === 'particle' || choice.type === 'complete' || choice.type === 'verb_gap'

  return (
    <div className="mt-5">
      <p className="text-sm font-medium text-indigo-600">
        {choice.type === 'context' && choice.focus ? (
          <>
            ¿Qué significa <strong>{choice.focus}</strong> en esta frase?
          </>
        ) : (
          INSTRUCTIONS[choice.type]
        )}
      </p>
      {choice.type === 'situation' || choice.type === 'context' ? (
        <p className="mt-3 rounded-2xl bg-slate-50 px-5 py-4 text-left text-lg leading-relaxed text-slate-800">{choice.prompt}</p>
      ) : (
        <p className={`mt-3 font-bold text-slate-900 ${hasGap || choice.type === 'meaning' ? 'font-display text-3xl' : 'text-xl'}`}>
          {hasGap ? <Sentence text={choice.prompt} fill={answered ? choice.answer : null} /> : choice.prompt}
        </p>
      )}
      {choice.hint && <p className="mt-2 text-slate-500">Pista: {choice.hint}</p>}

      <div className={`mt-6 grid gap-2 text-left ${long ? '' : choice.options.length === 3 ? 'sm:grid-cols-3' : 'sm:grid-cols-2'}`}>
        {choice.options.map((o, i) => {
          const state = !answered ? 'idle' : o === choice.answer ? 'right' : o === picked ? 'wrong' : 'other'
          return (
            <button
              key={o}
              type="button"
              disabled={answered}
              onClick={() => onPick(o)}
              className={`flex items-start gap-3 rounded-xl border-2 px-4 py-3 font-medium transition ${
                state === 'idle'
                  ? 'border-slate-200 text-slate-800 hover:border-indigo-400 hover:bg-indigo-50'
                  : state === 'right'
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-800'
                    : state === 'wrong'
                      ? 'border-red-400 bg-red-50 text-red-700'
                      : 'border-slate-100 text-slate-400'
              }`}
            >
              <span className="grid h-6 w-6 shrink-0 place-items-center rounded-md bg-slate-100 text-xs font-bold text-slate-500">{i + 1}</span>
              <span className={`text-left ${long ? 'text-sm leading-snug' : 'text-lg'}`}>{o}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

/** Shows the ___ of a sentence as a gap, filled with the answer once the learner has picked. */
function Sentence({ text, fill }: { text: string; fill: string | null }) {
  const [before, after] = text.split('___')
  return (
    <>
      {before}
      <span className={`inline-block min-w-16 border-b-4 px-1 text-center ${fill ? 'border-emerald-500 text-emerald-700' : 'border-indigo-500 text-transparent'}`}>
        {fill ?? '___'}
      </span>
      {after}
    </>
  )
}
