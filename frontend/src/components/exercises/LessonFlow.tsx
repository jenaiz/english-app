import { createContext, useContext } from 'react'

/**
 * Set by a lesson around its current step. With it, an exercise's last button moves the lesson
 * on ("Siguiente", "Terminar lección") instead of stopping at its own summary, so finishing an
 * exercise takes one click, not two. Outside lessons (the Club) there is no provider and
 * exercises end on their summary as before.
 */
export interface LessonFlow {
  /** Called right after the exercise has reported its result. */
  advance: () => void
  /** Label of the button that does it. */
  nextLabel: string
}

export const LessonFlowContext = createContext<LessonFlow | null>(null)

export const useLessonFlow = () => useContext(LessonFlowContext)
