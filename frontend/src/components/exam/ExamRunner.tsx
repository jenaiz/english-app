import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AlertTriangle, ArrowLeft, ArrowRight, Check, Clock, Loader2, Send } from 'lucide-react'
import { api, ApiError } from '../../api/client'
import type { ExamAttempt, Paper } from '../../types'
import ListeningClip from './ListeningClip'
import Question from './Questions'
import Button from '../ui/Button'
import Dialog from '../ui/Dialog'
import { pillClass, pillCountClass } from '../ui/styles'
import { buttonClass } from '../ui/Button'

const AUTOSAVE_MS = 1500

/**
 * The exam paper, full screen and without the app's navigation: a timed sitting, one section at
 * a time. Answers are saved as the learner goes; when the time is up the paper is handed in.
 */
export default function ExamRunner({ attempt, onDone }: { attempt: ExamAttempt; onDone: (a: ExamAttempt) => void }) {
  const paper = attempt.paper as Paper
  const [answers, setAnswers] = useState<Record<string, string>>(attempt.answers ?? {})
  const [section, setSection] = useState(0)
  const [confirming, setConfirming] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [saveError, setSaveError] = useState(false)
  const dirty = useRef(new Set<string>())
  const answersRef = useRef(answers)
  answersRef.current = answers

  // Countdown against the server clock, whatever the device's clock says.
  const offset = useMemo(() => Date.parse(attempt.now) - Date.now(), [attempt.now])
  const deadline = Date.parse(attempt.deadline)
  const [left, setLeft] = useState(() => deadline - (Date.now() + offset))
  useEffect(() => {
    const t = setInterval(() => setLeft(deadline - (Date.now() + offset)), 1000)
    return () => clearInterval(t)
  }, [deadline, offset])

  const save = useCallback(async () => {
    if (dirty.current.size === 0) return
    const ids = [...dirty.current]
    dirty.current.clear()
    const batch = Object.fromEntries(ids.map((id) => [id, answersRef.current[id] ?? '']))
    try {
      await api.saveExamAnswers(attempt.attempt_id, batch)
      setSaveError(false)
    } catch (e) {
      ids.forEach((id) => dirty.current.add(id))
      if (e instanceof ApiError && e.code === 'attempt_closed') {
        onDone(await api.examAttempt(attempt.attempt_id))
        return
      }
      setSaveError(true)
    }
  }, [attempt.attempt_id, onDone])

  useEffect(() => {
    const t = setTimeout(save, AUTOSAVE_MS)
    return () => clearTimeout(t)
  }, [answers, save])
  useEffect(() => {
    const flush = () => document.visibilityState === 'hidden' && save()
    document.addEventListener('visibilitychange', flush)
    return () => document.removeEventListener('visibilitychange', flush)
  }, [save])

  const answer = (id: string, v: string) => {
    dirty.current.add(id)
    setAnswers((a) => ({ ...a, [id]: v }))
  }

  const submit = useCallback(async () => {
    setSubmitting(true)
    try {
      onDone(await api.submitExam(attempt.attempt_id, answersRef.current))
    } catch {
      // Already closed (time up elsewhere) or a network error: the attempt knows its state.
      try {
        onDone(await api.examAttempt(attempt.attempt_id))
      } catch {
        setSubmitting(false)
        setSaveError(true)
      }
    }
  }, [attempt.attempt_id, onDone])

  const timeUp = left <= 0
  useEffect(() => {
    if (timeUp && !submitting) submit()
  }, [timeUp, submitting, submit])

  // Global question numbers, and how many each section has answered.
  const numbered = useMemo(() => {
    let n = 0
    return paper.sections.map((s) => s.parts.map((p) => p.items.map(() => ++n)))
  }, [paper])
  const counts = paper.sections.map((s) => {
    const items = s.parts.flatMap((p) => p.items)
    return { total: items.length, done: items.filter((it) => answers[it.id]?.trim()).length }
  })
  const total = counts.reduce((a, c) => a + c.total, 0)
  const done = counts.reduce((a, c) => a + c.done, 0)

  const go = (i: number) => {
    setSection(i)
    window.scrollTo({ top: 0 })
    document.getElementById('exam-scroll')?.scrollTo({ top: 0 })
  }

  const cur = paper.sections[section]
  const last = section === paper.sections.length - 1
  const lowTime = left < 5 * 60 * 1000

  return (
    <div id="exam-scroll" className="fixed inset-0 z-40 overflow-y-auto bg-slate-50">
      {/* Top bar: sections, answered count and time */}
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-3xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
          <p className="font-display font-bold text-slate-900">{paper.title}</p>
          <span className="text-sm text-slate-500 tabular-nums">
            {done}/{total} respondidas
          </span>
          <span
            className={`ml-auto inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-bold tabular-nums ${
              lowTime ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-700'
            }`}
            role="timer"
            aria-label="Tiempo restante"
          >
            <Clock className="h-4 w-4" /> {clock(left)}
          </span>
          <button
            type="button"
            onClick={() => setConfirming(true)}
            className={buttonClass({ size: 'sm' })}
          >
            <Send className="h-4 w-4" /> Entregar
          </button>
        </div>
        <nav className="mx-auto flex max-w-3xl gap-1 overflow-x-auto px-4 pb-2" aria-label="Secciones">
          {paper.sections.map((s, i) => (
            <button
              key={s.section_id}
              type="button"
              onClick={() => go(i)}
              aria-current={i === section ? 'step' : undefined}
              className={pillClass(i === section)}
            >
              {counts[i].done === counts[i].total && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
              {s.title}
              <span className={pillCountClass(i === section)}>
                {counts[i].done}/{counts[i].total}
              </span>
            </button>
          ))}
        </nav>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-8">
        {saveError && (
          <p className="mb-6 flex items-center gap-2 rounded-xl bg-amber-50 p-3 text-sm text-amber-800">
            <AlertTriangle className="h-4 w-4 shrink-0" /> No se han podido guardar tus últimas respuestas. Revisa tu conexión: lo volveremos a intentar.
          </p>
        )}
        <h1 className="font-display text-3xl font-extrabold text-slate-900">{cur.title}</h1>
        <div className="mt-6 space-y-10">
          {cur.parts.map((p, pi) => (
            <section key={p.part_id} aria-label={p.title ?? p.instructions}>
              <p className="font-semibold text-slate-700">{p.instructions}</p>
              {p.audio && (
                <div className="mt-4">
                  <ListeningClip attemptId={attempt.attempt_id} partId={p.part_id} files={p.audio} maxPlays={paper.max_plays} />
                </div>
              )}
              {p.text && (
                <article className="mt-4 rounded-2xl border border-slate-200 bg-white p-6">
                  {p.title && <h2 className="font-display text-xl font-bold text-slate-900">{p.title}</h2>}
                  <div className="mt-3 space-y-3 leading-relaxed whitespace-pre-line text-slate-800">{p.text}</div>
                </article>
              )}
              <div className="mt-4 space-y-3">
                {p.items.map((it, ii) => (
                  <Question key={it.id} item={it} n={numbered[section][pi][ii]} value={answers[it.id] ?? ''} onChange={(v) => answer(it.id, v)} />
                ))}
              </div>
            </section>
          ))}
        </div>

        <div className="mt-10 flex items-center justify-between gap-3 border-t border-slate-200 pt-6">
          <Button variant="secondary" onClick={() => go(section - 1)} disabled={section === 0} className="disabled:invisible">
            <ArrowLeft className="h-4 w-4" /> Anterior
          </Button>
          {last ? (
            <Button onClick={() => setConfirming(true)}>
              <Send className="h-4 w-4" /> Entregar el examen
            </Button>
          ) : (
            <Button onClick={() => go(section + 1)}>
              {paper.sections[section + 1].title} <ArrowRight className="h-4 w-4" />
            </Button>
          )}
        </div>
      </main>

      {(confirming || submitting) && (
        // While correcting there is nothing to cancel: no onClose.
        <Dialog labelledBy="submit-title" onClose={submitting ? undefined : () => setConfirming(false)}>
          {submitting ? (
            <p id="submit-title" className="flex items-center gap-3 font-semibold text-slate-800">
              <Loader2 className="h-5 w-5 animate-spin text-indigo-600" /> {timeUp ? 'Se ha acabado el tiempo. Corrigiendo…' : 'Corrigiendo tu examen…'}
            </p>
          ) : (
            <>
              <h2 id="submit-title" className="font-display text-xl font-bold text-slate-900">
                ¿Entregar el examen?
              </h2>
              <p className="mt-2 text-slate-600">
                {done === total
                  ? 'Has respondido todas las preguntas.'
                  : `Te quedan ${total - done} ${total - done === 1 ? 'pregunta' : 'preguntas'} sin responder; contarán como fallos.`}{' '}
                Una vez entregado no podrás cambiar nada.
              </p>
              <ul className="mt-4 space-y-1 text-sm">
                {paper.sections.map((s, i) => (
                  <li key={s.section_id} className="flex justify-between">
                    <span className="text-slate-600">{s.title}</span>
                    <span className={`font-semibold tabular-nums ${counts[i].done === counts[i].total ? 'text-emerald-700' : 'text-amber-700'}`}>
                      {counts[i].done}/{counts[i].total}
                    </span>
                  </li>
                ))}
              </ul>
              <div className="mt-6 flex justify-end gap-2">
                <Button variant="ghost" onClick={() => setConfirming(false)}>
                  Seguir revisando
                </Button>
                <Button onClick={submit} autoFocus>
                  Entregar
                </Button>
              </div>
            </>
          )}
        </Dialog>
      )}
    </div>
  )
}

function clock(ms: number) {
  const s = Math.max(0, Math.ceil(ms / 1000))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}
