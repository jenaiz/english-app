import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Sparkles } from 'lucide-react'
import { loadExpressions } from '../../lib/expressionsCatalog'

interface PhrasalMatch {
  term: string
  root: string
  particle: string
  familySize: number
}

/** Terms of the table that are phrasal verbs with a family in Expresiones ("Turn off" → turn). */
function usePhrasalMatches(terms: string[]) {
  const [matches, setMatches] = useState<PhrasalMatch[]>([])
  const key = terms.join('|')
  useEffect(() => {
    loadExpressions()
      .then((cat) => {
        const found: PhrasalMatch[] = []
        for (const term of terms) {
          const t = term.trim().toLowerCase()
          for (const f of cat.phrasal_verbs) {
            const v = f.items.find((it) => `${f.root} ${it.particle}` === t)
            if (v) found.push({ term, root: f.root, particle: v.particle, familySize: f.items.length })
          }
        }
        setMatches(found)
      })
      .catch(() => setMatches([]))
  }, [key])
  return matches
}

/**
 * Links from a unit's phrasal verbs to their family in Expresiones. Inside a lesson they open in a
 * new tab (newTab) so the lesson in progress isn't lost.
 */
export default function PhrasalFamilyLinks({ terms, newTab }: { terms: string[]; newTab?: boolean }) {
  const phrasal = usePhrasalMatches(terms)
  if (phrasal.length === 0) return null
  return (
    <div className="mt-6 rounded-2xl bg-indigo-50 p-4">
      <p className="flex items-center gap-2 text-sm font-semibold text-indigo-900">
        <Sparkles className="h-4 w-4 text-indigo-600" /> Explora sus familias en Expresiones
      </p>
      <p className="mt-1 text-sm text-indigo-800/80">Mira qué significan con otras partículas y añádelos a tu repaso.</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {phrasal.map((m) => (
          <Link
            key={m.term}
            to={`/expresiones?tab=phrasal&verbo=${encodeURIComponent(m.root)}&particula=${encodeURIComponent(m.particle)}`}
            {...(newTab ? { target: '_blank', rel: 'noopener' } : {})}
            className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-sm font-medium text-indigo-700 shadow-sm ring-1 ring-indigo-100 transition hover:ring-indigo-300"
          >
            {m.root} {m.particle}
            {m.familySize > 1 && <span className="text-indigo-400">y {m.familySize - 1} más</span>} <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        ))}
      </div>
    </div>
  )
}
