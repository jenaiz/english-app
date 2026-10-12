import { Volume2 } from 'lucide-react'
import { canSpeak, speak } from '../lib/speech'
import type { VocabularyItem } from '../types'

export default function WordCard({ item }: { item: VocabularyItem }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-display text-lg font-bold text-slate-900">{item.term}</p>
          <p className="font-medium text-emerald-700">{item.translation}</p>
        </div>
        {canSpeak && (
          <button
            onClick={() => speak(item.term)}
            title={`Escuchar "${item.term}"`}
            className="rounded-full p-2 text-indigo-500 transition hover:bg-indigo-50 focus-visible:ring-2 focus-visible:ring-indigo-300 focus-visible:outline-none"
          >
            <Volume2 className="h-5 w-5" />
          </button>
        )}
      </div>
      <p className="mt-2 text-sm text-slate-600">{item.definition}</p>
      {item.example && (
        <button
          onClick={() => speak(item.example!)}
          disabled={!canSpeak}
          className="mt-2 text-left text-sm text-slate-500 italic hover:text-indigo-700"
          title="Escuchar el ejemplo"
        >
          “{item.example}”
        </button>
      )}
    </div>
  )
}
