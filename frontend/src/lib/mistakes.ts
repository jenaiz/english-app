import type {
  ChoiceItem,
  ExerciseResult,
  FillBlanksItem,
  ItemsContent,
  MatchPairsContent,
  Step,
  TextItem,
  TransformationItem,
  VerbClozeItem,
  WordOrderItem,
} from '../types'

/** One item the learner got wrong: what was asked, what they gave and the right answer. */
export interface Mistake {
  prompt: string
  answer?: string
  correct: string
}

/** Fills each ___ of a sentence with the first accepted answer of its blank. */
const filled = (text: string, answers: string[][]) =>
  text
    .split('___')
    .map((part, i) => part + (i < answers.length ? (answers[i][0] ?? '') : ''))
    .join('')

/**
 * The items of an exercise step that went wrong. Speaking is left out (speech recognition slips
 * are not mistakes) and so are speed-quiz items the clock ran out on.
 */
export function stepMistakes(step: Step, result: ExerciseResult): Mistake[] {
  if (step.type === 'speaking' || !result.items) return []
  const out: Mistake[] = []
  for (const it of result.items) {
    if (it.ok || it.timeout) continue
    const m = describe(step, it.i)
    if (m) out.push({ ...m, answer: it.answer })
  }
  return out
}

function describe(step: Step, i: number): Omit<Mistake, 'answer'> | null {
  const c = step.content as unknown
  switch (step.type) {
    case 'multiple_choice':
    case 'speed_quiz': {
      const it = (c as ItemsContent<ChoiceItem>).items[i]
      return it && { prompt: it.question, correct: it.options[it.answer] }
    }
    case 'fill_blanks': {
      const it = (c as ItemsContent<FillBlanksItem>).items[i]
      return it && { prompt: it.sentence, correct: filled(it.sentence, it.answers) }
    }
    case 'verb_cloze': {
      const it = (c as ItemsContent<VerbClozeItem>).items[i]
      return it && { prompt: it.text, correct: it.answers.map((a) => a[0]).join(' | ') }
    }
    case 'word_order': {
      const it = (c as ItemsContent<WordOrderItem>).items[i]
      return it && { prompt: 'Ordena las palabras', correct: it.answer }
    }
    case 'transformation':
    case 'translation': {
      const it = (c as ItemsContent<TransformationItem>).items[i]
      return it && { prompt: it.prompt ? `${it.prompt}: ${it.source}` : it.source, correct: it.answers[0] }
    }
    case 'dictation': {
      const it = (c as ItemsContent<TextItem>).items[i]
      return it && { prompt: 'Dictado', correct: it.text }
    }
    case 'match_pairs': {
      const p = (c as MatchPairsContent).pairs[i]
      return p && { prompt: p.left, correct: p.right }
    }
  }
  return null
}
