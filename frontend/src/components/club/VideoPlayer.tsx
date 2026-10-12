import { useEffect, useRef, useState } from 'react'
import { CheckCircle2, Eye, EyeOff, ListChecks, Pause } from 'lucide-react'
import { activeLine, useYouTubePlayer } from '../../lib/useYouTubePlayer'
import type { Activity, ExerciseResult, VideoContent } from '../../types'
import MultipleChoice from '../exercises/MultipleChoice'
import VideoFrame from './VideoFrame'

interface Props {
  activity: Activity
  content: VideoContent
  onFinish: (r: ExerciseResult) => void
}

const clock = (t: number) => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`

/**
 * A talk or video with its transcript beside it (tap a line to jump there). At each
 * checkpoint the video pauses and asks about what has been said so far.
 */
export default function VideoPlayer({ activity, content, onFinish }: Props) {
  const [now, setNow] = useState(-1)
  const [hidden, setHidden] = useState(false)
  // Checkpoints answered so far, and the one being asked (if any).
  const [answered, setAnswered] = useState(0)
  const [asking, setAsking] = useState(false)
  const [score, setScore] = useState<ExerciseResult>({ correct: 0, total: 0 })
  const lineRefs = useRef<(HTMLLIElement | null)[]>([])
  const listRef = useRef<HTMLOListElement>(null)
  const questionsRef = useRef<HTMLElement>(null)

  const next = content.checkpoints[answered]
  const done = answered >= content.checkpoints.length

  const player = useYouTubePlayer({
    videoId: activity.youtube_id!,
    start: content.start,
    onTime: (t) => {
      setNow(t)
      if (next && !asking && t >= next.t) {
        player.pause()
        setAsking(true)
      }
    },
  })
  const current = activeLine(content.transcript, now)

  // Keep the current line in view inside the transcript, without moving the page.
  useEffect(() => {
    const list = listRef.current
    const el = lineRefs.current[current]
    if (!list || !el) return
    list.scrollTo({ top: el.offsetTop - list.clientHeight / 2 + el.clientHeight / 2, behavior: 'smooth' })
  }, [current])

  useEffect(() => {
    if (asking) questionsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, [asking])

  const checkpointDone = (r: ExerciseResult) => {
    setScore((s) => ({ correct: s.correct + r.correct, total: s.total + r.total }))
    setAsking(false)
    setAnswered((n) => n + 1)
    if (player.ready) player.play()
  }

  return (
    <div>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <div>
          <VideoFrame player={player} videoId={activity.youtube_id!} label={activity.title} />
          <p className="mt-2 text-xs text-slate-400">
            {content.speaker && <>{content.speaker} · </>}
            {content.license} ·{' '}
            <a href={content.source_url} target="_blank" rel="noopener noreferrer" className="underline hover:text-slate-600">
              Fuente
            </a>
          </p>

          <div className="mt-4 flex flex-wrap gap-2">
            {content.checkpoints.map((cp, i) => (
              <span
                key={i}
                className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${
                  i < answered ? 'bg-emerald-100 text-emerald-700' : i === answered ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-500'
                }`}
              >
                {i < answered ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Pause className="h-3.5 w-3.5" />} Pausa {i + 1} · {clock(cp.t)}
              </span>
            ))}
          </div>
        </div>

        <div className="flex min-h-0 flex-col rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <h2 className="font-semibold text-slate-800">Transcripción</h2>
            <button
              type="button"
              onClick={() => setHidden(!hidden)}
              className="flex items-center gap-1.5 rounded-lg px-2 py-1 text-sm font-medium text-slate-500 hover:bg-slate-100"
            >
              {hidden ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />} {hidden ? 'Mostrar' : 'Modo reto: ocultar'}
            </button>
          </div>
          {hidden ? (
            <p className="p-6 text-center text-sm text-slate-500">Escucha sin leer. Puedes mostrar la transcripción cuando quieras.</p>
          ) : (
            <ol ref={listRef} className="relative max-h-[28rem] space-y-0.5 overflow-y-auto p-2">
              {content.transcript.map((l, i) => (
                <li
                  key={i}
                  ref={(el) => {
                    lineRefs.current[i] = el
                  }}
                >
                  <button
                    type="button"
                    onClick={() => (player.ready ? player.seek(l.t) : undefined)}
                    className={`flex w-full gap-3 rounded-lg px-2 py-1.5 text-left transition ${
                      i === current ? 'bg-indigo-50 text-slate-900' : 'text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <span className="w-10 shrink-0 pt-0.5 text-xs text-slate-400 tabular-nums">{clock(l.t)}</span>
                    <span className="leading-relaxed">{l.text}</span>
                  </button>
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>

      {asking && next && (
        <section ref={questionsRef} className="mx-auto mt-6 max-w-2xl rounded-3xl border-2 border-indigo-200 bg-white p-5 shadow-lg md:p-8">
          <h2 className="mb-4 flex items-center gap-2 font-display text-xl font-bold text-slate-900">
            <ListChecks className="h-5 w-5 text-indigo-600" /> Pausa {answered + 1} de {content.checkpoints.length}
          </h2>
          <MultipleChoice key={answered} content={{ instructions: 'Sobre lo que has visto hasta ahora:', items: next.questions }} onComplete={checkpointDone} />
        </section>
      )}

      <div className="mt-6 flex flex-wrap items-center justify-end gap-3">
        {!asking && next && (
          <button type="button" onClick={() => setAsking(true)} className="mr-auto text-sm text-slate-500 underline hover:text-slate-700">
            ¿No puedes ver el vídeo? Lee la transcripción y responde ya
          </button>
        )}
        {done && (
          <button
            type="button"
            onClick={() => onFinish(score)}
            className="rounded-lg bg-indigo-600 px-5 py-2.5 font-semibold text-white shadow-sm transition hover:bg-indigo-700"
          >
            Ver resultado
          </button>
        )}
      </div>
    </div>
  )
}
