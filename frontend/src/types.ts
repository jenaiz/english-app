export interface User {
  id: string
  email: string
  /** Display name chosen in Settings ("" if not set). */
  name: string
  has_password: boolean
  has_google: boolean
  email_verified: boolean
  created_at: string
  /** Only present (true) for the admin account. */
  is_admin?: boolean
}

export interface AdminStats {
  users: number
  verified: number
  google: number
  new_7d: number
  new_30d: number
  active_1d: number
  active_7d: number
  active_30d: number
}

export interface AdminUser {
  id: string
  email: string
  name: string
  has_password: boolean
  has_google: boolean
  email_verified: boolean
  created_at: string
  /** Latest visit or lesson progress; null if never seen. */
  last_seen_at: string | null
  lessons_done: number
  passed_levels: string[]
  cards: number
  /** Level of the unit studied last ("" if not started). */
  level: string
  /** Highest level exam passed ("" if none). */
  certified_level: string
}

export interface AdminUserDetail {
  user: AdminUser
  levels: { level_id: string; title: string; units_done: number; units_total: number }[]
  exams: { exam_id: string; level_id: string; started_at: string; submitted_at?: string; score?: number; passed?: boolean }[]
  club_unlocked: number
  club_completed: number
  cards_due: number
  cards_total: number
  lessons_started: number
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

/** Where a learner left a unit: a step of one lesson, with that lesson's exercises already graded. */
export interface UnitPosition {
  lesson_id: string
  /** Step index within the lesson. */
  step: number
  /** Results of the lesson's graded steps, keyed by step index within the lesson. */
  results: Record<string, ExerciseResult>
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
  /** Word list shown above the items (practice: "Completa con in, on o at"). */
  bank?: string[]
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

/** How one item of an exercise went: its index, whether it was right and what the learner gave. */
export interface ItemOutcome {
  i: number
  ok: boolean
  answer?: string
  /** Speed quiz: the time ran out before this item was answered. */
  timeout?: boolean
}

export interface ExerciseResult {
  correct: number
  total: number
  /** Each item's outcome, saved with the lesson attempt so mistakes can be reviewed and practised. */
  items?: ItemOutcome[]
  /** Per exam topic, for exercises whose blanks are tagged (Club games). */
  byTag?: Record<string, { correct: number; total: number }>
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

// ---- Club ----
export type ActivityType = 'song' | 'reading' | 'video' | 'verb_cloze'
export type ClubRoom = 'music' | 'library' | 'cinema' | 'games'
/** new: unlocked but never opened (still a surprise). */
export type ActivityState = 'locked' | 'new' | 'unlocked' | 'done'

/** An activity in the Club catalog. Locked ones only carry room, level, minutes and hint. */
export interface ActivityCard {
  id: string
  type: ActivityType
  room: ClubRoom
  level: string
  minutes: number
  state: ActivityState
  title?: string
  subtitle?: string
  youtube_id?: string
  hint?: string
  best_score?: number
  unlocked_at?: string
}

/** An activity a lesson has just unlocked, for the end-of-lesson surprise. */
export interface UnlockedActivity {
  id: string
  type: ActivityType
  room: ClubRoom
  title: string
  subtitle?: string
  youtube_id?: string
}

export interface ClubSummary {
  new: number
  unlocked: number
  total: number
}

/** Extras shared by every activity: vocabulary and expressions shown at the end. */
export interface ActivityExtras {
  vocabulary?: VocabularyItem[]
  /** "phrasal:<id>" or "idiom:<id>" */
  expressions?: string[]
}

export interface TimedLine {
  /** Seconds from the start of the video. */
  t: number
  text: string
}

/** A song fragment: lines with ___ blanks, played between start and end. */
export interface SongContent extends ActivityExtras {
  artist?: string
  /** Official YouTube channel (artist or label) the video comes from. */
  channel: string
  /** Questions about the lyrics, asked once the blanks are checked. */
  questions?: ChoiceItem[]
  start?: number
  end: number
  lines: (TimedLine & { answers?: string[][] })[]
  /** Wrong words mixed into the word bank (levels where blanks are chosen, not typed). */
  distractors?: string[]
  /** "bank" (tap a word) or "type"; by default bank up to A2. */
  mode?: 'bank' | 'type'
}

export interface ReadingContent extends ActivityExtras {
  /** e.g. "Del diario de Lucía", "Artículo" */
  kind?: string
  paragraphs: string[]
  /** Words or phrases of the text with their Spanish meaning. */
  glossary?: Record<string, string>
  questions: ChoiceItem[]
  /** From B1 on: parts in the official tests' formats (open cloze, word formation, transformations). */
  exam_practice?: { title: string; instructions: string; items: VerbClozeItem[] }[]
  source?: string
}

/** A talk or video without transcript (talks don't allow publishing theirs): our own questions only. */
export interface VideoContent extends ActivityExtras {
  speaker?: string
  channel: string
  license: string
  source_url: string
  /** start/end pick a segment of a long lecture; the final questions come at end. */
  start?: number
  end?: number
  /** The video pauses at t and asks these questions. */
  checkpoints?: { t: number; questions: ChoiceItem[] }[]
  /** Questions once the video is over. */
  questions?: ChoiceItem[]
}

export interface VerbClozeItem extends ItemBase {
  /** Paragraph with ___ blanks, each optionally followed by a word in brackets to put in the right form: "She ___ (go) home." */
  text: string
  answers: string[][]
  /** Level exam topic of each blank (required in Club games). */
  tags?: string[]
}
export type VerbClozeContent = ItemsContent<VerbClozeItem> & ActivityExtras

export interface Activity {
  id: string
  type: ActivityType
  room: ClubRoom
  level: string
  title: string
  subtitle?: string
  minutes: number
  youtube_id?: string
  milestone: 'unit' | 'checkpoint'
  after_unit?: string
  /** Level exam topics a game practises, with the units that teach them. */
  topics?: { tag: string; label: string; units: UnitLink[] }[]
  content: SongContent | ReadingContent | VideoContent | VerbClozeContent
}

// ---- Level exams ----

export interface UnitLink {
  unit_id: string
  level_id: string
  title: string
}

/** A syllabus topic after grading, with the units that teach it. */
export interface TopicScore {
  tag: string
  label: string
  correct: number
  total: number
  units: UnitLink[]
}

export interface ExamStatus {
  attempts: number
  best_score: number | null
  passed: boolean
  passed_at?: string
  /** Best passed attempt, shown on the certificate. */
  passed_attempt?: string
  last_attempt?: string
  last_score?: number
  /** While set, the learner waits before retaking the exam. */
  retry_at?: string
  open_attempt?: string
  open_deadline?: string
}

export interface ExamSummary {
  exam_id: string
  level_id: string
  title: string
  description: string
  duration_minutes: number
  pass_score: number
  section_min_score: number
  retake_hours: number
  max_plays: number
  items: number
  sections: { section_id: string; title: string; items: number }[]
  topics: string[]
  status: ExamStatus
}

export type ExamItemType = 'choice' | 'gap' | 'order'

export interface PaperItem {
  id: string
  type: ExamItemType
  prompt?: string
  options?: string[]
  /** Shuffled words of an order item. */
  words?: string[]
  /** Final ? or ! of an order item, shown fixed after the sentence. */
  ending?: string
}

export interface PaperPart {
  part_id: string
  instructions: string
  title?: string
  /** Reading text. */
  text?: string
  /** Listening: MP3 file of each line, played in order. */
  audio?: string[]
  items: PaperItem[]
}

export interface Paper {
  exam_id: string
  level_id: string
  title: string
  duration_minutes: number
  max_plays: number
  sections: { section_id: string; title: string; parts: PaperPart[] }[]
}

export interface ExamResult {
  score: number
  passed: boolean
  sections: { section_id: string; title: string; correct: number; total: number; score: number; passed: boolean }[]
  topics: TopicScore[]
  review: {
    section_id: string
    part_id: string
    instructions: string
    title?: string
    text?: string
    dialogue?: { speaker: string; text: string }[]
    items: { id: string; type: ExamItemType; prompt?: string; options?: string[]; answer: string; expected: string; correct: boolean }[]
  }[]
}

export interface ExamAttempt {
  attempt_id: string
  exam_id: string
  level_id: string
  title: string
  status: 'open' | 'submitted'
  started_at: string
  deadline: string
  /** Server time, to correct the countdown for a wrong device clock. */
  now: string
  pass_score: number
  section_min_score: number
  paper?: Paper
  answers?: Record<string, string>
  submitted_at?: string
  result?: ExamResult
  retry_at?: string
  unlocked_activities?: UnlockedActivity[]
}

/** One attempt in the learner's history, with the topics to review. */
export interface ExamAttemptSummary {
  attempt_id: string
  started_at: string
  submitted_at?: string
  open: boolean
  score?: number
  passed?: boolean
  sections: ExamResult['sections']
  weak_topics: ExamResult['topics']
}

// ---- Grammar practice (Repaso → Gramática) ----
export interface PracticeTopicSummary {
  topic_id: string
  level_id: string
  title: string
  items: number
  locked: boolean
  /** The unit that opens a locked topic. */
  opens_with?: { unit_id: string; level_id: string; title: string }
  /** new: never practised · due: practise today · done: up to date until due_at. */
  status: 'new' | 'due' | 'done'
  due_at?: string
  sessions: number
  /** Accuracy over every round, 0-100. */
  accuracy?: number
  /** Scores of the last rounds, oldest first. */
  recent: number[]
  last_at?: string
}
export interface PracticeRound {
  topic: {
    topic_id: string
    level_id: string
    title: string
    rule: GrammarRuleContent
    /** Units that teach the topic, to see their own (shorter) rule. */
    units: { unit_id: string; level_id: string; title: string }[]
  }
  /** One step per exercise type; every item carries its id. */
  steps: Step<ItemsContent<{ id: string }>>[]
}
export interface PracticeItemResult {
  id: string
  ok: boolean
  answer?: string
}
export interface PracticeRoundResult {
  score: number
  correct: number
  total: number
  due_at: string
}
