import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { AlertCircle, ArrowLeft, Clock, Loader2, Lock } from 'lucide-react'
import { api, ApiError } from '../api/client'
import ActivityEnd from '../components/club/ActivityEnd'
import ReadingPlayer from '../components/club/ReadingPlayer'
import SongPlayer from '../components/club/SongPlayer'
import VideoPlayer from '../components/club/VideoPlayer'
import VerbCloze from '../components/exercises/VerbCloze'
import { trackEvent } from '../lib/analytics'
import { roomOf } from '../lib/club'
import type { Activity, ActivityCard, ExerciseResult, ReadingContent, SongContent, VerbClozeContent, VideoContent } from '../types'

interface Finished extends ExerciseResult {
  score: number
  best: number
  album: { open: number; total: number } | null
}

export default function ClubActivity() {
  const { activityId = '' } = useParams()
  const [data, setData] = useState<{ activity: Activity; card: ActivityCard } | null>(null)
  const [error, setError] = useState<{ locked: boolean; message: string } | null>(null)
  const [finished, setFinished] = useState<Finished | null>(null)
  const [saveError, setSaveError] = useState('')
  // A result that could not be saved, kept to retry.
  const [unsaved, setUnsaved] = useState<ExerciseResult | null>(null)
  // Bumped to play the activity again from the start.
  const [round, setRound] = useState(0)

  useEffect(() => {
    setData(null)
    setError(null)
    setFinished(null)
    api
      .activity(activityId)
      .then((r) => {
        setData(r)
        if (r.card.state === 'new') {
          window.dispatchEvent(new Event('club-changed'))
          trackEvent('club_open', { activity_id: r.activity.id, activity_type: r.activity.type })
        }
      })
      .catch((e) =>
        setError({
          locked: e instanceof ApiError && e.code === 'locked',
          message: e instanceof Error ? e.message : 'No se pudo cargar la actividad',
        }),
      )
  }, [activityId])

  useEffect(() => window.scrollTo(0, 0), [activityId, finished])

  if (error) {
    return (
      <div className="mx-auto mt-12 max-w-md px-4 text-center">
        {error.locked ? (
          <div className="rounded-2xl bg-slate-100 p-8">
            <Lock className="mx-auto h-8 w-8 text-slate-400" />
            <p className="mt-3 font-semibold text-slate-700">Esta actividad todavía está bloqueada</p>
            <p className="mt-1 text-sm text-slate-500">Sigue con el curso para desbloquearla.</p>
          </div>
        ) : (
          <div className="flex items-center gap-2 rounded-lg bg-red-50 p-4 text-red-700">
            <AlertCircle className="h-5 w-5" /> {error.message}
          </div>
        )}
        <Link to="/club" className="mt-4 inline-block text-indigo-600 hover:underline">
          ← Volver al Club
        </Link>
      </div>
    )
  }
  if (!data) {
    return (
      <div className="flex justify-center py-24 text-indigo-500">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  const { activity, card } = data
  const room = roomOf(activity.room)

  const finish = async (r: ExerciseResult) => {
    const score = r.total ? Math.round((r.correct / r.total) * 100) : 100
    setSaveError('')
    setUnsaved(null)
    try {
      const { best_score } = await api.completeActivity(activity.id, score)
      let album: Finished['album'] = null
      try {
        const sameRoom = (await api.club()).activities.filter((c) => c.room === activity.room)
        album = { open: sameRoom.filter((c) => c.state !== 'locked').length, total: sameRoom.length }
      } catch {
        // The album counter is a nicety.
      }
      trackEvent('club_complete', { activity_id: activity.id, activity_type: activity.type, score })
      setFinished({ ...r, score, best: best_score, album })
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : 'No se pudo guardar el resultado')
      setUnsaved(r)
    }
  }

  let player
  switch (activity.type) {
    case 'reading':
      player = <ReadingPlayer key={round} onFinish={finish} content={activity.content as ReadingContent} />
      break
    case 'song':
      player = <SongPlayer key={round} onFinish={finish} activity={activity} content={activity.content as SongContent} />
      break
    case 'video':
      player = <VideoPlayer key={round} onFinish={finish} activity={activity} content={activity.content as VideoContent} />
      break
    case 'verb_cloze':
      player = (
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm md:p-8">
          <VerbCloze key={round} content={activity.content as VerbClozeContent} onComplete={finish} />
        </div>
      )
      break
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 md:py-10">
      <Link to={`/club?room=${activity.room}`} className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-indigo-600">
        <ArrowLeft className="h-4 w-4" /> Club · {room.label}
      </Link>

      {finished ? (
        <div className="mt-6">
          <ActivityEnd
            activity={activity}
            score={finished.score}
            correct={finished.correct}
            total={finished.total}
            bestScore={finished.best}
            album={finished.album}
            onRestart={() => {
              setFinished(null)
              setRound((n) => n + 1)
            }}
          />
        </div>
      ) : (
        <>
          <header className="mt-4 mb-6">
            <p className={`flex items-center gap-1.5 text-xs font-semibold tracking-wide uppercase ${room.accent}`}>
              <room.Icon className="h-4 w-4" /> {room.label}
            </p>
            <h1 className="mt-1 font-display text-3xl font-bold text-slate-900 md:text-4xl">{activity.title}</h1>
            <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-500">
              {activity.subtitle && <span className="font-medium text-slate-600">{activity.subtitle}</span>}
              <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-xs font-semibold text-slate-600">{activity.level}</span>
              <span className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" /> {activity.minutes} min
              </span>
              {card.best_score !== undefined && <span>Tu mejor resultado: {card.best_score}%</span>}
            </p>
          </header>
          {player}
          {saveError && (
            <p className="mt-4 flex items-center gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-700">
              <AlertCircle className="h-4 w-4" /> {saveError}
              {unsaved && (
                <button type="button" onClick={() => finish(unsaved)} className="ml-auto font-semibold underline">
                  Reintentar
                </button>
              )}
            </p>
          )}
        </>
      )}
    </div>
  )
}
