import { useEffect, useState } from 'react'
import { api } from '../api/client'

/**
 * CEFR level the user is studying: the level of the unit of their most recent lesson, or A1 (where the course
 * starts) before their first lesson. undefined while loading; null when signed out or on error.
 */
export function useLearnerLevel(enabled: boolean) {
  const [level, setLevel] = useState<string | null | undefined>(enabled ? undefined : null)

  useEffect(() => {
    if (!enabled) {
      setLevel(null)
      return
    }
    let cancelled = false
    Promise.all([api.levels(), api.progress()])
      .then(([levels, progress]) => {
        const recent = progress.lessons[0]
        const found = recent && levels.find((l) => l.themes.some((t) => t.units.some((u) => u.unit_id === recent.unit_id)))
        if (!cancelled) setLevel(found ? found.level_id : recent ? null : 'A1')
      })
      .catch(() => !cancelled && setLevel(null))
    return () => {
      cancelled = true
    }
  }, [enabled])

  return level
}
