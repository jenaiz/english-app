import { Volume2 } from 'lucide-react'
import { canSpeak, speak } from '../lib/speech'

/** Round button that reads a text aloud. It doesn't propagate the click, so it can sit inside flip cards. */
export default function SpeakButton({ text, dark }: { text: string; dark?: boolean }) {
  if (!canSpeak) return null
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation()
        speak(text)
      }}
      aria-label={`Escuchar: ${text}`}
      className={`grid h-9 w-9 shrink-0 place-items-center rounded-full transition ${
        dark ? 'bg-white/15 text-white hover:bg-white/25' : 'bg-slate-900/5 text-slate-700 hover:bg-slate-900/10'
      }`}
    >
      <Volume2 className="h-4 w-4" />
    </button>
  )
}
