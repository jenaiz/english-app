import type {
  AudioContextContent,
  ChoiceItem,
  ExerciseResult,
  FillBlanksItem,
  GrammarRuleContent,
  ItemsContent,
  MatchPairsContent,
  SpeedQuizContent,
  Step,
  TextItem,
  TransformationItem,
  VerbClozeContent,
  VocabularyTableContent,
  WordOrderItem,
} from '../../types'
import Dictation from '../exercises/Dictation'
import FillBlanks from '../exercises/FillBlanks'
import MatchPairs from '../exercises/MatchPairs'
import MultipleChoice from '../exercises/MultipleChoice'
import Speaking from '../exercises/Speaking'
import SpeedQuiz from '../exercises/SpeedQuiz'
import Transformation from '../exercises/Transformation'
import Translation from '../exercises/Translation'
import VerbCloze from '../exercises/VerbCloze'
import WordOrder from '../exercises/WordOrder'
import AudioContextStep from './AudioContextStep'
import GrammarRuleStep from './GrammarRuleStep'
import UnknownStep from './UnknownStep'
import VocabularyTableStep from './VocabularyTableStep'

/** Step types that require the learner to answer before moving on. */
export const EXERCISE_TYPES = new Set([
  'verb_cloze',
  'multiple_choice',
  'match_pairs',
  'fill_blanks',
  'word_order',
  'transformation',
  'translation',
  'dictation',
  'speaking',
  'speed_quiz',
])

// Add new step types here: one case per `type` value in the content JSON.
export default function StepRenderer({ step, onComplete }: { step: Step; onComplete: (r: ExerciseResult) => void }) {
  const c = step.content
  switch (step.type) {
    case 'audio_context':
      return <AudioContextStep content={c as AudioContextContent} />
    case 'grammar_rule':
      return <GrammarRuleStep content={c as GrammarRuleContent} />
    case 'vocabulary_table':
      return <VocabularyTableStep content={c as VocabularyTableContent} />
    case 'multiple_choice':
      return <MultipleChoice content={c as ItemsContent<ChoiceItem>} onComplete={onComplete} />
    case 'match_pairs':
      return <MatchPairs content={c as MatchPairsContent} onComplete={onComplete} />
    case 'fill_blanks':
      return <FillBlanks content={c as ItemsContent<FillBlanksItem>} onComplete={onComplete} />
    case 'verb_cloze':
      return <VerbCloze content={c as VerbClozeContent} onComplete={onComplete} />
    case 'word_order':
      return <WordOrder content={c as ItemsContent<WordOrderItem>} onComplete={onComplete} />
    case 'transformation':
      return <Transformation content={c as ItemsContent<TransformationItem>} onComplete={onComplete} />
    case 'translation':
      return <Translation content={c as ItemsContent<TransformationItem>} onComplete={onComplete} />
    case 'dictation':
      return <Dictation content={c as ItemsContent<TextItem>} onComplete={onComplete} />
    case 'speaking':
      return <Speaking content={c as ItemsContent<TextItem>} onComplete={onComplete} />
    case 'speed_quiz':
      return <SpeedQuiz content={c as SpeedQuizContent} onComplete={onComplete} />
    default:
      return <UnknownStep step={step} />
  }
}
