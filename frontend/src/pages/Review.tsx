import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useSearchParams } from 'react-router-dom'
import { AlertCircle, ArrowLeft, Brain, CheckCircle2, Ear, HelpCircle, Keyboard, Loader2, Mic, MicOff, Volume2, XCircle } from 'lucide-react'
import { api } from '../api/client'
import { trackEvent } from '../lib/analytics'
import ChoiceExercise from '../components/review/ChoiceExercise'
import ReviewHub, { DECKS, type Deck } from '../components/review/ReviewHub'
import { bestSimilarity, isCorrect, matchesMeaning } from '../lib/answers'
import { canSpeak, speak, useSpeechRecognition } from '../lib/speech'
import type { Grade, ReviewCard } from '../types'

/**
 * Repaso: a hub with today's cards by kind, then a session for the chosen deck.
 * Young idiom and phrasal verb cards come with a multiple-choice exercise (card.choice); every
 * other card uses active recall, where the learner must answer before seeing the card:
 * - listen: hears the English term (hidden) and types its Spanish meaning.
 * - produce: sees the Spanish + definition and says or types the English term.
 */
type Direction = 'listen' | 'produce'
type ModePref = 'mixed' | Direction
type Outcome = 'correct' | 'wrong' | 'unknown'

const MODES: { id: ModePref; label: string }[] = [
  { id: 'mixed', label: 'Mixto' },
  { id: 'listen', label: 'Escuchar → ES' },
  { id: 'produce', label: 'ES → Inglés' },
]

const PASS_GRADES: { grade: Grade; label: string; cls: string; key: string }[] = [
  { grade: 'hard', label: 'Difícil', cls: 'bg-amber-500 hover:bg-amber-600', key: '1' },
  { grade: 'good', label: 'Bien', cls: 'bg-emerald-500 hover:bg-emerald-600', key: '2' },
  { grade: 'easy', label: 'Fácil', cls: 'bg-sky-500 hover:bg-sky-600', key: '3' },
]

// Speech recognition is imperfect: accept when most of the words match.
const SPEECH_PASS = 0.75
const MODE_KEY = 'review-mode'

function formatInterval(days: number) {
  if (days < 1 / 24) return `${Math.max(1, Math.round(days * 24 * 60))} min`
  if (days < 1) return `${Math.round(days * 24)} h`
  if (days < 30) return `${Math.round(days * 10) / 10} d`
  return `${Math.round(days / 30)} mes`
}

// Alternate direction per card and per repetition so each word is practised both ways.
function directionFor(card: ReviewCard, pref: ModePref): Direction {
  if (pref !== 'mixed') return pref
  let h = card.repetitions
  for (const ch of card.id) h = (h * 31 + ch.charCodeAt(0)) | 0
  return Math.abs(h) % 2 === 0 ? 'listen' : 'produce'
}

function loadModePref(): ModePref {
  try {
    const v = localStorage.getItem(MODE_KEY)
    if (v === 'mixed' || v === 'listen' || v === 'produce') return v
  } catch {
    // storage unavailable
  }
  return 'mixed'
}

export default function Review() {
  const [params, setParams] = useSearchParams()
  const deck = DECKS.find((d) => d.id === params.get('mazo'))
  if (!deck) return <ReviewHub onStart={(d) => setParams({ mazo: d })} />
  return <ReviewSession key={deck.id} deck={deck.id} onExit={() => setParams({})} />
}

function ReviewSession({ deck, onExit }: { deck: Deck; onExit: () => void }) {
  const [cards, setCards] = useState<ReviewCard[]>([])
  const [pos, setPos] = useState(0)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [reviewed, setReviewed] = useState({ total: 0, correct: 0 })
  const [modePref, setModePref] = useState<ModePref>(loadModePref)

  const [answer, setAnswer] = useState('')
  const [picked, setPicked] = useState<string | null>(null)
  const [outcome, setOutcome] = useState<Outcome | null>(null)
  const [typing, setTyping] = useState(false)
  const [notice, setNotice] = useState('')
  const rec = useSpeechRecognition()
  const inputRef = useRef<HTMLInputElement>(null)

  const load = () => {
    setLoading(true)
    endReported.current = false
    api
      .srsDue(20, deck === 'all' ? undefined : deck)
      .then((c) => {
        setCards(c)
        setPos(0)
        if (c.length > 0) trackEvent('review_session_start', { deck, cards: c.length })
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false))
  }
  useEffect(load, [])

  const card = cards[pos]
  const choice = card?.choice

  // The session ends when the learner runs out of cards after reviewing at least one.
  const endReported = useRef(false)
  useEffect(() => {
    if (loading || card || reviewed.total === 0 || endReported.current) return
    endReported.current = true
    trackEvent('review_session_end', { deck, reviewed: reviewed.total, correct: reviewed.correct })
  }, [loading, card, reviewed, deck])
  const direction = card ? directionFor(card, modePref) : 'listen'
  const useMic = direction === 'produce' && rec.supported && !typing
  const response = choice ? (picked ?? '') : useMic ? rec.transcript : answer

  // New card: reset the answer and, in listening mode, play the word.
  useEffect(() => {
    setAnswer('')
    setPicked(null)
    setOutcome(null)
    setNotice('')
    rec.reset()
    if (card && !card.choice && direction === 'listen') speak(card.term)
    setTimeout(() => inputRef.current?.focus(), 50)
  }, [card?.id, pos, direction])

  const changeMode = (m: ModePref) => {
    setModePref(m)
    try {
      localStorage.setItem(MODE_KEY, m)
    } catch {
      // storage unavailable
    }
  }

  const check = (e?: FormEvent) => {
    e?.preventDefault()
    if (!card || outcome || !response.trim()) return
    rec.stop()
    if (direction === 'listen' && isCorrect(response, [card.term])) {
      setNotice('Has escrito la palabra en inglés. Escribe qué significa en español.')
      return
    }
    setNotice('')
    const ok =
      direction === 'listen'
        ? matchesMeaning(response, card.translation)
        : useMic
          ? bestSimilarity([response, ...rec.alternatives], card.term) >= SPEECH_PASS
          : isCorrect(response, [card.term])
    setOutcome(ok ? 'correct' : 'wrong')
    reportAnswer(ok ? 'correct' : 'wrong')
    // After answering, always hear the right pronunciation.
    speak(card.term)
  }

  const choose = (option: string) => {
    if (!card?.choice || outcome) return
    setPicked(option)
    const result = option === card.choice.answer ? 'correct' : 'wrong'
    setOutcome(result)
    reportAnswer(result)
    speak(card.term)
  }

  const giveUp = () => {
    if (!card || outcome) return
    rec.stop()
    setOutcome('unknown')
    reportAnswer('unknown')
    speak(card.term)
  }

  // Which exercises are too easy or too hard, per kind of card.
  const reportAnswer = (result: Outcome) => {
    if (!card) return
    trackEvent('review_answer', { card_kind: card.kind, exercise: card.choice?.type ?? `recall_${direction}`, outcome: result })
  }

  const grade = async (g: Grade) => {
    if (!card || busy || !outcome) return
    setBusy(true)
    try {
      await api.srsReview(card.id, g)
      setReviewed((r) => ({ total: r.total + 1, correct: r.correct + (outcome === 'correct' ? 1 : 0) }))
      // Failed cards come back later in this same session.
      if (g === 'again') setCards((cs) => [...cs, card])
      setPos((p) => p + 1)
      window.dispatchEvent(new Event('srs-changed'))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar')
    } finally {
      setBusy(false)
    }
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!outcome && choice) {
        const option = choice.options[Number(e.key) - 1]
        if (option) choose(option)
        return
      }
      if (!outcome) return
      if (outcome !== 'correct' && (e.key === 'Enter' || e.key === ' ')) {
        e.preventDefault()
        grade('again')
      } else if (outcome === 'correct') {
        const g = PASS_GRADES.find((x) => x.key === e.key)
        if (g) grade(g.grade)
        else if (e.key === 'Enter') grade('good')
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  if (loading) {
    return (
      <div className="flex justify-center py-24 text-indigo-500">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  if (!card) {
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center">
        <div className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-emerald-100 text-emerald-600">
          <CheckCircle2 className="h-10 w-10" />
        </div>
        <h1 className="mt-6 text-2xl font-bold text-slate-900">¡Todo al día!</h1>
        <p className="mt-2 text-slate-500">
          {reviewed.total > 0
            ? `Has repasado ${reviewed.total} tarjeta${reviewed.total === 1 ? '' : 's'} (${reviewed.correct} acertadas a la primera). Vuelve más tarde para las siguientes.`
            : 'No tienes tarjetas pendientes en este mazo.'}
        </p>
        <div className="mt-6 flex justify-center gap-3">
          {reviewed.total > 0 && (
            <button onClick={load} className="rounded-lg border border-slate-300 px-5 py-2.5 font-medium text-slate-700 hover:bg-slate-50">
              Buscar más
            </button>
          )}
          <button onClick={onExit} className="rounded-lg bg-indigo-600 px-5 py-2.5 font-semibold text-white hover:bg-indigo-700">
            Volver a Repaso
          </button>
        </div>
      </div>
    )
  }

  const answered = outcome !== null

  return (
    <div className="mx-auto max-w-xl px-4 py-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button onClick={onExit} className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-800" aria-label="Volver a Repaso">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-900">
            <Brain className="h-6 w-6 text-indigo-600" /> {DECKS.find((d) => d.id === deck)?.label}
          </h1>
        </div>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-medium text-slate-600 tabular-nums">
          {cards.length - pos} pendientes
        </span>
      </div>

      <div className={`mt-4 inline-flex rounded-lg bg-slate-100 p-1 text-sm ${choice ? 'invisible' : ''}`}>
        {MODES.map((m) => (
          <button
            key={m.id}
            onClick={() => changeMode(m.id)}
            className={`rounded-md px-3 py-1.5 font-medium transition ${modePref === m.id ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            {m.label}
          </button>
        ))}
      </div>

      {error && (
        <div className="mt-4 flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          <AlertCircle className="h-4 w-4" /> {error}
        </div>
      )}

      <div className="mt-4 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="px-6 pt-8 pb-6 text-center">
          <p className="text-xs font-semibold tracking-wide text-slate-400 uppercase">
            {card.level_id} · {card.lesson_title}
          </p>

          {/* Prompt */}
          {choice ? (
            <ChoiceExercise choice={choice} picked={picked} onPick={choose} />
          ) : direction === 'listen' ? (
            <div className="mt-5 flex flex-col items-center">
              <p className="flex items-center gap-1.5 text-sm font-medium text-indigo-600">
                <Ear className="h-4 w-4" /> Escucha y escribe qué significa <strong>en español</strong>
              </p>
              {!answered && (
                <button
                  onClick={() => speak(card.term)}
                  disabled={!canSpeak}
                  className="mt-4 grid h-20 w-20 place-items-center rounded-full bg-indigo-600 text-white shadow-lg transition hover:bg-indigo-700"
                  title="Escuchar otra vez"
                >
                  <Volume2 className="h-9 w-9" />
                </button>
              )}
              {!canSpeak && !answered && <p className="mt-3 text-2xl font-bold">{card.term}</p>}
            </div>
          ) : (
            <div className="mt-5">
              <p className="text-sm font-medium text-indigo-600">¿Cómo se dice en inglés?</p>
              {!answered && (
                <>
                  <p className="mt-3 text-3xl font-extrabold text-slate-900">{card.translation}</p>
                  <p className="mt-2 text-slate-500">{card.definition}</p>
                </>
              )}
            </div>
          )}

          {/* Answer input */}
          {!answered && !choice && (
            <form onSubmit={check} className="mt-6">
              {useMic ? (
                <div className="flex flex-col items-center">
                  <button
                    type="button"
                    onClick={rec.listening ? rec.stop : rec.start}
                    className={`grid h-16 w-16 place-items-center rounded-full text-white shadow-md transition ${
                      rec.listening ? 'animate-pulse bg-red-500' : 'bg-slate-900 hover:bg-slate-800'
                    }`}
                    title={rec.listening ? 'Parar' : 'Hablar'}
                  >
                    {rec.listening ? <MicOff className="h-7 w-7" /> : <Mic className="h-7 w-7" />}
                  </button>
                  <p className="mt-3 min-h-7 text-lg text-slate-700 italic">
                    {rec.transcript || <span className="text-sm text-slate-400 not-italic">{rec.listening ? 'Escuchando…' : 'Pulsa y di la palabra'}</span>}
                  </p>
                  {rec.error && <p className="text-sm text-red-600">{rec.error}</p>}
                </div>
              ) : (
                <input
                  ref={inputRef}
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                  autoCapitalize="off"
                  autoComplete="off"
                  spellCheck={false}
                  placeholder={direction === 'listen' ? 'Significado en español…' : 'Escribe en inglés…'}
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 text-center text-lg outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                />
              )}

              {notice && <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">{notice}</p>}

              <div className="mt-4 flex items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={giveUp}
                  className="inline-flex items-center gap-1.5 rounded-lg px-4 py-2.5 font-medium text-slate-500 hover:bg-slate-100"
                >
                  <HelpCircle className="h-4 w-4" /> No lo sé
                </button>
                <button
                  type="submit"
                  disabled={!response.trim() || rec.listening}
                  className="rounded-lg bg-indigo-600 px-6 py-2.5 font-semibold text-white shadow-sm hover:bg-indigo-700 disabled:opacity-40"
                >
                  Comprobar
                </button>
              </div>

              {direction === 'produce' && rec.supported && (
                <button
                  type="button"
                  onClick={() => setTyping((t) => !t)}
                  className="mt-3 inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-indigo-600"
                >
                  {typing ? <Mic className="h-4 w-4" /> : <Keyboard className="h-4 w-4" />}
                  {typing ? 'Responder hablando' : 'Prefiero escribir'}
                </button>
              )}
            </form>
          )}

          {/* Feedback + full card */}
          {answered && (
            <div className="mt-6">
              <div
                className={`flex items-center justify-center gap-2 rounded-xl px-4 py-3 font-semibold ${
                  outcome === 'correct' ? 'bg-emerald-50 text-emerald-700' : outcome === 'wrong' ? 'bg-red-50 text-red-700' : 'bg-slate-100 text-slate-600'
                }`}
              >
                {outcome === 'correct' ? <CheckCircle2 className="h-5 w-5" /> : outcome === 'wrong' ? <XCircle className="h-5 w-5" /> : <HelpCircle className="h-5 w-5" />}
                {outcome === 'correct' ? '¡Correcto!' : outcome === 'wrong' ? 'No es correcto' : 'Esta era la respuesta'}
              </div>
              {outcome !== 'unknown' && response && !choice && (
                <p className="mt-2 text-sm text-slate-500">
                  Tu respuesta: <span className={`font-medium ${outcome === 'correct' ? 'text-emerald-700' : 'text-red-600 line-through'}`}>{response}</span>
                </p>
              )}
              <div className="mt-5 border-t border-slate-100 pt-5">
                <p className="flex items-center justify-center gap-2 text-2xl font-bold text-slate-900">
                  {card.term}
                  {canSpeak && (
                    <button onClick={() => speak(card.term)} className="rounded-full p-1.5 text-indigo-500 hover:bg-indigo-50" title="Escuchar">
                      <Volume2 className="h-5 w-5" />
                    </button>
                  )}
                </p>
                <p className="mt-1 text-xl font-semibold text-indigo-700">{card.translation}</p>
                <p className="mt-2 text-slate-600">{card.definition}</p>
                {card.example && <p className="mt-2 text-slate-500 italic">“{card.example}”</p>}
              </div>
            </div>
          )}
        </div>

        {answered && (
          <div className="border-t border-slate-100 bg-slate-50 p-3">
            {outcome === 'correct' ? (
              <>
                <p className="mb-2 text-center text-xs text-slate-500">¿Qué tal te ha costado?</p>
                <div className="grid grid-cols-3 gap-2">
                  {PASS_GRADES.map((g) => (
                    <button
                      key={g.grade}
                      disabled={busy}
                      onClick={() => grade(g.grade)}
                      className={`flex flex-col items-center rounded-xl px-2 py-2.5 font-semibold text-white transition disabled:opacity-50 ${g.cls}`}
                    >
                      <span className="text-sm">{g.label}</span>
                      <span className="text-xs font-medium opacity-80">{formatInterval(card.preview[g.grade])}</span>
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <button
                disabled={busy}
                onClick={() => grade('again')}
                className="w-full rounded-xl bg-red-500 py-3 font-semibold text-white transition hover:bg-red-600 disabled:opacity-50"
              >
                Continuar · volverá en {formatInterval(card.preview.again)}
              </button>
            )}
          </div>
        )}
      </div>

      <p className="mt-4 text-center text-xs text-slate-400">
        {answered
          ? outcome === 'correct'
            ? 'Atajos: 1 difícil · 2 bien · 3 fácil · Enter = bien'
            : 'Atajo: Enter para continuar'
          : choice
            ? `Atajo: pulsa ${choice.options.map((_, i) => i + 1).join(', ').replace(/, (\d)$/, ' o $1')} para elegir`
            : 'Atajo: Enter para comprobar'}
      </p>
    </div>
  )
}
