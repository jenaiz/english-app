import { useCallback, useRef, useState } from 'react'
import type { ExerciseResult } from '../../types'

export type ItemStatus = 'answering' | 'correct' | 'wrong'

/** Walks through `total` items; each item is graded once (first attempt counts). */
export function useExerciseItems(total: number, onComplete: (r: ExerciseResult) => void) {
  const [index, setIndex] = useState(0)
  const [status, setStatus] = useState<ItemStatus>('answering')
  const [done, setDone] = useState(false)
  const correctRef = useRef(0)
  const [correct, setCorrect] = useState(0)

  const grade = useCallback((ok: boolean) => {
    if (ok) {
      correctRef.current += 1
      setCorrect(correctRef.current)
    }
    setStatus(ok ? 'correct' : 'wrong')
  }, [])

  const next = useCallback(() => {
    if (index + 1 >= total) {
      setDone(true)
      onComplete({ correct: correctRef.current, total })
    } else {
      setIndex((i) => i + 1)
      setStatus('answering')
    }
  }, [index, total, onComplete])

  return { index, status, done, correct, grade, next, isLast: index + 1 >= total }
}
