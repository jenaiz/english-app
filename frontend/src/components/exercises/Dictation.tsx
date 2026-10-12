import { Snail, Volume2 } from 'lucide-react'
import { speak } from '../../lib/speech'
import type { ExerciseResult, ItemsContent, TextItem } from '../../types'
import TypedAnswer from './TypedAnswer'
import { buttonClass } from '../ui/Button'

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
            className={buttonClass()}
          >
            <Volume2 className="h-5 w-5" /> Escuchar
          </button>
          <button
            type="button"
            onClick={() => speak(it.text, 0.6)}
            className={buttonClass({ variant: 'secondary' })}
          >
            <Snail className="h-5 w-5" /> Lento
          </button>
        </div>
      )}
    />
  )
}
