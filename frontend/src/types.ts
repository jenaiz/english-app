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

/** 'test' marks a checkpoint: graded exercises only, no 7-phase flow. */
export type LessonKind = 'test'

export interface LessonOverview {
  lesson_id: string
  title: string
  kind?: LessonKind
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

/** GET /api/levels/{id}/study: grammar and vocabulary of every unit in a level, grouped by theme. */
export interface LevelStudy {
  level_id: string
  title: string
  description: string
  themes: {
    theme_id: string
    title: string
    units: { unit_id: string; title: string; grammar: GrammarRuleContent[]; vocabulary: VocabularyItem[] }[]
  }[]
}

export interface Step<T = unknown> {
  phase: Phase
  type: string
  content: T
}

export interface Lesson {
  lesson_id: string
  title: string
  kind?: LessonKind
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
  kind: CardKind
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
  choice?: ReviewChoice
}
export type CardKind = 'vocab' | ExpressionKind
export interface SrsSummary {
  due: number
  total: number
  /** New idioms and phrasal verbs waiting for a free slot in the daily limit. */
  queued: number
  by_kind: Record<CardKind, { due: number; queued: number; total: number }>
  new_per_day: number
  backlog_limit: number
}
/** Multiple-choice exercise for young idiom and phrasal verb cards. */
export interface ReviewChoice {
  type: 'context' | 'particle' | 'phrasal' | 'meaning' | 'idiom' | 'situation' | 'complete' | 'verb_past' | 'verb_gap' | 'verb_participle'
  prompt: string
  /** Expression the question is about, when the prompt is a sentence. */
  focus?: string
  hint?: string
  options: string[]
  answer: string
}
export interface SavedExpression {
  id: string
  repetitions: number
  queued: boolean
  added_at: string
  /** When the card is next due; a new card that isn't queued is due today. */
  due_at: string
}

// ---- Expresiones ----
export type ExpressionKind = 'idiom' | 'phrasal' | 'verb'
export interface Idiom {
  id: string
  term: string
  level: string
  topic: string
  register: string
  /** Essential expression, shown by default. */
  core?: boolean
  definition: string
  equivalent_es: string
  literal_es?: string
  note?: string
  similar?: string[]
  examples: string[]
  image?: string
  situation?: string
  gap?: { word: string; wrong: string[] }
}
export interface PhrasalVerb {
  id: string
  particle: string
  meaning: string
  translation: string
  level: string
  separable: boolean
  core?: boolean
  example: string
  also?: string[]
  similar?: string[]
}
export interface PhrasalFamily {
  root: string
  items: PhrasalVerb[]
}
export interface Hack {
  id: string
  level: string
  title: string
  formula: string
  explanation: string
  examples: string[]
}
export interface Particle {
  particle: string
  idea: string
  note?: string
}
/** A small themed set of expressions that a learner can complete. Items are "idiom:<id>" or "phrasal:<id>". */
export interface Pack {
  id: string
  title: string
  description: string
  level: string
  items: string[]
}
/** One row of the irregular verbs table. Past and participle may list variants: "learnt/learned". */
export interface IrregularVerb {
  id: string
  base: string
  past: string
  participle: string
  translation: string
  level: string
  /** Past simple sentence from the course story. */
  example: string
}

export interface ExpressionsCatalog {
  idioms: Idiom[]
  phrasal_verbs: PhrasalFamily[]
  hacks: Hack[]
  particles: Particle[]
  packs: Pack[]
  /** A few expressions per unit id that fit the unit's topic. */
  unit_expressions: Record<string, string[]>
  irregular_verbs: IrregularVerb[]
}
