import { Fragment, useEffect, useMemo, useRef, useState } from 'react'
import { CheckCircle2, Gauge, ListChecks, Mic2, RotateCcw, SkipBack } from 'lucide-react'
import { isCorrect, shuffle } from '../../lib/answers'
import { activeLine, useYouTubePlayer } from '../../lib/useYouTubePlayer'
import type { Activity, ExerciseResult, SongContent } from '../../types'
import MultipleChoice from '../exercises/MultipleChoice'
import Attribution from './Attribution'
import VideoFrame from './VideoFrame'
import { buttonClass } from '../ui/Button'

interface Props {
  activity: Activity
  content: SongContent
  onFinish: (r: ExerciseResult) => void
}

interface Blank {
  line: number
  /** Position of the blank within its line. */
  slot: number
  answers: string[]
}

// Levels where blanks are filled from a word bank instead of typed.
const BANK_LEVELS = new Set(['A1', 'A2'])

/**
 * A song fragment with the lyrics below the video: the line being sung lights up, and the
 * missing words are typed (or picked from a word bank at lower levels) while listening.
 */
export default function SongPlayer({ activity, content, onFinish }: Props) {
  const bank = (content.mode ?? (BANK_LEVELS.has(activity.level) ? 'bank' : 'type')) === 'bank'
  const blanks = useMemo(() => {
    const out: Blank[] = []
    content.lines.forEach((l, line) => (l.answers ?? []).forEach((answers, slot) => out.push({ line, slot, answers })))
    return out
  }, [content.lines])
  // One chip per blank (plus the distractors), so a word that fills two blanks appears twice.
  const chips = useMemo(
    () => shuffle([...blanks.map((b) => b.answers[0]), ...(content.distractors ?? [])].map((word, id) => ({ id, word }))),
    [blanks, content.distractors],
  )

  const [values, setValues] = useState<string[]>(() => blanks.map(() => ''))
  // Bank mode: the chip placed in each blank, and the blank that the next chip goes to.
  const [placed, setPlaced] = useState<(number | null)[]>(() => blanks.map(() => null))
  const [focus, setFocus] = useState(0)
  const [checked, setChecked] = useState(false)
  // Questions about the lyrics, once the blanks are checked.
  const questions = content.questions ?? []
  const [asking, setAsking] = useState(false)
  const questionsRef = useRef<HTMLElement>(null)
  useEffect(() => {
    if (asking)
      questionsRef.current?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      })
  }, [asking])
  const [now, setNow] = useState(-1)
  const [slow, setSlow] = useState(false)
  const lineRefs = useRef<(HTMLLIElement | null)[]>([])
  const stoppedAtEnd = useRef(false)

  // Where the fragment starts: a few seconds before its first line, unless the activity says.
  const fragmentStart = content.start ?? Math.max(0, content.lines[0].t - 3)
  const player = useYouTubePlayer({
    videoId: activity.youtube_id!,
    start: fragmentStart,
    onTime: (t) => {
      setNow(t)
      // Stop once at the end of the fragment; playing on is the learner's choice.
      if (t >= content.end && !stoppedAtEnd.current) {
        stoppedAtEnd.current = true
        player.pause()
      }
    },
  })
  const current = activeLine(content.lines, now)

  // Follow the song, unless the learner is typing (moving the page would get in the way).
  useEffect(() => {
    if (current < 0 || !player.playing) return
    if (document.activeElement instanceof HTMLInputElement) return
    lineRefs.current[current]?.scrollIntoView({
      behavior: 'smooth',
      block: 'center',
    })
  }, [current, player.playing])

  // Play the whole fragment again; before the video is loaded, loading it already starts there.
  const replayFragment = () => {
    stoppedAtEnd.current = false
    if (player.requested) player.seek(fragmentStart)
    else player.load()
  }

  const replay = (line: number) => {
    stoppedAtEnd.current = false
    player.seek(Math.max(0, content.lines[line].t - 0.4))
  }

  const toggleSlow = () => {
    player.setRate(slow ? 1 : 0.75)
    setSlow(!slow)
  }

  const blankIndex = (line: number, slot: number) => blanks.findIndex((b) => b.line === line && b.slot === slot)
  const valueOf = (i: number) => (bank ? (placed[i] !== null ? chips.find((c) => c.id === placed[i])!.word : '') : values[i])
  const ok = (i: number) => isCorrect(valueOf(i), blanks[i].answers)
  const filled = blanks.every((_, i) => valueOf(i).trim() !== '')
  const used = new Set(placed.filter((p): p is number => p !== null))

  const placeChip = (chipId: number) => {
    const target = placed[focus] === null ? focus : placed.findIndex((p) => p === null)
    if (target < 0) return
    const next = Object.assign([...placed], { [target]: chipId })
    setPlaced(next)
    const after = next.findIndex((p, i) => p === null && i > target)
    setFocus(
      after >= 0
        ? after
        : Math.max(
            0,
            next.findIndex((p) => p === null),
          ),
    )
  }
  const clearBlank = (i: number) => {
    setPlaced(Object.assign([...placed], { [i]: null }))
    setFocus(i)
  }

  const correct = blanks.filter((_, i) => ok(i)).length

  const renderLine = (text: string, line: number) =>
    text.split('___').map((part, slot, parts) => {
      if (slot === parts.length - 1) return <Fragment key={slot}>{part}</Fragment>
      const i = blankIndex(line, slot)
      const state = checked ? (ok(i) ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-red-400 bg-red-50 text-red-600') : ''
      const width = `${Math.max(5, ...blanks[i].answers.map((a) => a.length)) + 2}ch`
      return (
        <Fragment key={slot}>
          {part}
          {bank ? (
            <button
              type="button"
              disabled={checked}
              onClick={() => (placed[i] !== null ? clearBlank(i) : setFocus(i))}
              style={{ minWidth: width }}
              className={`mx-1 inline-block rounded-md border-b-2 px-2 py-0.5 text-center font-semibold transition ${
                state || (focus === i && placed[i] === null ? 'border-rose-500 bg-rose-100' : 'border-slate-300 bg-white/70 hover:bg-white')
              }`}
              aria-label={placed[i] !== null ? `Quitar ${valueOf(i)}` : 'Hueco: elige una palabra'}
            >
              {valueOf(i) || ' '}
            </button>
          ) : (
            <input
              autoCapitalize="off"
              autoComplete="off"
              spellCheck={false}
              disabled={checked}
              value={values[i]}
              onChange={(e) => setValues(Object.assign([...values], { [i]: e.target.value }))}
              style={{ width }}
              aria-label="Palabra que falta"
              className={`mx-1 rounded-md border-b-2 bg-white/70 px-2 py-0.5 text-center font-semibold outline-none focus:border-rose-500 ${state || 'border-slate-300'}`}
            />
          )}
          {checked && !ok(i) && <span className="text-sm font-semibold text-emerald-700">({blanks[i].answers[0]})</span>}
        </Fragment>
      )
    })

  return (
    <div>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-start">
        <div className="lg:sticky lg:top-24">
          <VideoFrame player={player} videoId={activity.youtube_id!} label={activity.title} />
          <Attribution
            kind="Canción"
            title={activity.title}
            author={content.artist ?? activity.subtitle}
            source={`Vídeo oficial de ${content.channel} en YouTube`}
            href={`https://www.youtube.com/watch?v=${encodeURIComponent(activity.youtube_id!)}`}
          />
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={replayFragment}
              disabled={player.requested && !player.ready}
              className="flex items-center gap-1.5 rounded-lg bg-rose-600 px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-rose-700 disabled:opacity-40"
            >
              <SkipBack className="h-4 w-4" /> Desde el principio
            </button>
            <button
              type="button"
              onClick={() => replay(Math.max(0, current))}
              disabled={!player.ready}
              className="flex items-center gap-1.5 rounded-lg bg-white px-3 py-2 text-sm font-semibold text-slate-700 ring-1 ring-slate-200 transition hover:bg-slate-50 disabled:opacity-40"
            >
              <RotateCcw className="h-4 w-4" /> Repetir línea
            </button>
            <button
              type="button"
              onClick={toggleSlow}
              disabled={!player.ready}
              aria-pressed={slow}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold ring-1 transition disabled:opacity-40 ${
                slow ? 'bg-rose-600 text-white ring-rose-600' : 'bg-white text-slate-700 ring-slate-200 hover:bg-slate-50'
              }`}
            >
              <Gauge className="h-4 w-4" /> {slow ? '0,75×' : 'Velocidad 1×'}
            </button>
          </div>
          <p className="mt-3 text-sm text-slate-500">
            {bank ? 'Toca un hueco y luego la palabra que falta.' : 'Escribe las palabras que faltan mientras escuchas.'} Toca el número de una línea para
            volver a oírla.
          </p>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm md:p-6">
          {checked && (
            <p className="mb-4 flex items-center gap-2 rounded-xl bg-rose-50 p-3 text-sm font-medium text-rose-800">
              <Mic2 className="h-4 w-4 shrink-0" /> Ahora que tienes la letra completa, pulsa «Desde el principio» y ¡canta!
            </p>
          )}
          <ol className="space-y-1">
            {content.lines.map((l, line) => (
              <li
                key={line}
                ref={(el) => {
                  lineRefs.current[line] = el
                }}
                className={`flex items-baseline gap-3 rounded-xl px-2 py-2 transition ${line === current ? 'scale-[1.02] bg-rose-50' : ''}`}
              >
                <button
                  type="button"
                  onClick={() => replay(line)}
                  disabled={!player.ready}
                  aria-label={`Escuchar la línea ${line + 1}`}
                  className="w-6 shrink-0 text-right text-xs font-semibold text-slate-300 tabular-nums transition hover:text-rose-600 disabled:hover:text-slate-300"
                >
                  {line + 1}
                </button>
                <span className={`text-lg leading-loose ${line === current ? 'font-medium text-slate-900' : 'text-slate-600'}`}>
                  {renderLine(l.text, line)}
                </span>
              </li>
            ))}
          </ol>

          {bank && !checked && (
            <div className="sticky bottom-3 mt-5 flex flex-wrap gap-2 rounded-2xl bg-slate-50/95 p-3 ring-1 ring-slate-200 backdrop-blur">
              {chips.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  disabled={used.has(c.id)}
                  onClick={() => placeChip(c.id)}
                  className="rounded-lg bg-white px-3 py-1.5 font-semibold text-slate-800 shadow-sm ring-1 ring-slate-200 transition hover:ring-rose-400 disabled:opacity-25 disabled:shadow-none"
                >
                  {c.word}
                </button>
              ))}
            </div>
          )}

          <div className="mt-5 flex items-center justify-end gap-3">
            {checked ? (
              <>
                <span className="mr-auto flex items-center gap-1.5 text-sm font-semibold text-slate-600">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" /> {correct} / {blanks.length}
                </span>
                {questions.length > 0 ? (
                  !asking && (
                    <button
                      type="button"
                      onClick={() => setAsking(true)}
                      className={buttonClass()}
                    >
                      <ListChecks className="h-4 w-4" /> Preguntas sobre la letra
                    </button>
                  )
                ) : (
                  <button
                    type="button"
                    onClick={() => onFinish({ correct, total: blanks.length })}
                    className={buttonClass()}
                  >
                    Ver resultado
                  </button>
                )}
              </>
            ) : (
              <button
                type="button"
                onClick={() => setChecked(true)}
                disabled={!filled}
                className="rounded-lg bg-rose-600 px-5 py-2.5 font-semibold text-white shadow-sm transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Comprobar
              </button>
            )}
          </div>
        </div>
      </div>

      {asking && (
        <section ref={questionsRef} className="mx-auto mt-6 max-w-2xl scroll-mt-24 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm md:p-8">
          <h2 className="mb-4 flex items-center gap-2 font-display text-xl font-bold text-slate-900">
            <ListChecks className="h-5 w-5 text-indigo-600" /> ¿Has entendido la letra?
          </h2>
          <MultipleChoice
            content={{
              instructions: 'Puedes volver a escucharla si lo necesitas.',
              items: questions,
            }}
            onComplete={(r) =>
              onFinish({
                correct: correct + r.correct,
                total: blanks.length + r.total,
              })
            }
          />
        </section>
      )}
    </div>
  )
}
