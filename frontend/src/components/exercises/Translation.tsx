import type { ExerciseResult, ItemsContent, TransformationItem } from '../../types'
import TypedAnswer from './TypedAnswer'

export default function Translation({ content, onComplete }: { content: ItemsContent<TransformationItem>; onComplete: (r: ExerciseResult) => void }) {
  return (
    <TypedAnswer
      content={content}
      onComplete={onComplete}
      accepted={(it) => it.answers}
      placeholder="Escribe en inglés…"
      renderPrompt={(it) => (
        <p className="flex items-center gap-2 text-xl font-medium text-slate-900">
          <span className="rounded bg-amber-100 px-1.5 py-0.5 text-xs font-bold text-amber-700">ES</span>
          {it.source}
        </p>
      )}
    />
  )
}
