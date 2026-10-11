import { api } from '../api/client'

export interface PublicConfig {
  /** OAuth client ID for "Sign in with Google" ("" when not configured). */
  googleClientId: string
  /** GA4 measurement ID ("" when analytics is not configured). */
  gaMeasurementId: string
}

let configPromise: Promise<PublicConfig> | null = null

/** Runtime config from the backend. Fetched once; falls back to everything disabled. */
export function publicConfig(): Promise<PublicConfig> {
  configPromise ??= api
    .authConfig()
    .then((c) => ({ googleClientId: c.google_client_id ?? '', gaMeasurementId: c.ga_measurement_id ?? '' }))
    .catch(() => ({ googleClientId: '', gaMeasurementId: '' }))
  return configPromise
}
