import { useMemo, useState } from 'react'
import { CheckCircle2 } from 'lucide-react'
import { shuffle } from '../../lib/answers'
import type { ExerciseResult, MatchPairsContent } from '../../types'
import { ExerciseDone } from './ExerciseShell'

/** Tap a term on the left, then its match on the right. A pair counts as correct if matched without mistakes. */
export default function MatchPairs({ content, onComplete }: { content: MatchPairsContent; onComplete: (r: ExerciseResult) => void }) {
  const lefts = useMemo(() => shuffle(content.pairs.map((p) => p.left)), [content])
  const rights = useMemo(() => shuffle(content.pairs.map((p) => p.right)), [content])
  const [selLeft, setSelLeft] = useState<string | null>(null)
  const [matched, setMatched] = useState<Set<string>>(new Set())
  const [missed, setMissed] = useState<Set<string>>(new Set())
  const [flash, setFlash] = useState<string | null>(null)
  const [done, setDone] = useState(false)
  const total = content.pairs.length

  const pick = (right: string) => {
    if (!selLeft) return
    const pair = content.pairs.find((p) => p.left === selLeft)!
    if (pair.right === right) {
      const m = new Set(matched).add(selLeft)
      setMatched(m)
      setSelLeft(null)
      if (m.size === total) {
        setDone(true)
        onComplete({ correct: total - missed.size, total })
      }
    } else {
      setMissed((s) => new Set(s).add(selLeft))
      setFlash(right)
      setTimeout(() => setFlash(null), 500)
    }
  }

  if (done) return <ExerciseDone correct={total - missed.size} total={total} />
  const matchedRights = new Set(content.pairs.filter((p) => matched.has(p.left)).map((p) => p.right))

  const cls = (state: 'matched' | 'selected' | 'wrong' | 'idle') =>
    `flex min-h-12 w-full items-center justify-between gap-2 rounded-xl border-2 px-4 py-2.5 text-left font-medium transition ${
      {
        matched: 'border-emerald-300 bg-emerald-50 text-emerald-700 opacity-70',
        selected: 'border-indigo-500 bg-indigo-50 text-indigo-800',
        wrong: 'animate-pulse border-red-400 bg-red-50 text-red-700',
        idle: 'border-slate-200 hover:border-indigo-300 hover:bg-slate-50',
      }[state]
    }`

  return (
    <div>
      {content.instructions && <p className="mb-5 font-medium text-slate-700">{content.instructions}</p>}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          {lefts.map((l) => (
            <button key={l} type="button" disabled={matched.has(l)} onClick={() => setSelLeft(l)} className={cls(matched.has(l) ? 'matched' : selLeft === l ? 'selected' : 'idle')}>
              {l}
              {matched.has(l) && <CheckCircle2 className="h-4 w-4 shrink-0" />}
            </button>
          ))}
        </div>
        <div className="space-y-2">
          {rights.map((r) => (
            <button
              key={r}
              type="button"
              disabled={matchedRights.has(r) || !selLeft}
              onClick={() => pick(r)}
              className={cls(matchedRights.has(r) ? 'matched' : flash === r ? 'wrong' : 'idle') + (selLeft ? '' : ' cursor-default')}
            >
              {r}
            </button>
          ))}
        </div>
      </div>
      <p className="mt-4 text-center text-sm text-slate-400">
        {matched.size} / {total} parejas{!selLeft && matched.size < total ? ' · elige una palabra de la izquierda' : ''}
      </p>
    </div>
  )
}
