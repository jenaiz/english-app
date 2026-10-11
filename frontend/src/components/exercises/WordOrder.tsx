import { useMemo, useState } from 'react'
import { isCorrect, shuffle } from '../../lib/answers'
import type { ExerciseResult, ItemsContent, WordOrderItem } from '../../types'
import ExerciseShell, { ExerciseDone } from './ExerciseShell'
import { useExerciseItems } from './useExerciseItems'

interface Token {
  id: number
  word: string
}

export default function WordOrder({ content, onComplete }: { content: ItemsContent<WordOrderItem>; onComplete: (r: ExerciseResult) => void }) {
  const ex = useExerciseItems(content.items.length, onComplete)
  const item = content.items[Math.min(ex.index, content.items.length - 1)]

  const tokens = useMemo<Token[]>(() => {
    // Punctuation is dropped from the chips so it can't hint at the order; answers are compared normalized.
    const words = [...item.answer.split(/\s+/), ...(item.distractors ?? [])].map((w) => w.replace(/[.,!?;:]+$/, ''))
    return shuffle(words.map((word, id) => ({ id, word })))
  }, [item])
  const [picked, setPicked] = useState<number[]>([])

  if (ex.done) return <ExerciseDone correct={ex.correct} total={content.items.length} />

  const built = picked.map((id) => tokens.find((t) => t.id === id)!.word).join(' ')
  const chip =
    'rounded-lg border-2 border-b-4 bg-white px-3 py-1.5 font-medium shadow-sm transition hover:-translate-y-0.5 active:translate-y-0'

  return (
    <ExerciseShell
      instructions={content.instructions}
      index={ex.index}
      total={content.items.length}
      status={ex.status}
      isLast={ex.isLast}
      canCheck={picked.length > 0}
      onCheck={() => ex.grade(isCorrect(built, [item.answer]))}
      onNext={() => {
        setPicked([])
        ex.next()
      }}
      correctAnswer={item.answer}
      explanation={item.explanation}
      hint={item.hint}
    >
      <div className="flex min-h-16 flex-wrap items-center gap-2 border-b-2 border-dashed border-slate-300 pb-3">
        {picked.length === 0 && <span className="text-slate-400">Toca las palabras en orden…</span>}
        {picked.map((id) => (
          <button key={id} type="button" onClick={() => setPicked((p) => p.filter((x) => x !== id))} className={`${chip} border-indigo-300 text-indigo-800`}>
            {tokens.find((t) => t.id === id)!.word}
          </button>
        ))}
      </div>
      <div className="mt-5 flex flex-wrap gap-2">
        {tokens.map((t) =>
          picked.includes(t.id) ? (
            <span key={t.id} className="rounded-lg border-2 border-dashed border-slate-200 px-3 py-1.5 text-transparent select-none">
              {t.word}
            </span>
          ) : (
            <button key={t.id} type="button" onClick={() => setPicked((p) => [...p, t.id])} className={`${chip} border-slate-200 text-slate-800`}>
              {t.word}
            </button>
          ),
        )}
      </div>
    </ExerciseShell>
  )
}
