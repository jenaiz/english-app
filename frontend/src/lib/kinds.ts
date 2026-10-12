// One colour per kind of content, the same in Expresiones, Repaso and the lessons, so a colour
// always means the same thing. Levels have their own palette (lib/levels.ts).

export type ContentKind = 'vocab' | 'phrasal' | 'idiom' | 'verb' | 'hack'

export const KIND_COLOR: Record<ContentKind, { tone: string; bar: string }> = {
  vocab: { tone: 'bg-sky-100 text-sky-700', bar: 'bg-sky-300' },
  phrasal: { tone: 'bg-indigo-100 text-indigo-700', bar: 'bg-indigo-200' },
  idiom: { tone: 'bg-emerald-100 text-emerald-700', bar: 'bg-emerald-300' },
  verb: { tone: 'bg-rose-100 text-rose-700', bar: 'bg-rose-200' },
  hack: { tone: 'bg-yellow-100 text-yellow-800', bar: 'bg-yellow-300' },
}
