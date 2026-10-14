import { useEffect, useState, type ReactNode } from 'react'
import { isCorrect } from '../../lib/answers'
import type { ExerciseResult, ItemBase, ItemsContent } from '../../types'
import ExerciseShell, { ExerciseDone, inputCls } from './ExerciseShell'
import { useExerciseItems } from './useExerciseItems'

interface Props<T extends ItemBase> {
  content: ItemsContent<T>
  onComplete: (r: ExerciseResult) => void
  accepted: (item: T) => string[]
  renderPrompt: (item: T, index: number) => ReactNode
  placeholder?: string
  onItemStart?: (item: T) => void
}

/** Shared implementation for exercises answered by typing a sentence (transformation, translation, dictation). */
export default function TypedAnswer<T extends ItemBase>({ content, onComplete, accepted, renderPrompt, placeholder, onItemStart }: Props<T>) {
  const ex = useExerciseItems(content.items.length, onComplete)
  const [value, setValue] = useState('')
  const item = content.items[Math.min(ex.index, content.items.length - 1)]

  useEffect(() => {
    if (!ex.done) onItemStart?.(item)
  }, [ex.index])

  if (ex.done) return <ExerciseDone correct={ex.correct} total={content.items.length} />

  return (
    <ExerciseShell
      instructions={content.instructions}
      index={ex.index}
      total={content.items.length}
      status={ex.status}
      isLast={ex.isLast}
      canCheck={value.trim() !== ''}
      onCheck={() => ex.grade(isCorrect(value, accepted(item)), value)}
      onNext={() => {
        setValue('')
        ex.next()
      }}
      correctAnswer={accepted(item)[0]}
      explanation={item.explanation}
      hint={item.hint}
    >
      <div className="mb-4">{renderPrompt(item, ex.index)}</div>
      <input
        key={ex.index}
        autoFocus
        autoCapitalize="off"
        autoComplete="off"
        spellCheck={false}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder ?? 'Escribe tu respuesta…'}
        className={inputCls}
      />
    </ExerciseShell>
  )
}
