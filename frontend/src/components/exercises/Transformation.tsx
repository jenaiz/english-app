import type { ExerciseResult, ItemsContent, TransformationItem } from '../../types'
import TypedAnswer from './TypedAnswer'

export default function Transformation({ content, onComplete }: { content: ItemsContent<TransformationItem>; onComplete: (r: ExerciseResult) => void }) {
  return (
    <TypedAnswer
      content={content}
      onComplete={onComplete}
      accepted={(it) => it.answers}
      placeholder="Escribe la frase transformada…"
      renderPrompt={(it) => (
        <>
          {it.prompt && <p className="mb-2 inline-block rounded-full bg-violet-100 px-3 py-0.5 text-sm font-semibold text-violet-700">{it.prompt}</p>}
          <p className="text-xl font-medium text-slate-900">{it.source}</p>
        </>
      )}
    />
  )
}
