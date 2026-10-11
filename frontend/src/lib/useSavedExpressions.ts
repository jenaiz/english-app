import { useCallback, useEffect, useState } from 'react'
import { api } from '../api/client'
import { trackEvent } from './analytics'
import type { ReviewStatus } from '../components/expressions/AddToReview'
import type { ExpressionKind } from '../types'

/** Expressions the user has added to Repaso (with their repetitions and whether they are queued), and a function to add more. */
/** Where an expression was added to Repaso from. */
export type AddSource = 'catalog' | 'today' | 'pack' | 'unit'

export function useSavedExpressions(enabled: boolean) {
  const [saved, setSaved] = useState<Map<string, number>>(new Map())
  const [queued, setQueued] = useState<Set<string>>(new Set())
  const [addedAt, setAddedAt] = useState<Map<string, number>>(new Map())

  useEffect(() => {
    if (!enabled) {
      setSaved(new Map())
      setQueued(new Set())
      setAddedAt(new Map())
      return
    }
    api
      .savedExpressions()
      .then((r) => {
        const all = [...r.idiom.map((e) => ({ ...e, key: `idiom:${e.id}` })), ...r.phrasal.map((e) => ({ ...e, key: `phrasal:${e.id}` }))]
        setSaved(new Map(all.map((e) => [e.key, e.repetitions])))
        setQueued(new Set(all.filter((e) => e.queued).map((e) => e.key)))
        setAddedAt(new Map(all.map((e) => [e.key, new Date(e.added_at).getTime()])))
      })
      .catch(() => {})
  }, [enabled])

  const isSaved = useCallback((kind: ExpressionKind, id: string) => saved.has(`${kind}:${id}`), [saved])
  const isQueued = useCallback((kind: ExpressionKind, id: string) => queued.has(`${kind}:${id}`), [queued])
  const repetitionsOf = useCallback((kind: ExpressionKind, id: string) => saved.get(`${kind}:${id}`), [saved])
  /** source says where the learner added it from, for analytics. */
  const add = useCallback(async (kind: ExpressionKind, id: string, source: AddSource = 'catalog') => {
    const r = await api.addExpression(kind, id)
    const key = `${kind}:${id}`
    setSaved((s) => new Map(s).set(key, 0))
    if (r.queued) setQueued((q) => new Set(q).add(key))
    setAddedAt((a) => (a.has(key) ? a : new Map(a).set(key, Date.now())))
    window.dispatchEvent(new Event('srs-changed'))
    if (r.added) trackEvent('add_to_review', { expression_kind: kind, expression_id: id, source, queued: r.queued })
  }, [])

  const statusOf = useCallback(
    (kind: ExpressionKind, id: string): ReviewStatus => (isQueued(kind, id) ? 'queued' : isSaved(kind, id) ? 'saved' : 'none'),
    [isSaved, isQueued],
  )

  /** Added on an earlier day: those leave today's selection, the ones added today stay in it. */
  const addedBeforeToday = useCallback(
    (kind: ExpressionKind, id: string) => {
      const t = addedAt.get(`${kind}:${id}`)
      return t !== undefined && t < new Date().setHours(0, 0, 0, 0)
    },
    [addedAt],
  )

  return { statusOf, repetitionsOf, add, addedBeforeToday }
}
