import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useLocation } from 'react-router-dom'
import { disableAnalytics, enableAnalytics, trackPageView } from '../lib/analytics'
import { getConsent, saveConsent, type Consent } from '../lib/consent'
import { publicConfig } from '../lib/publicConfig'

interface ConsentContextValue {
  /** The user's decision, or null while they haven't made one. */
  consent: Consent | null
  /** GA4 ID ("" when analytics is not configured, so there is nothing to consent to). */
  gaMeasurementId: string
  acceptAll: () => void
  rejectAll: () => void
  save: (prefs: { analytics: boolean }) => void
  preferencesOpen: boolean
  openPreferences: () => void
  closePreferences: () => void
}

const ConsentContext = createContext<ConsentContextValue | null>(null)

export function ConsentProvider({ children }: { children: ReactNode }) {
  const [consent, setConsent] = useState<Consent | null>(() => getConsent())
  const [gaMeasurementId, setGaMeasurementId] = useState('')
  const [preferencesOpen, setPreferencesOpen] = useState(false)
  const location = useLocation()

  useEffect(() => {
    let alive = true
    publicConfig().then((c) => alive && setGaMeasurementId(c.gaMeasurementId))
    return () => {
      alive = false
    }
  }, [])

  const analyticsOn = !!gaMeasurementId && !!consent?.analytics

  useEffect(() => {
    if (!gaMeasurementId) return
    if (analyticsOn) enableAnalytics(gaMeasurementId)
    else disableAnalytics(gaMeasurementId)
  }, [analyticsOn, gaMeasurementId])

  useEffect(() => {
    if (analyticsOn) trackPageView(location.pathname + location.search)
  }, [analyticsOn, location.pathname, location.search])

  const save = useCallback((prefs: { analytics: boolean }) => {
    setConsent(saveConsent(prefs))
    setPreferencesOpen(false)
  }, [])

  const acceptAll = useCallback(() => save({ analytics: true }), [save])
  const rejectAll = useCallback(() => save({ analytics: false }), [save])
  const openPreferences = useCallback(() => setPreferencesOpen(true), [])
  const closePreferences = useCallback(() => setPreferencesOpen(false), [])

  const value = useMemo<ConsentContextValue>(
    () => ({ consent, gaMeasurementId, acceptAll, rejectAll, save, preferencesOpen, openPreferences, closePreferences }),
    [consent, gaMeasurementId, acceptAll, rejectAll, save, preferencesOpen, openPreferences, closePreferences],
  )

  return <ConsentContext.Provider value={value}>{children}</ConsentContext.Provider>
}

export function useConsent() {
  const ctx = useContext(ConsentContext)
  if (!ctx) throw new Error('useConsent must be used inside ConsentProvider')
  return ctx
}
