import type { Grade, LevelSummary, ProgressResponse, ReviewCard, SrsSummary, UnitResponse, User } from '../types'

export class ApiError extends Error {
  constructor(public status: number, message: string) {
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
    try {
      const body = await res.json()
      if (body?.error) message = body.error
    } catch {
      // non-JSON error body
    }
    throw new ApiError(res.status, message)
  }
  if (res.status === 204) return undefined as T
  return res.json() as Promise<T>
}

const post = <T>(path: string, body?: unknown) =>
  request<T>(path, { method: 'POST', body: body === undefined ? undefined : JSON.stringify(body) })

export const api = {
  register: (email: string, password: string) => post<{ user: User }>('/auth/register', { email, password }),
  login: (email: string, password: string) => post<{ user: User }>('/auth/login', { email, password }),
  logout: () => post<void>('/auth/logout'),
  me: () => request<User>('/auth/me'),
  levels: () => request<LevelSummary[]>('/levels'),
  unit: (levelId: string | null, unitId: string) =>
    request<UnitResponse>(`/levels/${encodeURIComponent(levelId || '-')}/units/${encodeURIComponent(unitId)}`),
  progress: () => request<ProgressResponse>('/progress'),
  complete: (unitId: string, lessonId?: string, score?: number) =>
    post<{ unit_id: string; completed_lessons: string[]; cards_added: number }>('/progress/complete', {
      unit_id: unitId,
      ...(lessonId ? { lesson_id: lessonId } : {}),
      ...(score !== undefined ? { score } : {}),
    }),
  srsSummary: () => request<SrsSummary>('/srs/summary'),
  srsDue: (limit = 20) => request<ReviewCard[]>(`/srs/due?limit=${limit}`),
  srsReview: (cardId: string, grade: Grade) =>
    post<{ due_at: string; interval_days: number }>('/srs/review', { card_id: cardId, grade }),
}
