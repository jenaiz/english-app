import { Snail, Volume2 } from 'lucide-react'
import { speak } from '../../lib/speech'
import type { ExerciseResult, ItemsContent, TextItem } from '../../types'
import TypedAnswer from './TypedAnswer'

export default function Dictation({ content, onComplete }: { content: ItemsContent<TextItem>; onComplete: (r: ExerciseResult) => void }) {
  return (
    <TypedAnswer
      content={content}
      onComplete={onComplete}
      accepted={(it) => [it.text]}
      placeholder="Escribe lo que oyes…"
      onItemStart={(it) => speak(it.text)}
      renderPrompt={(it) => (
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => speak(it.text)}
            className="flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 font-semibold text-white shadow-sm hover:bg-indigo-700"
          >
            <Volume2 className="h-5 w-5" /> Escuchar
          </button>
          <button
            type="button"
            onClick={() => speak(it.text, 0.6)}
            className="flex items-center gap-2 rounded-xl border border-slate-300 px-4 py-3 font-medium text-slate-700 hover:bg-slate-50"
          >
            <Snail className="h-5 w-5" /> Lento
          </button>
        </div>
      )}
    />
  )
}
