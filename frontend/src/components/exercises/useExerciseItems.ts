import { useCallback, useRef, useState } from 'react'
import type { ExerciseResult, ItemOutcome } from '../../types'
import { useLessonFlow } from './LessonFlow'

export type ItemStatus = 'answering' | 'correct' | 'wrong'

/** Walks through `total` items; each item is graded once (first attempt counts). */
export function useExerciseItems(total: number, onComplete: (r: ExerciseResult) => void) {
  const [index, setIndex] = useState(0)
  const [status, setStatus] = useState<ItemStatus>('answering')
  const [done, setDone] = useState(false)
  const correctRef = useRef(0)
  const [correct, setCorrect] = useState(0)
  const itemsRef = useRef<ItemOutcome[]>([])
  const flow = useLessonFlow()

  /** Grades the current item; `answer` is what the learner gave, kept for their history. */
  const grade = useCallback((ok: boolean, answer?: string) => {
    itemsRef.current.push({ i: index, ok, ...(answer !== undefined && { answer }) })
    if (ok) {
      correctRef.current += 1
      setCorrect(correctRef.current)
    }
    setStatus(ok ? 'correct' : 'wrong')
    flow?.onGraded?.()
  }, [index, flow])

  const next = useCallback(() => {
    if (index + 1 >= total) {
      setDone(true)
      onComplete({ correct: correctRef.current, total, items: itemsRef.current })
    } else {
      setIndex((i) => i + 1)
      setStatus('answering')
    }
  }, [index, total, onComplete])

  return { index, status, done, correct, grade, next, isLast: index + 1 >= total }
}
