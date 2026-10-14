import { useState } from 'react'
import { Keyboard, Mic, MicOff, Volume2 } from 'lucide-react'
import { bestSimilarity, isCorrect } from '../../lib/answers'
import { speak, useSpeechRecognition } from '../../lib/speech'
import type { ExerciseResult, ItemsContent, TextItem } from '../../types'
import ExerciseShell, { ExerciseDone, inputCls } from './ExerciseShell'
import { useExerciseItems } from './useExerciseItems'

// Speech recognition is imperfect: accept when most of the words match.
const PASS = 0.75

export default function Speaking({ content, onComplete }: { content: ItemsContent<TextItem>; onComplete: (r: ExerciseResult) => void }) {
  const ex = useExerciseItems(content.items.length, onComplete)
  const rec = useSpeechRecognition()
  const [typing, setTyping] = useState(!rec.supported)
  const [typed, setTyped] = useState('')
  if (ex.done) return <ExerciseDone correct={ex.correct} total={content.items.length} />

  const item = content.items[ex.index]
  const answer = typing ? typed : rec.transcript
  const score = bestSimilarity([rec.transcript, ...rec.alternatives], item.text)

  return (
    <ExerciseShell
      instructions={content.instructions}
      index={ex.index}
      total={content.items.length}
      status={ex.status}
      isLast={ex.isLast}
      canCheck={answer.trim() !== '' && !rec.listening}
      onCheck={() => ex.grade(typing ? isCorrect(typed, [item.text]) : score >= PASS, answer)}
      onNext={() => {
        rec.reset()
        setTyped('')
        ex.next()
      }}
      correctAnswer={item.text}
      explanation={!typing && ex.status !== 'answering' ? `Coincidencia: ${Math.round(score * 100)}%` : item.explanation}
      hint={item.hint}
    >
      <div className="flex items-start justify-between gap-3 rounded-xl bg-slate-50 p-4">
        <p className="text-xl font-medium text-slate-900">“{item.text}”</p>
        <button type="button" onClick={() => speak(item.text)} title="Escuchar modelo" className="rounded-lg p-2 text-indigo-600 hover:bg-indigo-100">
          <Volume2 className="h-5 w-5" />
        </button>
      </div>

      {typing ? (
        <input
          autoFocus
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
          placeholder="Escribe la frase…"
          className={`${inputCls} mt-4`}
        />
      ) : (
        <div className="mt-5 flex flex-col items-center">
          <button
            type="button"
            onClick={rec.listening ? rec.stop : rec.start}
            className={`grid h-20 w-20 place-items-center rounded-full text-white shadow-lg transition ${
              rec.listening ? 'animate-pulse bg-red-500' : 'bg-indigo-600 hover:bg-indigo-700'
            }`}
            title={rec.listening ? 'Parar' : 'Hablar'}
          >
            {rec.listening ? <MicOff className="h-8 w-8" /> : <Mic className="h-8 w-8" />}
          </button>
          <p className="mt-3 min-h-7 text-center text-lg text-slate-700 italic">
            {rec.transcript || <span className="text-sm text-slate-400 not-italic">{rec.listening ? 'Escuchando…' : 'Pulsa el micrófono y lee la frase'}</span>}
          </p>
          {rec.error && <p className="text-sm text-red-600">{rec.error}</p>}
        </div>
      )}

      {rec.supported && (
        <button
          type="button"
          onClick={() => setTyping((t) => !t)}
          className="mt-4 flex items-center gap-1.5 text-sm text-slate-500 hover:text-indigo-600"
        >
          {typing ? <Mic className="h-4 w-4" /> : <Keyboard className="h-4 w-4" />}
          {typing ? 'Usar el micrófono' : '¿No puedes hablar ahora? Escríbelo'}
        </button>
      )}
      {!rec.supported && <p className="mt-2 text-xs text-slate-400">Tu navegador no soporta reconocimiento de voz; escribe la frase.</p>}
    </ExerciseShell>
  )
}
