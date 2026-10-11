import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { api } from '../api/client'
import type { SrsSummary } from '../types'

/** Due/total SRS counts; refreshes on navigation and when a review is graded. */
export function useSrsSummary(enabled: boolean) {
  const [summary, setSummary] = useState<SrsSummary | null>(null)
  const { pathname } = useLocation()

  useEffect(() => {
    if (!enabled) {
      setSummary(null)
      return
    }
    const load = () => api.srsSummary().then(setSummary).catch(() => {})
    load()
    window.addEventListener('srs-changed', load)
    return () => window.removeEventListener('srs-changed', load)
  }, [enabled, pathname])

  return summary
}
