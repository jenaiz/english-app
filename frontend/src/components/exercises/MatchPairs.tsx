import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { shuffle } from '../../lib/answers'
import type { ExerciseResult, MatchPairsContent } from '../../types'
import { InlineText } from '../RichText'
import { ExerciseDone } from './ExerciseShell'

type Side = 'L' | 'R'
interface Pick {
  side: Side
  value: string
}
interface Point {
  x: number
  y: number
}

// One color per matched pair, in matching order: the line and both cards share it. Indigo is
// left out: it marks the card being selected.
const COLORS = [
  { stroke: '#10b981', card: 'border-emerald-400 bg-emerald-50 text-emerald-800' },
  { stroke: '#f59e0b', card: 'border-amber-400 bg-amber-50 text-amber-800' },
  { stroke: '#f43f5e', card: 'border-rose-400 bg-rose-50 text-rose-800' },
  { stroke: '#0ea5e9', card: 'border-sky-400 bg-sky-50 text-sky-800' },
  { stroke: '#8b5cf6', card: 'border-violet-400 bg-violet-50 text-violet-800' },
  { stroke: '#14b8a6', card: 'border-teal-400 bg-teal-50 text-teal-800' },
  { stroke: '#d946ef', card: 'border-fuchsia-400 bg-fuchsia-50 text-fuchsia-800' },
]

const key = (p: Pick) => `${p.side}:${p.value}`
const DRAG_THRESHOLD = 6

/** S-curve between two anchors, leaving and entering each card horizontally. */
function curve(a: Point, b: Point) {
  const mid = (b.x - a.x) / 2
  return `M ${a.x} ${a.y} C ${a.x + mid} ${a.y}, ${b.x - mid} ${b.y}, ${b.x} ${b.y}`
}

/**
 * Join each term on the left with its match on the right: tap one card on each side (either
 * side first) or drag from one to the other. Matches are drawn as colored lines between the
 * columns. A pair counts as correct if it was matched without mistakes.
 */
export default function MatchPairs({ content, onComplete }: { content: MatchPairsContent; onComplete: (r: ExerciseResult) => void }) {
  const lefts = useMemo(() => shuffle(content.pairs.map((p) => p.left)), [content])
  const rights = useMemo(() => shuffle(content.pairs.map((p) => p.right)), [content])
  const total = content.pairs.length

  const [sel, setSel] = useState<Pick | null>(null)
  /** Lefts in the order they were matched (the index picks the color). */
  const [matched, setMatched] = useState<string[]>([])
  const [missed, setMissed] = useState<Set<string>>(new Set())
  const [wrong, setWrong] = useState<{ from: Pick; to: Pick; id: number } | null>(null)
  const [pointer, setPointer] = useState<Point | null>(null)
  const [done, setDone] = useState(false)

  const boxRef = useRef<HTMLDivElement>(null)
  const cardRefs = useRef(new Map<string, HTMLButtonElement>())
  const [anchors, setAnchors] = useState<Record<string, Point>>({})
  const drag = useRef<{ from: Pick; start: Point; active: boolean } | null>(null)
  const suppressClick = useRef(false)

  const rightOf = (left: string) => content.pairs.find((p) => p.left === left)!.right
  const leftOf = (right: string) => content.pairs.find((p) => p.right === right)!.left

  // Where lines attach: the inner edge of each card, relative to the board.
  const measure = useCallback(() => {
    const box = boxRef.current?.getBoundingClientRect()
    if (!box) return
    const next: Record<string, Point> = {}
    cardRefs.current.forEach((el, k) => {
      const r = el.getBoundingClientRect()
      next[k] = { x: (k.startsWith('L:') ? r.right : r.left) - box.left, y: r.top + r.height / 2 - box.top }
    })
    setAnchors(next)
  }, [])
  useLayoutEffect(measure, [measure])
  useEffect(() => {
    const ro = new ResizeObserver(measure)
    if (boxRef.current) ro.observe(boxRef.current)
    return () => ro.disconnect()
  }, [measure])

  const toLocal = (x: number, y: number): Point | null => {
    const box = boxRef.current?.getBoundingClientRect()
    return box ? { x: x - box.left, y: y - box.top } : null
  }

  const attempt = (from: Pick, to: Pick) => {
    const left = from.side === 'L' ? from.value : to.value
    const right = from.side === 'L' ? to.value : from.value
    if (rightOf(left) === right) {
      const m = [...matched, left]
      setMatched(m)
      setSel(null)
      setWrong(null)
      if (m.length === total) {
        setDone(true)
        onComplete({ correct: total - missed.size, total, items: content.pairs.map((p, i) => ({ i, ok: !missed.has(p.left) })) })
      }
      return
    }
    // The pair the learner was trying to complete is the one that counts as missed.
    setMissed((s) => new Set(s).add(from.side === 'L' ? from.value : leftOf(from.value)))
    const id = Date.now()
    setWrong({ from, to, id })
    setTimeout(() => setWrong((w) => (w?.id === id ? null : w)), 700)
  }

  const tap = (p: Pick) => {
    if (suppressClick.current) return
    if (!sel || sel.side === p.side) setSel(sel && key(sel) === key(p) ? null : p)
    else attempt(sel, p)
  }

  // Dragging: listen on the window so the drag survives leaving the card.
  useEffect(() => {
    const move = (e: PointerEvent) => {
      const d = drag.current
      if (d && !d.active && Math.hypot(e.clientX - d.start.x, e.clientY - d.start.y) > DRAG_THRESHOLD) {
        d.active = true
        setSel(d.from)
      }
      if (d?.active) setPointer(toLocal(e.clientX, e.clientY))
    }
    const up = (e: PointerEvent) => {
      const d = drag.current
      drag.current = null
      if (!d?.active) return
      // The click that may follow this pointerup belongs to the drag, not to a tap.
      suppressClick.current = true
      setTimeout(() => (suppressClick.current = false))
      setPointer(null)
      const target = document.elementFromPoint(e.clientX, e.clientY)?.closest<HTMLElement>('[data-match]')
      const side = target?.dataset.side as Side | undefined
      if (target && side && side !== d.from.side && !target.hasAttribute('disabled')) attempt(d.from, { side, value: target.dataset.match! })
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
    window.addEventListener('pointercancel', up)
    return () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      window.removeEventListener('pointercancel', up)
    }
  })

  const matchedRights = matched.map(rightOf)
  const colorOf = (p: Pick) => {
    const i = p.side === 'L' ? matched.indexOf(p.value) : matchedRights.indexOf(p.value)
    return i < 0 ? null : COLORS[i % COLORS.length]
  }

  // The line being drawn: from the selected card to the pointer, snapping to a card under it.
  const hovered = pointer && sel ? cardAt(pointer, sel.side === 'L' ? 'R' : 'L') : null
  function cardAt(p: Point, side: Side) {
    const box = boxRef.current?.getBoundingClientRect()
    if (!box) return null
    const el = document.elementFromPoint(p.x + box.left, p.y + box.top)?.closest<HTMLElement>('[data-match]')
    return el && el.dataset.side === side && !el.hasAttribute('disabled') ? `${side}:${el.dataset.match}` : null
  }
  const pendingEnd = hovered ? anchors[hovered] : pointer
  const selAnchor = sel ? anchors[key(sel)] : null

  const card = (p: Pick, i: number) => {
    const k = key(p)
    const color = colorOf(p)
    const isSel = sel && key(sel) === k
    const isWrong = wrong && key(wrong.to) === k
    const isTarget = hovered === k
    return (
      <button
        key={k}
        ref={(el) => {
          if (el) cardRefs.current.set(k, el)
          else cardRefs.current.delete(k)
        }}
        type="button"
        data-match={p.value}
        data-side={p.side}
        disabled={!!color || done}
        onClick={() => tap(p)}
        onPointerDown={(e: ReactPointerEvent) => {
          if (color || e.button !== 0) return
          drag.current = { from: p, start: { x: e.clientX, y: e.clientY }, active: false }
        }}
        style={done ? { animationDelay: `${i * 70}ms` } : undefined}
        className={`relative flex min-h-12 w-full touch-none items-center rounded-xl border-2 px-3 py-2.5 text-left font-medium transition select-none sm:px-4 ${
          p.side === 'R' ? 'justify-end text-right' : ''
        } ${
          color
            ? `${color.card} ${done ? 'animate-[match-pop_0.4s_ease-out_both]' : 'animate-[match-pop_0.35s_ease-out]'}`
            : isWrong
              ? 'animate-[shake_0.15s_ease-in-out_3] border-red-400 bg-red-50 text-red-700'
              : isSel
                ? 'border-indigo-500 bg-indigo-50 text-indigo-800 shadow-md shadow-indigo-100'
                : isTarget
                  ? 'border-indigo-400 bg-indigo-50/60'
                  : `border-slate-200 bg-white hover:border-indigo-300 ${sel && sel.side !== p.side ? 'hover:bg-indigo-50/60' : 'hover:bg-slate-50'}`
        }`}
      >
        {p.value}
      </button>
    )
  }

  return (
    <div>
      {content.instructions && <p className="mb-5 font-medium text-slate-700"><InlineText text={content.instructions} /></p>}

      <div
        ref={boxRef}
        className="relative grid grid-cols-2 gap-x-10 gap-y-2.5 sm:gap-x-24"
        onPointerMove={(e) => sel && !drag.current && e.pointerType === 'mouse' && setPointer(toLocal(e.clientX, e.clientY))}
        onPointerLeave={() => !drag.current && setPointer(null)}
      >
        <div className="space-y-2.5">{lefts.map((value, i) => card({ side: 'L', value }, i))}</div>
        <div className="space-y-2.5">{rights.map((value, i) => card({ side: 'R', value }, i))}</div>

        <svg className="pointer-events-none absolute inset-0 h-full w-full overflow-visible" aria-hidden>
          {matched.map((left, i) => {
            const a = anchors[`L:${left}`]
            const b = anchors[`R:${rightOf(left)}`]
            if (!a || !b) return null
            const stroke = COLORS[i % COLORS.length].stroke
            return (
              <g key={left}>
                <path d={curve(a, b)} pathLength={1} fill="none" stroke={stroke} strokeWidth={3} strokeLinecap="round" className="match-line-draw" />
                <circle cx={a.x} cy={a.y} r={5} fill={stroke} />
                <circle cx={b.x} cy={b.y} r={5} fill={stroke} />
              </g>
            )
          })}
          {wrong && anchors[key(wrong.from)] && anchors[key(wrong.to)] && (
            <path
              key={wrong.id}
              d={curve(anchors[key(wrong.from)], anchors[key(wrong.to)])}
              pathLength={1}
              fill="none"
              stroke="#ef4444"
              strokeWidth={3}
              strokeLinecap="round"
              className="match-line-wrong"
            />
          )}
          {selAnchor && pendingEnd && !wrong && (
            <g>
              <path d={curve(selAnchor, pendingEnd)} fill="none" stroke="#6366f1" strokeWidth={2.5} strokeDasharray="6 6" strokeLinecap="round" className="match-line-pending" />
              <circle cx={selAnchor.x} cy={selAnchor.y} r={5} fill="#6366f1" />
              <circle cx={pendingEnd.x} cy={pendingEnd.y} r={hovered ? 6 : 4} fill={hovered ? '#6366f1' : 'white'} stroke="#6366f1" strokeWidth={2} />
            </g>
          )}
          {selAnchor && !pendingEnd && <circle cx={selAnchor.x} cy={selAnchor.y} r={5} fill="#6366f1" className="animate-pulse" />}
        </svg>
      </div>

      {done ? (
        <ExerciseDone correct={total - missed.size} total={total} />
      ) : (
        <p className="mt-5 text-center text-sm text-slate-400">
          {matched.length} / {total} parejas · {sel ? 'ahora elige su pareja en la otra columna' : 'toca o arrastra para unir'}
        </p>
      )}
    </div>
  )
}
