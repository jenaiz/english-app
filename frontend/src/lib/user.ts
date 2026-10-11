import type { User } from '../types'

/** First chunk of the email's local part, capitalized: "ana.garcia@x.com" → "Ana". */
function nameFromEmail(email: string) {
  const s = email.split('@')[0].split(/[.\-_+]/)[0]
  return s.charAt(0).toUpperCase() + s.slice(1)
}

/** Name shown in the app: the one chosen in Settings, or one derived from the email. */
export function displayName(user: User) {
  return user.name || nameFromEmail(user.email)
}

/** Name used to greet the user ("Hola, Ana"). */
export function firstName(user: User) {
  return user.name ? user.name.split(' ')[0] : nameFromEmail(user.email)
}
