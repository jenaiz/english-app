import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { isCorrect, shuffle } from '../../lib/answers'
import type { ExerciseResult, ItemsContent, WordOrderItem } from '../../types'
import ExerciseShell, { ExerciseDone } from './ExerciseShell'
import { useExerciseItems } from './useExerciseItems'

interface Token {
  id: number
  word: string
}
interface Point {
  x: number
  y: number
}

const DRAG_THRESHOLD = 6
// How far outside the answer line a dragged chip still drops into it.
const DROP_MARGIN = 28

/**
 * Build the sentence by tapping words (tap again to send one back) or by dragging them into
 * place, also to reorder the words already in the sentence.
 */
export default function WordOrder({ content, onComplete }: { content: ItemsContent<WordOrderItem>; onComplete: (r: ExerciseResult) => void }) {
  const ex = useExerciseItems(content.items.length, onComplete)
  const item = content.items[Math.min(ex.index, content.items.length - 1)]

  const tokens = useMemo<Token[]>(() => {
    // Punctuation is dropped from the chips so it can't hint at the order; answers are compared
    // normalized. A final ? or ! is shown fixed at the end of the sentence instead.
    const words = [...item.answer.split(/\s+/), ...(item.distractors ?? [])].map((w) => w.replace(/[.,!?;:]+$/, ''))
    return shuffle(words.map((word, id) => ({ id, word })))
  }, [item])
  const ending = item.answer.trim().match(/[?!]$/)?.[0]
  const needed = item.answer.split(/\s+/).length
  const [picked, setPicked] = useState<number[]>([])

  const rootRef = useRef<HTMLDivElement>(null)
  const lineRef = useRef<HTMLDivElement>(null)
  const chipRefs = useRef(new Map<number, HTMLElement>())
  const drag = useRef<{ id: number; start: Point; active: boolean } | null>(null)
  const [ghost, setGhost] = useState<{ id: number; x: number; y: number } | null>(null)
  const suppressClick = useRef(false)

  // FLIP: chips glide from where they were seen to their new place (bank → sentence,
  // reordering). Visual positions are snapshotted right before each change; positions are
  // measured with running animations cancelled, so an interrupted glide never adds up.
  const pickedRef = useRef(picked)
  pickedRef.current = picked
  const before = useRef<Map<number, Point> | null>(null)
  /** Untransformed chip boxes relative to the root, for hit testing while dragging. */
  const layout = useRef(new Map<number, { x: number; y: number; w: number; h: number }>())

  const update = (next: number[]) => {
    if (next === pickedRef.current) return
    const root = rootRef.current?.getBoundingClientRect()
    if (root) {
      before.current = new Map()
      chipRefs.current.forEach((el, id) => {
        const r = el.getBoundingClientRect()
        before.current!.set(id, { x: r.left - root.left, y: r.top - root.top })
      })
    }
    setPicked(next)
  }

  useLayoutEffect(() => {
    const root = rootRef.current?.getBoundingClientRect()
    if (!root) return
    const from = before.current
    before.current = null
    layout.current = new Map()
    chipRefs.current.forEach((el, id) => {
      el.getAnimations().forEach((a) => a.cancel())
      const r = el.getBoundingClientRect()
      const p = { x: r.left - root.left, y: r.top - root.top }
      layout.current.set(id, { ...p, w: r.width, h: r.height })
      const old = from?.get(id)
      if (old && Math.abs(old.x - p.x) + Math.abs(old.y - p.y) > 1) {
        el.animate([{ transform: `translate(${old.x - p.x}px, ${old.y - p.y}px)` }, { transform: 'none' }], {
          duration: 220,
          easing: 'cubic-bezier(.2,.8,.2,1)',
        })
      }
    })
  }, [picked, ex.index])

  // Where a chip dropped at p goes among the sentence's chips (reading order, wrapping lines).
  const insertAt = (p: Point, without: number[]) => {
    const root = rootRef.current?.getBoundingClientRect()
    if (!root) return without.length
    let i = 0
    for (const id of without) {
      const r = layout.current.get(id)
      if (!r) continue
      const top = root.top + r.y
      if (p.y > top + r.h || (p.y >= top && p.x > root.left + r.x + r.w / 2)) i++
    }
    return i
  }

  useEffect(() => {
    const move = (e: PointerEvent) => {
      const d = drag.current
      if (!d) return
      if (!d.active && Math.hypot(e.clientX - d.start.x, e.clientY - d.start.y) < DRAG_THRESHOLD) return
      d.active = true
      setGhost({ id: d.id, x: e.clientX, y: e.clientY })
      const line = lineRef.current?.getBoundingClientRect()
      const inside =
        !!line &&
        e.clientX > line.left - DROP_MARGIN &&
        e.clientX < line.right + DROP_MARGIN &&
        e.clientY > line.top - DROP_MARGIN &&
        e.clientY < line.bottom + DROP_MARGIN
      const prev = pickedRef.current
      const rest = prev.filter((x) => x !== d.id)
      if (!inside) {
        if (rest.length !== prev.length) update(rest)
        return
      }
      const i = insertAt({ x: e.clientX, y: e.clientY }, rest)
      if (prev[i] !== d.id || prev.length !== rest.length + 1) update([...rest.slice(0, i), d.id, ...rest.slice(i)])
    }
    const up = () => {
      const d = drag.current
      drag.current = null
      if (!d?.active) return
      suppressClick.current = true
      setTimeout(() => (suppressClick.current = false))
      setGhost(null)
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
    window.addEventListener('pointercancel', up)
    return () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      window.removeEventListener('pointercancel', up)
    }
  }, [])

  if (ex.done) return <ExerciseDone correct={ex.correct} total={content.items.length} />

  const word = (id: number) => tokens.find((t) => t.id === id)!.word
  const built = picked.map(word).join(' ')
  const answered = ex.status !== 'answering'

  const chip = (id: number, inSentence: boolean) => {
    // The dragged chip leaves a dashed slot where it would land; the ghost follows the pointer.
    if (ghost?.id === id) {
      return (
        <span key={id} className="rounded-lg border-2 border-dashed border-indigo-300 bg-indigo-50/50 px-3 py-1.5 font-medium text-transparent select-none">
          {word(id)}
        </span>
      )
    }
    return (
      <button
        key={id}
        ref={(el) => {
          if (el) chipRefs.current.set(id, el)
          else chipRefs.current.delete(id)
        }}
        type="button"
        onClick={() => {
          if (suppressClick.current) return
          update(inSentence ? picked.filter((x) => x !== id) : [...picked, id])
        }}
        onPointerDown={(e) => {
          if (answered || e.button !== 0) return
          drag.current = { id, start: { x: e.clientX, y: e.clientY }, active: false }
        }}
        className={`touch-none rounded-lg border-2 border-b-4 bg-white px-3 py-1.5 font-medium shadow-sm transition-[color,border-color,translate] select-none hover:-translate-y-0.5 active:translate-y-0 ${
          inSentence
            ? answered
              ? ex.status === 'correct'
                ? 'border-emerald-400 text-emerald-800'
                : 'border-red-300 text-red-700'
              : 'cursor-grab border-indigo-300 text-indigo-800'
            : 'cursor-grab border-slate-200 text-slate-800'
        }`}
      >
        {word(id)}
      </button>
    )
  }

  return (
    <ExerciseShell
      instructions={content.instructions}
      index={ex.index}
      total={content.items.length}
      status={ex.status}
      isLast={ex.isLast}
      canCheck={picked.length > 0}
      onCheck={() => ex.grade(isCorrect(built, [item.answer]))}
      onNext={() => {
        setPicked([])
        ex.next()
      }}
      correctAnswer={item.answer}
      explanation={item.explanation}
      hint={item.hint}
      // Once the sentence has as many words as the answer, Enter checks it.
      focusCheckOn={picked.length === needed ? picked : undefined}
    >
      <div ref={rootRef} className="relative">
        <div
          ref={lineRef}
          className={`flex min-h-16 flex-wrap items-center gap-2 rounded-xl border-b-2 border-dashed px-1 pb-3 transition-colors ${
            ghost ? 'border-indigo-400 bg-indigo-50/40' : 'border-slate-300'
          }`}
        >
          {picked.length === 0 && <span className="text-slate-400">Toca o arrastra las palabras en orden…</span>}
          {picked.map((id) => chip(id, true))}
          {ending && (
            <span className="ml-0.5 text-2xl leading-none font-bold text-indigo-400" title={ending === '?' ? 'Es una pregunta' : undefined}>
              {ending}
            </span>
          )}
        </div>
        <div className="mt-5 flex flex-wrap gap-2">
          {tokens.map((t) =>
            picked.includes(t.id) ? (
              <span key={t.id} className="rounded-lg border-2 border-dashed border-slate-200 px-3 py-1.5 text-transparent select-none">
                {t.word}
              </span>
            ) : (
              chip(t.id, false)
            ),
          )}
        </div>
      </div>

      {ghost && (
        <span
          className="word-ghost pointer-events-none fixed z-50 rounded-lg border-2 border-b-4 border-indigo-400 bg-white px-3 py-1.5 font-medium text-indigo-800"
          style={{ left: ghost.x, top: ghost.y }}
        >
          {word(ghost.id)}
        </span>
      )}
    </ExerciseShell>
  )
}
