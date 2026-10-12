import { useEffect, useRef, type FormEvent, type ReactNode } from 'react'
import { CheckCircle2, Lightbulb, Trophy, XCircle } from 'lucide-react'
import { useLessonFlow } from './LessonFlow'
import type { ItemStatus } from './useExerciseItems'
import { buttonClass } from '../ui/Button'
import { inputClass } from '../ui/styles'

interface Props {
  instructions?: string
  index: number
  total: number
  status: ItemStatus
  canCheck: boolean
  onCheck: () => void
  onNext: () => void
  isLast: boolean
  correctAnswer?: ReactNode
  explanation?: string
  hint?: string
  /**
   * For answers given by tapping (options, chips): whenever this value changes and the answer
   * can be checked, focus "Comprobar" so Enter checks. A tapped button keeps the focus
   * otherwise, and Enter would just press it again.
   */
  focusCheckOn?: unknown
  children: ReactNode
}

/** Common frame for item-based exercises: instructions, counter, check → feedback → continue. */
export default function ExerciseShell({
  instructions,
  index,
  total,
  status,
  canCheck,
  onCheck,
  onNext,
  isLast,
  correctAnswer,
  explanation,
  hint,
  focusCheckOn,
  children,
}: Props) {
  const answered = status !== 'answering'
  const flow = useLessonFlow()
  // In a lesson the last item's button also moves the lesson on (see LessonFlow).
  const finish = () => {
    onNext()
    if (isLast && flow) flow.advance()
  }
  // Checking disables the inputs, which drops the focus; move it to "Continuar" so the
  // next Enter advances.
  const buttonRef = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    if (answered) buttonRef.current?.focus()
  }, [answered])
  useEffect(() => {
    if (focusCheckOn !== undefined && canCheck && !answered) buttonRef.current?.focus()
  }, [focusCheckOn])

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (answered) finish()
    else if (canCheck) onCheck()
  }

  return (
    <form onSubmit={submit}>
      <div className="mb-5 flex items-start justify-between gap-4">
        {instructions && <p className="font-medium text-slate-700">{instructions}</p>}
        {total > 1 && (
          <span className="shrink-0 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-500 tabular-nums">
            {index + 1} / {total}
          </span>
        )}
      </div>

      <fieldset disabled={answered} className="min-w-0">
        {children}
      </fieldset>

      {hint && !answered && (
        <p className="mt-3 flex items-center gap-1.5 text-sm text-slate-500">
          <Lightbulb className="h-4 w-4" /> {hint}
        </p>
      )}

      {answered && (
        <div
          className={`mt-5 rounded-xl p-4 ${status === 'correct' ? 'bg-emerald-50 text-emerald-800' : 'bg-red-50 text-red-800'}`}
          role="status"
        >
          <p className="flex items-center gap-2 font-semibold">
            {status === 'correct' ? <CheckCircle2 className="h-5 w-5" /> : <XCircle className="h-5 w-5" />}
            {status === 'correct' ? '¡Correcto!' : 'No del todo'}
          </p>
          {status === 'wrong' && correctAnswer && (
            <p className="mt-1 text-sm">
              Respuesta correcta: <span className="font-semibold">{correctAnswer}</span>
            </p>
          )}
          {explanation && <p className="mt-1 text-sm opacity-90">{explanation}</p>}
        </div>
      )}

      <div className="mt-5 flex justify-end">
        <button
          ref={buttonRef}
          type="submit"
          disabled={!answered && !canCheck}
          className={buttonClass({ variant: answered && status === 'correct' ? 'success' : 'primary' })}
        >
          {!answered ? 'Comprobar' : isLast ? (flow?.nextLabel ?? 'Terminar ejercicio') : 'Continuar'}
        </button>
      </div>
    </form>
  )
}

export function ExerciseDone({ correct, total }: { correct: number; total: number }) {
  const pct = total ? Math.round((correct / total) * 100) : 100
  return (
    <div className="flex flex-col items-center py-6 text-center">
      <div className={`grid h-14 w-14 place-items-center rounded-full ${pct >= 70 ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'}`}>
        <Trophy className="h-7 w-7" />
      </div>
      <p className="mt-3 text-lg font-bold text-slate-900">
        {correct} / {total} correctas
      </p>
      <p className="text-sm text-slate-500">{pct >= 70 ? '¡Muy bien!' : 'Sigue practicando: la próxima vez saldrá mejor.'}</p>
    </div>
  )
}

export const inputCls = `${inputClass()} text-lg`
