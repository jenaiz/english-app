import { useEffect, useRef, useState } from 'react'
import { CheckCircle2, ListChecks, Pause } from 'lucide-react'
import { useYouTubePlayer } from '../../lib/useYouTubePlayer'
import type { Activity, ChoiceItem, ExerciseResult, VideoContent } from '../../types'
import MultipleChoice from '../exercises/MultipleChoice'
import Attribution from './Attribution'
import VideoFrame from './VideoFrame'

interface Props {
  activity: Activity
  content: VideoContent
  onFinish: (r: ExerciseResult) => void
}

const clock = (t: number) => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`

/**
 * A talk or video with our own questions: at each checkpoint the video pauses and asks about
 * what has been said so far, and the final questions come when it ends. There is no transcript:
 * talks don't allow publishing theirs.
 */
export default function VideoPlayer({ activity, content, onFinish }: Props) {
  const checkpoints = content.checkpoints ?? []
  const finalQuestions = content.questions ?? []
  // One round per checkpoint, then the final questions (if any).
  const rounds: { title: string; intro: string; questions: ChoiceItem[] }[] = [
    ...checkpoints.map((cp, i) => ({
      title: `Pausa ${i + 1} · ${clock(cp.t)}`,
      intro: 'Sobre lo que has visto hasta ahora:',
      questions: cp.questions,
    })),
    ...(finalQuestions.length
      ? [
          {
            title: 'Preguntas finales',
            intro: 'Sobre el vídeo completo:',
            questions: finalQuestions,
          },
        ]
      : []),
  ]

  const [answered, setAnswered] = useState(0)
  const [asking, setAsking] = useState(false)
  const [score, setScore] = useState<ExerciseResult>({ correct: 0, total: 0 })
  const questionsRef = useRef<HTMLElement>(null)

  const round = rounds[answered]
  const nextCheckpoint = answered < checkpoints.length ? checkpoints[answered] : null
  const done = answered >= rounds.length

  const player = useYouTubePlayer({
    videoId: activity.youtube_id!,
    start: content.start,
    onTime: (t) => {
      if (nextCheckpoint && !asking && t >= nextCheckpoint.t) {
        player.pause()
        setAsking(true)
      }
    },
  })

  // The final questions open by themselves when the video ends.
  useEffect(() => {
    if (player.ended && !nextCheckpoint && round) setAsking(true)
  }, [player.ended, nextCheckpoint, round])

  useEffect(() => {
    if (asking)
      questionsRef.current?.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      })
  }, [asking])

  const roundDone = (r: ExerciseResult) => {
    const total = {
      correct: score.correct + r.correct,
      total: score.total + r.total,
    }
    setScore(total)
    setAsking(false)
    setAnswered((n) => n + 1)
    if (answered + 1 >= rounds.length) onFinish(total)
    else if (player.ready && answered < checkpoints.length) player.play()
  }

  return (
    <div>
      <div className="mx-auto max-w-4xl">
        <VideoFrame player={player} videoId={activity.youtube_id!} label={activity.title} />
        <Attribution
          kind="Vídeo"
          title={activity.title}
          author={content.speaker}
          source={`${content.channel} · ${content.license}`}
          href={content.source_url}
        />

        <div className="mt-4 flex flex-wrap gap-2">
          {rounds.map((r, i) => (
            <span
              key={i}
              className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${
                i < answered ? 'bg-emerald-100 text-emerald-700' : i === answered ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-500'
              }`}
            >
              {i < answered ? (
                <CheckCircle2 className="h-3.5 w-3.5" />
              ) : i < checkpoints.length ? (
                <Pause className="h-3.5 w-3.5" />
              ) : (
                <ListChecks className="h-3.5 w-3.5" />
              )}
              {r.title}
            </span>
          ))}
        </div>
        <p className="mt-3 text-sm text-slate-500">
          {checkpoints.length > 0
            ? 'El vídeo se para en cada pausa para hacerte preguntas. Escucha con atención: no hay transcripción.'
            : 'Mira el vídeo completo: al terminar te haremos unas preguntas. Escucha con atención: no hay transcripción.'}
        </p>
      </div>

      {asking && round && (
        <section ref={questionsRef} className="mx-auto mt-6 max-w-2xl rounded-3xl border-2 border-indigo-200 bg-white p-5 shadow-lg md:p-8">
          <h2 className="mb-4 flex items-center gap-2 font-display text-xl font-bold text-slate-900">
            <ListChecks className="h-5 w-5 text-indigo-600" /> {round.title}
          </h2>
          <MultipleChoice key={answered} content={{ instructions: round.intro, items: round.questions }} onComplete={roundDone} />
        </section>
      )}

      {!asking && !done && (
        <div className="mx-auto mt-6 flex max-w-4xl justify-end">
          <button type="button" onClick={() => setAsking(true)} className="text-sm text-slate-500 underline hover:text-slate-700">
            {nextCheckpoint ? '¿No puedes ver el vídeo? Responde ya' : 'He terminado el vídeo: ir a las preguntas'}
          </button>
        </div>
      )}
    </div>
  )
}
