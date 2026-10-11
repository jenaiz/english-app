export interface User {
  id: string
  email: string
  /** Display name chosen in Settings ("" if not set). */
  name: string
  has_password: boolean
  has_google: boolean
  email_verified: boolean
  created_at: string
}

export interface LessonOverview {
  lesson_id: string
  title: string
  grammar: string[]
}

export interface UnitSummary {
  unit_id: string
  title: string
  description: string
  lesson_ids: string[]
  lessons: LessonOverview[]
}

export interface ThemeSummary {
  theme_id: string
  title: string
  units: UnitSummary[]
}

export interface LevelSummary {
  level_id: string
  title: string
  description: string
  themes: ThemeSummary[]
}

export interface Step<T = unknown> {
  phase: Phase
  type: string
  content: T
}

export interface Lesson {
  lesson_id: string
  title: string
  steps: Step[]
}

export interface Unit {
  unit_id: string
  title: string
  description: string
  lessons: Lesson[]
}

export interface UnitResponse {
  level_id: string
  theme_id: string
  unit: Unit
}

export type ProgressStatus = 'not_started' | 'in_progress' | 'completed'

export interface LessonProgress {
  unit_id: string
  lesson_id: string
  status: ProgressStatus
  score: number
  updated_at: string
}

export interface ProgressResponse {
  lessons: LessonProgress[]
  completed_units: string[]
}

// Step content shapes
export interface DialogueLine {
  speaker: string
  text: string
}
export interface AudioContextContent {
  dialogue?: DialogueLine[]
  title?: string
  passage?: string
}
export interface GrammarRuleContent {
  title: string
  explanation: string
  examples?: string[]
  table?: GrammarTable
}
export interface VocabularyItem {
  term: string
  definition: string
  translation: string
  example?: string
}
export interface VocabularyTableContent {
  items: VocabularyItem[]
}

// ---- 7-phase flow ----
export type Phase = 'context' | 'discovery' | 'grammar' | 'practice' | 'production' | 'vocabulary' | 'review'

// ---- Exercise content ----
export interface ItemBase {
  explanation?: string
  hint?: string
}
export interface ChoiceItem extends ItemBase {
  question: string
  options: string[]
  answer: number
}
export interface FillBlanksItem extends ItemBase {
  sentence: string
  answers: string[][]
}
export interface WordOrderItem extends ItemBase {
  answer: string
  distractors?: string[]
}
export interface TransformationItem extends ItemBase {
  prompt?: string
  source: string
  answers: string[]
}
export interface TextItem extends ItemBase {
  text: string
}
export interface ItemsContent<T> {
  instructions?: string
  items: T[]
}
export interface MatchPairsContent {
  instructions?: string
  pairs: { left: string; right: string }[]
}
export interface SpeedQuizContent extends ItemsContent<ChoiceItem> {
  time_limit_seconds: number
}
export interface GrammarTable {
  headers: string[]
  rows: string[][]
}

export interface ExerciseResult {
  correct: number
  total: number
}

// ---- SRS ----
export type Grade = 'again' | 'hard' | 'good' | 'easy'
export interface ReviewCard {
  id: string
  term: string
  definition: string
  translation: string
  example?: string
  level_id: string
  unit_title: string
  lesson_title: string
  repetitions: number
  due_at: string
  preview: Record<Grade, number>
}
export interface SrsSummary {
  due: number
  total: number
}
