import { useMemo } from 'react'
import type { PaperItem } from '../../types'
import { buttonClass } from '../ui/Button'

/**
 * Level-exam questions. Unlike lesson exercises they never say whether an answer is right:
 * the learner can change it until the exam is handed in, and the server grades it.
 */
export default function Question({ item, n, value, onChange }: { item: PaperItem; n: number; value: string; onChange: (v: string) => void }) {
  return (
    <div id={`q-${item.id}`} className="scroll-mt-28 rounded-2xl border border-slate-200 bg-white p-5">
      <div className="flex gap-3">
        <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-sm font-bold tabular-nums ${value ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500'}`}>
          {n}
        </span>
        <div className="min-w-0 flex-1">
          {item.type === 'choice' && <Choice item={item} value={value} onChange={onChange} />}
          {item.type === 'gap' && <Gap item={item} value={value} onChange={onChange} />}
          {item.type === 'order' && <Order item={item} value={value} onChange={onChange} />}
        </div>
      </div>
    </div>
  )
}

type Props = { item: PaperItem; value: string; onChange: (v: string) => void }

function Choice({ item, value, onChange }: Props) {
  return (
    <fieldset>
      <legend className="mb-3 font-semibold whitespace-pre-line text-slate-900">{item.prompt}</legend>
      <div className="grid gap-2">
        {item.options!.map((o) => {
          const on = value === o
          return (
            <label
              key={o}
              className={`flex cursor-pointer items-center gap-3 rounded-xl border-2 px-4 py-2.5 font-medium transition has-[:focus-visible]:ring-4 has-[:focus-visible]:ring-indigo-200 ${
                on ? 'border-indigo-600 bg-indigo-50 text-indigo-900' : 'border-slate-200 text-slate-700 hover:border-slate-300'
              }`}
            >
              <input type="radio" name={item.id} value={o} checked={on} onChange={() => onChange(o)} className="sr-only" />
              <span className={`h-4 w-4 shrink-0 rounded-full border-2 ${on ? 'border-indigo-600 bg-indigo-600 shadow-[inset_0_0_0_3px_white]' : 'border-slate-300'}`} />
              {o}
            </label>
          )
        })}
      </div>
    </fieldset>
  )
}

function Gap({ item, value, onChange }: Props) {
  const [before, after] = item.prompt!.split('___')
  return (
    <p className="text-lg leading-loose text-slate-900">
      {before}
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label={`Hueco: ${item.prompt}`}
        autoComplete="off"
        autoCapitalize="off"
        autoCorrect="off"
        spellCheck={false}
        maxLength={60}
        className="mx-1 w-40 border-b-2 border-slate-300 bg-slate-50 px-2 py-0.5 text-center font-semibold text-indigo-900 focus:border-indigo-600 focus:bg-white focus:outline-none"
      />
      {after}
    </p>
  )
}

/** Tap the words in order; tap a word of the sentence to send it back. */
function Order({ item, value, onChange }: Props) {
  const words = item.words!
  // Rebuild which chips are in the sentence from the saved answer (repeated words map in order).
  const picked = useMemo(() => {
    const out: number[] = []
    for (const w of value.split(' ').filter(Boolean)) {
      const i = words.findIndex((x, j) => x === w && !out.includes(j))
      if (i >= 0) out.push(i)
    }
    return out
  }, [value, words])
  const set = (next: number[]) => onChange(next.map((i) => words[i]).join(' '))

  return (
    <div>
      <div className="flex min-h-12 flex-wrap items-center gap-2 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 p-2" aria-label="Tu frase">
        {picked.length === 0 && <span className="px-2 text-sm text-slate-400">Toca las palabras en orden</span>}
        {picked.map((i) => (
          <button
            key={i}
            type="button"
            onClick={() => set(picked.filter((x) => x !== i))}
            className={buttonClass({ size: 'sm' })}
          >
            {words[i]}
          </button>
        ))}
        {item.ending && (
          <span className="ml-auto pr-1 pl-2 text-2xl leading-none font-extrabold text-indigo-400 select-none" aria-label={item.ending === '?' ? 'Es una pregunta' : undefined}>
            {item.ending}
          </span>
        )}
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {words.map((w, i) =>
          picked.includes(i) ? (
            <span key={i} className="rounded-lg border border-dashed border-slate-200 px-3 py-1.5 font-medium text-transparent select-none" aria-hidden>
              {w}
            </span>
          ) : (
            <button
              key={i}
              type="button"
              onClick={() => set([...picked, i])}
              className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 font-medium text-slate-800 shadow-sm hover:border-indigo-400 focus-visible:ring-4 focus-visible:ring-indigo-200 focus-visible:outline-none"
            >
              {w}
            </button>
          ),
        )}
      </div>
    </div>
  )
}
