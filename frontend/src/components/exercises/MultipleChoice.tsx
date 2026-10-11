import { useState } from 'react'
import type { ChoiceItem, ExerciseResult, ItemsContent } from '../../types'
import ExerciseShell, { ExerciseDone } from './ExerciseShell'
import { useExerciseItems } from './useExerciseItems'

export default function MultipleChoice({ content, onComplete }: { content: ItemsContent<ChoiceItem>; onComplete: (r: ExerciseResult) => void }) {
  const ex = useExerciseItems(content.items.length, onComplete)
  const [selected, setSelected] = useState<number | null>(null)
  if (ex.done) return <ExerciseDone correct={ex.correct} total={content.items.length} />
  const item = content.items[ex.index]

  return (
    <ExerciseShell
      instructions={content.instructions}
      index={ex.index}
      total={content.items.length}
      status={ex.status}
      isLast={ex.isLast}
      canCheck={selected !== null}
      onCheck={() => ex.grade(selected === item.answer)}
      onNext={() => {
        setSelected(null)
        ex.next()
      }}
      correctAnswer={item.options[item.answer]}
      explanation={item.explanation}
      hint={item.hint}
    >
      <p className="mb-4 text-lg font-semibold text-slate-900">{item.question}</p>
      <div className="grid gap-2">
        {item.options.map((opt, i) => {
          const answered = ex.status !== 'answering'
          const state = answered && i === item.answer ? 'right' : answered && i === selected ? 'wrong' : selected === i ? 'selected' : 'idle'
          return (
            <button
              key={opt}
              type="button"
              onClick={() => setSelected(i)}
              className={`rounded-xl border-2 px-4 py-3 text-left font-medium transition ${
                {
                  right: 'border-emerald-500 bg-emerald-50 text-emerald-800',
                  wrong: 'border-red-400 bg-red-50 text-red-700',
                  selected: 'border-indigo-500 bg-indigo-50 text-indigo-800',
                  idle: 'border-slate-200 hover:border-indigo-300 hover:bg-slate-50',
                }[state]
              }`}
            >
              {opt}
            </button>
          )
        })}
      </div>
    </ExerciseShell>
  )
}
