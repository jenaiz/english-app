import type { Activity, ActivityCard, CardKind, ClubSummary, ExamAttempt, ExamSummary, UnlockedActivity, ExpressionKind, ExpressionsCatalog, Grade, LevelStudy, LevelSummary, ProgressResponse, ReviewCard, UnitPosition, SavedExpression, SrsSummary, UnitResponse, User } from '../types'

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    /** Machine-readable error code from the backend, e.g. "email_not_verified". */
    public code?: string,
    /** The whole error body, for errors that carry extra fields. */
    public body?: Record<string, unknown>,
  ) {
    super(message)
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`/api${path}`, {
    credentials: 'include',
    ...options,
    headers: { 'Content-Type': 'application/json', ...options.headers },
  })
  if (!res.ok) {
    let message = res.statusText
    let body: Record<string, unknown> | undefined
    try {
      body = await res.json()
      if (typeof body?.error === 'string') message = body.error
    } catch {
      // non-JSON error body
    }
    throw new ApiError(res.status, message, typeof body?.code === 'string' ? body.code : undefined, body)
  }
  if (res.status === 204) return undefined as T
  return res.json() as Promise<T>
}

const post = <T>(path: string, body?: unknown) =>
  request<T>(path, { method: 'POST', body: body === undefined ? undefined : JSON.stringify(body) })

export const api = {
  register: (email: string, password: string) =>
    post<{ verification_sent: boolean; email: string }>('/auth/register', { email, password }),
  login: (email: string, password: string) => post<{ user: User }>('/auth/login', { email, password }),
  logout: () => post<void>('/auth/logout'),
  authConfig: () => request<{ google_client_id: string; ga_measurement_id?: string }>('/auth/config'),
  google: (credential: string, link = false) => post<{ user: User }>('/auth/google', { credential, link }),
  verifyEmail: (token: string) => post<{ user: User }>('/auth/verify-email', { token }),
  resendVerification: (email: string) => post<void>('/auth/resend-verification', { email }),
  forgotPassword: (email: string) => post<void>('/auth/forgot-password', { email }),
  resetPassword: (token: string, password: string) => post<{ user: User }>('/auth/reset-password', { token, password }),
  me: () => request<User>('/auth/me'),
  updateAccount: (name: string) => request<User>('/account', { method: 'PATCH', body: JSON.stringify({ name }) }),
  changePassword: (currentPassword: string, newPassword: string) =>
    post<void>('/account/password', { current_password: currentPassword, new_password: newPassword }),
  exportAccount: () => request<unknown>('/account/export'),
  deleteAccount: (password: string) => request<void>('/account', { method: 'DELETE', body: JSON.stringify({ password }) }),
  levels: () => request<LevelSummary[]>('/levels'),
  levelStudy: (levelId: string) => request<LevelStudy>(`/levels/${encodeURIComponent(levelId)}/study`),
  unit: (levelId: string | null, unitId: string) =>
    request<UnitResponse>(`/levels/${encodeURIComponent(levelId || '-')}/units/${encodeURIComponent(unitId)}`),
  progress: () => request<ProgressResponse>('/progress'),
  complete: (unitId: string, lessonId?: string, score?: number) =>
    post<{ unit_id: string; completed_lessons: string[]; cards_added: number; unlocked_activities?: UnlockedActivity[] }>('/progress/complete', {
      unit_id: unitId,
      ...(lessonId ? { lesson_id: lessonId } : {}),
      ...(score !== undefined ? { score } : {}),
    }),
  /** Where the learner left a unit half done (null if nowhere). */
  position: (unitId: string) => request<{ position: UnitPosition | null }>(`/progress/position/${encodeURIComponent(unitId)}`),
  savePosition: (unitId: string, p: UnitPosition) =>
    request<void>('/progress/position', { method: 'PUT', body: JSON.stringify({ unit_id: unitId, ...p }) }),
  club: () => request<{ activities: ActivityCard[] }>('/club'),
  clubSummary: () => request<ClubSummary>('/club/summary'),
  /** Opening an activity marks it as seen. 403 "locked" if it isn't unlocked yet. */
  activity: (id: string) => request<{ activity: Activity; card: ActivityCard }>(`/club/${encodeURIComponent(id)}`),
  completeActivity: (id: string, score: number) => post<{ best_score: number }>(`/club/${encodeURIComponent(id)}/complete`, { score }),
  exams: () => request<ExamSummary[]>('/exams'),
  /** Opens an attempt (or returns the open one). 409 "retake_wait" with retry_at while waiting. */
  startExam: (examId: string) => post<{ attempt_id: string }>(`/exams/${encodeURIComponent(examId)}/attempts`),
  examAttempt: (attemptId: string) => request<ExamAttempt>(`/exams/attempts/${encodeURIComponent(attemptId)}`),
  /** Autosave. 409 "attempt_closed" once the attempt is over. */
  saveExamAnswers: (attemptId: string, answers: Record<string, string>) =>
    request<void>(`/exams/attempts/${encodeURIComponent(attemptId)}/answers`, { method: 'PUT', body: JSON.stringify({ answers }) }),
  submitExam: (attemptId: string, answers: Record<string, string>) =>
    post<ExamAttempt>(`/exams/attempts/${encodeURIComponent(attemptId)}/submit`, { answers }),
  srsSummary: () => request<SrsSummary>('/srs/summary'),
  /** pack keeps only the due cards of that pack. */
  srsDue: (limit = 20, kind?: CardKind, pack?: string) =>
    request<ReviewCard[]>(`/srs/due?limit=${limit}${kind ? `&kind=${kind}` : ''}${pack ? `&pack=${encodeURIComponent(pack)}` : ''}`),
  srsReview: (cardId: string, grade: Grade) =>
    post<{ due_at: string; interval_days: number }>('/srs/review', { card_id: cardId, grade }),
  expressions: () => request<ExpressionsCatalog>('/expressions'),
  savedExpressions: () => request<Record<ExpressionKind, SavedExpression[]>>('/srs/expressions'),
  addExpression: (kind: ExpressionKind, id: string) =>
    post<{ kind: ExpressionKind; id: string; added: boolean; queued: boolean }>('/srs/expressions', { kind, id }),
}
