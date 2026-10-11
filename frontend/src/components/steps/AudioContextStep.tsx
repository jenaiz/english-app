import { useEffect, useState } from 'react'
import { BookOpenText, Pause, Volume2 } from 'lucide-react'
import { playLines, stopSpeaking, type DialogueLine } from '../../lib/speech'
import type { AudioContextContent } from '../../types'

export default function AudioContextStep({ content }: { content: AudioContextContent }) {
  const [speaking, setSpeaking] = useState<number | 'all' | null>(null)
  const dialogue = content.dialogue ?? []
  const speakers = [...new Set(dialogue.map((l) => l.speaker))]

  useEffect(() => stopSpeaking, [])

  const play = (lines: DialogueLine[], key: number | 'all') => {
    if (speaking === key) {
      stopSpeaking()
      setSpeaking(null)
      return
    }
    setSpeaking(key)
    playLines(lines).then(() => setSpeaking((k) => (k === key ? null : k)))
  }

  // A chapter may open with a scene (read by the narrator voice) before the dialogue.
  const allLines = [...(content.passage ? [{ speaker: 'Narrator', text: content.passage }] : []), ...dialogue]

  return (
    <div>
      <div className="mb-6 flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-xl font-bold text-slate-900">
          {content.passage && <BookOpenText className="h-5 w-5 text-indigo-500" />}
          {content.title ?? (dialogue.length ? 'Escucha el diálogo' : 'Lee el texto')}
        </h2>
        <button
          onClick={() => play(allLines, 'all')}
          className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-indigo-50 px-3 py-2 text-sm font-medium text-indigo-700 transition hover:bg-indigo-100"
        >
          {speaking === 'all' ? <Pause className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
          {speaking === 'all' ? 'Detener' : 'Escuchar todo'}
        </button>
      </div>

      {content.passage && (
        <p
          className={`rounded-xl bg-slate-50 p-5 text-lg leading-relaxed text-slate-800 ${dialogue.length ? 'mb-6 italic' : ''} ${speaking === 'all' ? 'ring-2 ring-amber-400' : ''}`}
        >
          {content.passage}
        </p>
      )}

      <div className="space-y-4">
        {dialogue.map((line, i) => {
          const right = speakers.indexOf(line.speaker) % 2 === 1
          return (
            <div key={i} className={`flex flex-col ${right ? 'items-end' : 'items-start'}`}>
              <span className="mb-1 px-1 text-xs font-semibold text-slate-400">{line.speaker}</span>
              <button
                onClick={() => play([line], i)}
                title="Escuchar"
                className={`group flex max-w-[85%] items-start gap-2 rounded-2xl px-4 py-3 text-left transition ${
                  right
                    ? 'rounded-tr-sm bg-indigo-600 text-white hover:bg-indigo-700'
                    : 'rounded-tl-sm bg-slate-100 text-slate-800 hover:bg-slate-200'
                } ${speaking === i ? 'ring-2 ring-amber-400' : ''}`}
              >
                <span>{line.text}</span>
                <Volume2 className="mt-0.5 h-4 w-4 shrink-0 opacity-0 transition group-hover:opacity-70" />
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
