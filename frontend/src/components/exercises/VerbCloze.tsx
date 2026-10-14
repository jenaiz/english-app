import { Fragment, useRef, useState } from 'react'
import { isCorrect } from '../../lib/answers'
import type { ExerciseResult, VerbClozeContent } from '../../types'
import ExerciseShell, { ExerciseDone } from './ExerciseShell'
import type { ItemStatus } from './useExerciseItems'

// The base verb right after a blank: "___ (go)" or "___ (look for)".
const BASE = /^(\s*)\(([^)]+)\)/

/**
 * Textbook-style cloze: whole paragraphs with several blanks, each optionally followed by the
 * word in brackets to put in the right form. Every blank counts towards the score, not just the
 * item, and tagged blanks (Club games) also count towards their exam topic.
 */
export default function VerbCloze({ content, onComplete }: { content: VerbClozeContent; onComplete: (r: ExerciseResult) => void }) {
  const [index, setIndex] = useState(0)
  const [status, setStatus] = useState<ItemStatus>('answering')
  const [values, setValues] = useState<string[]>([])
  const [done, setDone] = useState(false)
  const score = useRef<Required<ExerciseResult>>({ correct: 0, total: 0, byTag: {}, items: [] })

  if (done) return <ExerciseDone correct={score.current.correct} total={score.current.total} />

  const item = content.items[index]
  const parts = item.text.split('___')
  const blankOk = (i: number) => isCorrect(values[i] ?? '', item.answers[i])
  const answered = status !== 'answering'
  const isLast = index + 1 >= content.items.length

  const check = () => {
    const right = item.answers.filter((_, i) => blankOk(i)).length
    score.current.correct += right
    score.current.total += item.answers.length
    score.current.items.push({ i: index, ok: right === item.answers.length, answer: item.answers.map((_, i) => values[i] ?? '').join(' | ') })
    item.tags?.forEach((tag, i) => {
      const t = (score.current.byTag[tag] ??= { correct: 0, total: 0 })
      t.total++
      if (blankOk(i)) t.correct++
    })
    setStatus(right === item.answers.length ? 'correct' : 'wrong')
  }
  const next = () => {
    if (isLast) {
      setDone(true)
      onComplete({ ...score.current })
      return
    }
    setIndex(index + 1)
    setValues([])
    setStatus('answering')
  }

  return (
    <ExerciseShell
      instructions={content.instructions ?? 'Completa con la forma correcta del verbo entre paréntesis.'}
      index={index}
      total={content.items.length}
      status={status}
      isLast={isLast}
      canCheck={item.answers.every((_, i) => (values[i] ?? '').trim() !== '')}
      onCheck={check}
      onNext={next}
      correctAnswer={
        status === 'wrong'
          ? item.answers
              .map((a, i) => (blankOk(i) ? null : `${i + 1}. ${a[0]}`))
              .filter(Boolean)
              .join(' · ')
          : undefined
      }
      explanation={item.explanation}
      hint={item.hint}
    >
      <p className="text-lg leading-[2.4] text-slate-900">
        {parts.map((part, i) => {
          // The bracketed verb that follows a blank is drawn as a label, not as text.
          const base = i > 0 ? BASE.exec(part) : null
          const rest = base ? part.slice(base[0].length) : part
          return (
            <Fragment key={`${index}-${i}`}>
              {base && (
                <span className="ml-1 rounded-md bg-amber-100 px-1.5 py-0.5 text-sm font-semibold text-amber-800">{base[2]}</span>
              )}
              {rest}
              {i < parts.length - 1 && (
                <span className="relative inline-block">
                  {item.answers.length > 1 && (
                    <span className="absolute -top-3.5 left-1 text-[10px] font-bold text-slate-400">{i + 1}</span>
                  )}
                  <input
                    autoFocus={i === 0}
                    autoCapitalize="off"
                    autoComplete="off"
                    spellCheck={false}
                    value={values[i] ?? ''}
                    onChange={(e) => setValues((v) => Object.assign([...v], { [i]: e.target.value }))}
                    aria-label={`Hueco ${i + 1}`}
                    style={{ width: `${Math.max(6, Math.max(...item.answers[i].map((a) => a.length)) + 2)}ch` }}
                    className={`mx-1 rounded-md border-b-2 bg-indigo-50/60 px-2 py-0.5 text-center font-semibold outline-none focus:border-indigo-500 ${
                      answered ? (blankOk(i) ? 'border-emerald-500 text-emerald-700' : 'border-red-400 text-red-600 line-through') : 'border-slate-300'
                    }`}
                  />
                </span>
              )}
            </Fragment>
          )
        })}
      </p>
    </ExerciseShell>
  )
}
