import { useEffect, useState } from 'react'
import type { ChoiceItem, ExerciseResult, ItemsContent } from '../../types'
import ExerciseShell, { ExerciseDone } from './ExerciseShell'
import { useExerciseItems } from './useExerciseItems'

export default function MultipleChoice({ content, onComplete }: { content: ItemsContent<ChoiceItem>; onComplete: (r: ExerciseResult) => void }) {
  const ex = useExerciseItems(content.items.length, onComplete)
  const [selected, setSelected] = useState<number | null>(null)
  // Bumped on every pick, even of the same option, so the focus always returns to "Comprobar".
  const [picks, setPicks] = useState(0)
  const choose = (i: number) => {
    setSelected(i)
    setPicks((p) => p + 1)
  }
  const optionCount = ex.done ? 0 : content.items[ex.index].options.length

  // Keys 1-9 pick an option; Enter then checks (the focus moves to "Comprobar").
  useEffect(() => {
    if (ex.status !== 'answering' || !optionCount) return
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || (e.target instanceof Element && e.target.closest('input, textarea'))) return
      const n = Number(e.key)
      if (n >= 1 && n <= optionCount) choose(n - 1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [ex.status, optionCount])

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
      onCheck={() => ex.grade(selected === item.answer, item.options[selected!])}
      onNext={() => {
        setSelected(null)
        ex.next()
      }}
      correctAnswer={item.options[item.answer]}
      explanation={item.explanation}
      hint={item.hint}
      focusCheckOn={picks}
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
              onClick={() => choose(i)}
              className={`flex items-center gap-3 rounded-xl border-2 px-4 py-3 text-left font-medium transition ${
                {
                  right: 'border-emerald-500 bg-emerald-50 text-emerald-800',
                  wrong: 'border-red-400 bg-red-50 text-red-700',
                  selected: 'border-indigo-500 bg-indigo-50 text-indigo-800',
                  idle: 'border-slate-200 hover:border-indigo-300 hover:bg-slate-50',
                }[state]
              }`}
            >
              <kbd className="hidden h-6 w-6 shrink-0 place-items-center rounded-md border border-current/25 font-sans text-xs opacity-60 sm:grid">{i + 1}</kbd>
              {opt}
            </button>
          )
        })}
      </div>
    </ExerciseShell>
  )
}
