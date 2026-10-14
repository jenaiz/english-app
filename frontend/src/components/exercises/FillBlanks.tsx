import { Fragment, useRef, useState } from 'react'
import { isCorrect } from '../../lib/answers'
import type { ExerciseResult, FillBlanksItem, ItemsContent } from '../../types'
import ExerciseShell, { ExerciseDone } from './ExerciseShell'
import { useExerciseItems } from './useExerciseItems'

export default function FillBlanks({ content, onComplete }: { content: ItemsContent<FillBlanksItem>; onComplete: (r: ExerciseResult) => void }) {
  const ex = useExerciseItems(content.items.length, onComplete)
  const [values, setValues] = useState<string[]>([])
  // The blank a word from the bank goes into: the last one focused, else the first empty one.
  const lastFocused = useRef(0)
  const inputs = useRef<(HTMLInputElement | null)[]>([])
  if (ex.done) return <ExerciseDone correct={ex.correct} total={content.items.length} />

  const item = content.items[ex.index]
  const parts = item.sentence.split('___')
  const blankOk = (i: number) => isCorrect(values[i] ?? '', item.answers[i], content.strict)
  const answered = ex.status !== 'answering'
  const isEmpty = (i: number) => !(values[i] ?? '').trim()
  const pick = (word: string) => {
    const blanks = item.answers.map((_, i) => i)
    const at = isEmpty(lastFocused.current) ? lastFocused.current : (blanks.find(isEmpty) ?? lastFocused.current)
    setValues((v) => Object.assign([...v], { [at]: word }))
    inputs.current[blanks.find((i) => i !== at && isEmpty(i)) ?? at]?.focus()
  }

  return (
    <ExerciseShell
      instructions={content.instructions}
      index={ex.index}
      total={content.items.length}
      status={ex.status}
      isLast={ex.isLast}
      canCheck={item.answers.every((_, i) => (values[i] ?? '').trim() !== '')}
      onCheck={() => ex.grade(item.answers.every((_, i) => blankOk(i)), item.answers.map((_, i) => values[i] ?? '').join(' | '))}
      onNext={() => {
        setValues([])
        lastFocused.current = 0
        ex.next()
      }}
      correctAnswer={parts.map((p, i) => p + (i < item.answers.length ? item.answers[i][0] : '')).join('')}
      explanation={item.explanation}
      hint={item.hint}
    >
      {content.bank && (
        <div className="mb-5 flex flex-wrap gap-2" role="group" aria-label="Palabras para completar">
          {content.bank.map((w) => (
            <button
              key={w}
              type="button"
              onClick={() => pick(w)}
              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 font-semibold text-slate-700 shadow-sm transition hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700 focus-visible:ring-2 focus-visible:ring-indigo-300 focus-visible:outline-none active:scale-95"
            >
              {w}
            </button>
          ))}
        </div>
      )}
      <p className="text-xl leading-loose text-slate-900">
        {parts.map((part, i) => (
          <Fragment key={`${ex.index}-${i}`}>
            {part}
            {i < parts.length - 1 && (
              <input
                ref={(el) => {
                  inputs.current[i] = el
                }}
                onFocus={() => (lastFocused.current = i)}
                autoFocus={i === 0}
                autoCapitalize="off"
                autoComplete="off"
                spellCheck={false}
                value={values[i] ?? ''}
                onChange={(e) => setValues((v) => Object.assign([...v], { [i]: e.target.value }))}
                style={{ width: `${Math.max(5, Math.max(...item.answers[i].map((a) => a.length)) + 2)}ch` }}
                className={`mx-1 rounded-md border-b-2 bg-indigo-50/60 px-2 py-0.5 text-center font-semibold outline-none focus:border-indigo-500 ${
                  answered ? (blankOk(i) ? 'border-emerald-500 text-emerald-700' : 'border-red-400 text-red-600 line-through') : 'border-slate-300'
                }`}
              />
            )}
          </Fragment>
        ))}
      </p>
    </ExerciseShell>
  )
}
