import { useEffect, useMemo, useState } from 'react'
import { Loader2, Plus, Sparkles } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { loadExpressions } from '../../lib/expressionsCatalog'
import { summaryOf, type ExpressionSummary } from '../../lib/todayPicks'
import { useSavedExpressions } from '../../lib/useSavedExpressions'
import type { ExpressionsCatalog } from '../../types'
import ExpressionTile from './ExpressionTile'

interface Props {
  unitId: string
  /** Vocabulary terms of the unit: expressions already taught as vocabulary aren't repeated here. */
  excludeTerms?: string[]
}

/**
 * The idioms and phrasal verbs that fit a unit's topic (unit_expressions.json), so they are learned
 * in context. Renders nothing for units without any.
 */
export default function UnitExpressions({ unitId, excludeTerms = [] }: Props) {
  const { user } = useAuth()
  const [catalog, setCatalog] = useState<ExpressionsCatalog | null>(null)
  const [busy, setBusy] = useState(false)
  const { statusOf, add } = useSavedExpressions(!!user)

  useEffect(() => {
    loadExpressions()
      .then(setCatalog)
      .catch(() => setCatalog(null))
  }, [])

  const excludeKey = excludeTerms.join('|').toLowerCase()
  const items = useMemo(() => {
    if (!catalog) return []
    const exclude = new Set(excludeKey.split('|').map((t) => t.trim()))
    return (catalog.unit_expressions[unitId] ?? [])
      .map((i) => summaryOf(catalog, i))
      .filter((x): x is ExpressionSummary => x !== null && !exclude.has(x.term.toLowerCase()))
  }, [catalog, unitId, excludeKey])

  if (items.length === 0) return null
  const pending = items.filter((i) => statusOf(i.kind, i.id) === 'none')

  const addAll = async () => {
    setBusy(true)
    try {
      for (const i of pending) await add(i.kind, i.id)
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="mt-6 rounded-3xl bg-indigo-50 p-5 md:p-6" aria-labelledby={`unit-expressions-${unitId}`}>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 id={`unit-expressions-${unitId}`} className="flex items-center gap-2 font-display text-lg font-bold text-indigo-950">
            <Sparkles className="h-5 w-5 text-indigo-600" /> Expresiones para esta situación
          </h2>
          <p className="mt-1 text-sm text-slate-600">Lo que diría un nativo aquí. Añádelas a tu repaso si quieres practicarlas.</p>
        </div>
        {user && pending.length > 1 && (
          <button
            type="button"
            onClick={addAll}
            disabled={busy}
            className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:opacity-60"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Añadir {pending.length === items.length ? `las ${items.length}` : `las ${pending.length} que faltan`}
          </button>
        )}
      </div>
      <div className={`mt-4 grid gap-4 ${items.length > 2 ? 'md:grid-cols-3' : 'sm:grid-cols-2'}`}>
        {items.map((i) => (
          <ExpressionTile key={`${i.kind}:${i.id}`} item={i} status={statusOf(i.kind, i.id)} onAdd={add} />
        ))}
      </div>
    </section>
  )
}
