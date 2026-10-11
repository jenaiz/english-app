// Cookie consent stored in localStorage. Bump CONSENT_VERSION when the cookie
// policy changes in a way that needs asking again.
export const CONSENT_VERSION = 1
const KEY = 'cookie-consent'
/** Ask again after 12 months (AEPD recommends at most 24). */
const MAX_AGE_MS = 365 * 24 * 60 * 60 * 1000

export interface Consent {
  version: number
  /** ISO date of the decision. */
  date: string
  analytics: boolean
}

/** The stored decision, or null if there is none or it is outdated/expired. */
export function getConsent(): Consent | null {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return null
    const c = JSON.parse(raw) as Consent
    if (c.version !== CONSENT_VERSION) return null
    if (Date.now() - new Date(c.date).getTime() > MAX_AGE_MS) return null
    return c
  } catch {
    return null
  }
}

export function saveConsent(prefs: Pick<Consent, 'analytics'>): Consent {
  const c: Consent = { version: CONSENT_VERSION, date: new Date().toISOString(), analytics: prefs.analytics }
  try {
    localStorage.setItem(KEY, JSON.stringify(c))
  } catch {
    // Storage blocked: the choice still applies for this page view.
  }
  return c
}
