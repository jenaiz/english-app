// The last email that signed in on this device, to prefill the login form. Browser
// storage can be unavailable (private mode, blocked site data), so every access is guarded.
const KEY = 'fluently.lastEmail'

export function getLastEmail(): string {
  try {
    return localStorage.getItem(KEY) ?? ''
  } catch {
    return ''
  }
}

export function setLastEmail(email: string) {
  try {
    localStorage.setItem(KEY, email)
  } catch {
    // not available: the browser's own autofill still works
  }
}

export function forgetLastEmail() {
  try {
    localStorage.removeItem(KEY)
  } catch {
    // ignore
  }
}
