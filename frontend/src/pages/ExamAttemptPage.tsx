import { useCallback, useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { api } from '../api/client'
import ExamResults from '../components/exam/ExamResults'
import ExamRunner from '../components/exam/ExamRunner'
import { trackEvent } from '../lib/analytics'
import type { ExamAttempt } from '../types'
import ErrorState from '../components/ui/ErrorState'

/** An attempt: the paper while it is open, its results once handed in. */
export default function ExamAttemptPage() {
  const { attemptId = '' } = useParams()
  const [attempt, setAttempt] = useState<ExamAttempt | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    api
      .examAttempt(attemptId)
      .then(setAttempt)
      .catch((e: Error) => setError(e.message))
  }, [attemptId])

  const done = useCallback((a: ExamAttempt) => {
    if (a.status === 'submitted' && a.result) {
      trackEvent('exam_submit', { exam_id: a.exam_id, score: a.result.score, passed: a.result.passed })
      if (a.unlocked_activities?.length) window.dispatchEvent(new Event('club-changed'))
    }
    window.scrollTo({ top: 0 })
    setAttempt(a)
  }, [])

  if (error) {
    return (
      <ErrorState />
    )
  }
  if (!attempt) {
    return (
      <div className="flex justify-center py-24 text-indigo-500">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }
  return attempt.status === 'open' ? <ExamRunner attempt={attempt} onDone={done} /> : <ExamResults attempt={attempt} />
}
