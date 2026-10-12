import { Link } from 'react-router-dom'
import { BookA, GraduationCap, RotateCcw, Trophy } from 'lucide-react'
import { roomOf } from '../../lib/club'
import type { Activity, ActivityExtras, ExerciseResult } from '../../types'
import TopicReview, { weakest } from '../exam/TopicReview'
import SpeakButton from '../SpeakButton'
import { ExpressionsBlock } from '../expressions/UnitExpressions'

interface Props {
  activity: Activity
  score: number
  correct: number
  total: number
  bestScore: number
  /** Activities of this room the learner has unlocked, and how many exist, for the album. */
  album: { open: number; total: number } | null
  /** Score per exam topic, for games. */
  byTag?: ExerciseResult['byTag']
  onRestart: () => void
}

/** What every Club activity ends with: the score, the album, its vocabulary and expressions to review. */
export default function ActivityEnd({ activity, score, correct, total, bestScore, album, byTag, onRestart }: Props) {
  const room = roomOf(activity.room)
  const good = score >= 70
  const extras = activity.content as ActivityExtras
  const vocab = extras.vocabulary ?? []
  // A game practises topics of the level exam: the ones with mistakes are what to review.
  const topics = byTag && activity.topics ? activity.topics.map((t) => ({ ...t, ...(byTag[t.tag] ?? { correct: 0, total: 0 }) })) : []
  const weak = weakest(topics)

  return (
    <div className="mx-auto max-w-3xl">
      <div className="text-center">
        <div className={`mx-auto grid h-20 w-20 place-items-center rounded-full ${good ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'}`}>
          <Trophy className="h-10 w-10" />
        </div>
        <h2 className="mt-5 font-display text-3xl font-bold text-slate-900">{good ? '¡Muy bien!' : '¡Terminado!'}</h2>
        <p className="mt-1 text-slate-500">{activity.title}</p>
      </div>

      <div className="mt-8 grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 text-center">
          <p className={`text-4xl font-extrabold ${good ? 'text-emerald-600' : 'text-amber-600'}`}>{score}%</p>
          <p className="mt-1 text-sm text-slate-500">
            {correct}/{total} aciertos{bestScore > score ? ` · tu mejor: ${bestScore}%` : ''}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 text-center">
          <p className={`flex items-center justify-center gap-2 text-4xl font-extrabold ${room.accent}`}>
            <room.Icon className="h-8 w-8" /> {album ? `${album.open}/${album.total}` : '✓'}
          </p>
          <p className="mt-1 text-sm text-slate-500">{room.plural} en tu álbum</p>
        </div>
      </div>

      {topics.length > 0 && (
        <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-5 md:p-6">
          <h3 className="flex items-center gap-2 font-display text-lg font-bold text-slate-900">
            <GraduationCap className="h-5 w-5 text-indigo-600" /> {weak.length ? 'Qué repasar para el examen' : 'Para el examen'}
          </h3>
          {weak.length ? (
            <TopicReview topics={weak} />
          ) : (
            <p className="mt-2 text-slate-600">
              Sin fallos en los {topics.length} temas del examen {activity.level} que practica este juego. ¡Perfecto!
            </p>
          )}
        </section>
      )}

      {vocab.length > 0 && (
        <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-5 md:p-6">
          <h3 className="flex items-center gap-2 font-display text-lg font-bold text-slate-900">
            <BookA className="h-5 w-5 text-emerald-600" /> Vocabulario
          </h3>
          <ul className="mt-3 grid gap-x-6 sm:grid-cols-2">
            {vocab.map((v) => (
              <li key={v.term} className="flex items-center gap-3 border-b border-slate-100 py-2.5 last:border-0">
                <SpeakButton text={v.term} />
                <span className="min-w-0">
                  <span className="block font-semibold text-indigo-700">{v.term}</span>
                  <span className="block text-sm text-slate-500">{v.translation}</span>
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <ExpressionsBlock
        id={`club-expressions-${activity.id}`}
        items={() => extras.expressions ?? []}
        itemsKey={activity.id}
        source="club"
        title="Expresiones que han salido"
        intro="Añádelas a tu repaso para no olvidarlas."
      />

      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <button
          type="button"
          onClick={onRestart}
          className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-2.5 font-semibold text-slate-700 transition hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700"
        >
          <RotateCcw className="h-4 w-4" /> Repetir
        </button>
        <Link
          to={`/club?room=${activity.room}`}
          className="rounded-xl bg-indigo-600 px-5 py-2.5 font-semibold text-white shadow-sm transition hover:bg-indigo-700"
        >
          Volver al Club
        </Link>
      </div>
    </div>
  )
}
