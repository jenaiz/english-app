import { useEffect, useRef, useState } from 'react'
import { Timer, Zap } from 'lucide-react'
import type { ExerciseResult, ItemOutcome, SpeedQuizContent } from '../../types'
import { ExerciseDone } from './ExerciseShell'
import { InlineText } from '../RichText'

/** Timed multiple choice: one global countdown, instant feedback, auto-advance. Unanswered items count as wrong. */
export default function SpeedQuiz({ content, onComplete }: { content: SpeedQuizContent; onComplete: (r: ExerciseResult) => void }) {
  const total = content.items.length
  const limit = content.time_limit_seconds
  const [started, setStarted] = useState(false)
  const [index, setIndex] = useState(0)
  const [left, setLeft] = useState(limit)
  const [picked, setPicked] = useState<number | null>(null)
  const [result, setResult] = useState<ExerciseResult | null>(null)
  const correctRef = useRef(0)
  const itemsRef = useRef<ItemOutcome[]>([])
  // Keys 1-9 answer, like a tap. Set during render once the question is known.
  const chooseRef = useRef<((i: number) => void) | null>(null)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return
      const n = Number(e.key)
      if (n >= 1) chooseRef.current?.(n - 1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])
  chooseRef.current = null

  const finish = () => {
    if (result) return
    // Items the clock ran out on count as wrong but are marked, so they are not taken for mistakes.
    const items = [...itemsRef.current]
    for (let i = items.length; i < total; i++) items.push({ i, ok: false, timeout: true })
    const r = { correct: correctRef.current, total, items }
    setResult(r)
    onComplete(r)
  }

  useEffect(() => {
    if (!started || result) return
    if (left <= 0) {
      finish()
      return
    }
    const t = setTimeout(() => setLeft((s) => s - 1), 1000)
    return () => clearTimeout(t)
  }, [started, left, result])

  if (result) {
    return (
      <div>
        <ExerciseDone correct={result.correct} total={total} />
        {left <= 0 && <p className="-mt-2 text-center text-sm text-amber-600">¡Se acabó el tiempo!</p>}
      </div>
    )
  }

  if (!started) {
    return (
      <div className="flex flex-col items-center py-6 text-center">
        <div className="grid h-16 w-16 place-items-center rounded-full bg-amber-100 text-amber-600">
          <Zap className="h-8 w-8" />
        </div>
        <p className="mt-4 text-lg font-bold text-slate-900"><InlineText text={content.instructions ?? 'Quiz de velocidad'} /></p>
        <p className="mt-1 text-slate-500">
          {total} preguntas · {limit} segundos
        </p>
        <button onClick={() => setStarted(true)} className="mt-6 rounded-xl bg-amber-500 px-8 py-3 font-bold text-white shadow-sm hover:bg-amber-600">
          ¡Empezar!
        </button>
      </div>
    )
  }

  const item = content.items[index]
  const choose = (i: number) => {
    if (picked !== null) return
    setPicked(i)
    if (i === item.answer) correctRef.current += 1
    itemsRef.current.push({ i: index, ok: i === item.answer, answer: item.options[i] })
    setTimeout(() => {
      setPicked(null)
      if (index + 1 >= total) finish()
      else setIndex(index + 1)
    }, 700)
  }
  chooseRef.current = (i) => i < item.options.length && choose(i)
  const pct = (left / limit) * 100

  return (
    <div>
      <div className="mb-5 flex items-center gap-3">
        <Timer className={`h-5 w-5 ${left <= 5 ? 'text-red-500' : 'text-amber-500'}`} />
        <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-slate-100">
          <div
            className={`h-full rounded-full transition-all duration-1000 ease-linear ${left <= 5 ? 'bg-red-500' : 'bg-amber-400'}`}
            style={{ width: `${pct}%` }}
          />
        </div>
        <span className="w-8 text-right font-bold text-slate-700 tabular-nums">{left}s</span>
      </div>
      <p className="text-xs font-semibold text-slate-400">
        {index + 1} / {total}
      </p>
      <p className="mt-1 mb-4 text-lg font-semibold text-slate-900">{item.question}</p>
      <div className="grid gap-2 sm:grid-cols-2">
        {item.options.map((opt, i) => (
          <button
            key={opt}
            onClick={() => choose(i)}
            className={`flex items-center gap-3 rounded-xl border-2 px-4 py-3 text-left font-medium transition ${
              picked === null
                ? 'border-slate-200 hover:border-amber-400 hover:bg-amber-50'
                : i === item.answer
                  ? 'border-emerald-500 bg-emerald-50 text-emerald-800'
                  : i === picked
                    ? 'border-red-400 bg-red-50 text-red-700'
                    : 'border-slate-200 opacity-50'
            }`}
          >
            <kbd className="hidden h-6 w-6 shrink-0 place-items-center rounded-md border border-current/25 font-sans text-xs opacity-60 sm:grid">{i + 1}</kbd>
            {opt}
          </button>
        ))}
      </div>
    </div>
  )
}
