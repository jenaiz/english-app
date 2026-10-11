// Google Analytics 4, injected only after the user consents to analytics cookies.

type Gtag = (...args: unknown[]) => void
declare global {
  interface Window {
    dataLayer?: unknown[]
    gtag?: Gtag
  }
}

let loadedId: string | null = null

export function enableAnalytics(id: string) {
  const w = window as unknown as Record<string, unknown>
  w[`ga-disable-${id}`] = false
  if (loadedId === id) return
  loadedId = id

  window.dataLayer = window.dataLayer ?? []
  window.gtag = function gtag() {
    // gtag.js expects the `arguments` object, not an array.
    // eslint-disable-next-line prefer-rest-params
    window.dataLayer!.push(arguments)
  }
  window.gtag('js', new Date())
  // GA4 never stores IP addresses, so there is no anonymize_ip option to set.
  window.gtag('config', id, {
    allow_google_signals: false,
    allow_ad_personalization_signals: false,
    // Page views are sent by trackPageView on route changes.
    send_page_view: false,
  })

  const script = document.createElement('script')
  script.async = true
  script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(id)}`
  document.head.appendChild(script)
}

/** Stops collection and removes the GA cookies set on this site. */
export function disableAnalytics(id: string) {
  ;(window as unknown as Record<string, unknown>)[`ga-disable-${id}`] = true
  const host = location.hostname
  // GA sets its cookies on the widest domain it can, so try every parent domain.
  const domains = ['', ...host.split('.').map((_, i, parts) => '.' + parts.slice(i).join('.'))]
  for (const cookie of document.cookie.split(';')) {
    const name = cookie.split('=')[0].trim()
    if (name !== '_ga' && !name.startsWith('_ga_') && name !== '_gid') continue
    for (const d of domains) {
      document.cookie = `${name}=; Max-Age=0; path=/${d ? `; domain=${d}` : ''}`
    }
  }
}

export function trackPageView(path: string) {
  if (!loadedId || !window.gtag) return
  window.gtag('event', 'page_view', { page_path: path, page_location: location.href, page_title: document.title })
}

/**
 * Product events (GA4). Sent only when the user has accepted analytics cookies; otherwise a no-op.
 * Params hold ids and counts, never personal data.
 */
export function trackEvent(name: string, params: Record<string, string | number | boolean> = {}) {
  // In development, show what would be sent, to check events without GA.
  if (import.meta.env.DEV) console.debug('[analytics]', name, params)
  if (!loadedId || !window.gtag) return
  window.gtag('event', name, params)
}
