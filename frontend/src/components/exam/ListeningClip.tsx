import { useEffect, useState } from 'react'
import { Headphones, Loader2, Play } from 'lucide-react'
import { playAudioFiles, stopSpeaking } from '../../lib/speech'

const key = (attemptId: string, partId: string) => `exam-plays:${attemptId}:${partId}`

function readPlays(k: string) {
  try {
    return Number(localStorage.getItem(k)) || 0
  } catch {
    return 0
  }
}

/**
 * A listening as in an official exam: no transcript and a limited number of plays. The count
 * survives a reload of the page on this device.
 */
export default function ListeningClip({ attemptId, partId, files, maxPlays }: { attemptId: string; partId: string; files: string[]; maxPlays: number }) {
  const k = key(attemptId, partId)
  const [plays, setPlays] = useState(() => readPlays(k))
  const [playing, setPlaying] = useState(false)
  const [blocked, setBlocked] = useState(false)
  const left = Math.max(0, maxPlays - plays)

  useEffect(() => () => stopSpeaking(), [])

  const play = async () => {
    const n = plays + 1
    setPlays(n)
    try {
      localStorage.setItem(k, String(n))
    } catch {
      // storage unavailable: the count lasts until reload
    }
    setPlaying(true)
    setBlocked(false)
    const ok = await playAudioFiles(files)
    setPlaying(false)
    // A blocked or interrupted play doesn't count.
    if (!ok) {
      setBlocked(true)
      setPlays(n - 1)
      try {
        localStorage.setItem(k, String(n - 1))
      } catch {
        // ignore
      }
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-4 rounded-2xl bg-slate-900 p-4 text-white">
      <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-white/10">
        {playing ? <Loader2 className="h-6 w-6 animate-spin" /> : <Headphones className="h-6 w-6" />}
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-semibold">{playing ? 'Escuchando…' : left > 0 ? 'Audio de la conversación' : 'Ya has escuchado la conversación'}</p>
        <p className="text-sm text-slate-300">
          {left === 1 ? 'Te queda 1 escucha.' : `Te quedan ${left} escuchas.`}
          {blocked && ' El navegador no dejó reproducir el audio; vuelve a pulsar.'}
        </p>
      </div>
      <button
        type="button"
        onClick={play}
        disabled={playing || left === 0}
        className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-2.5 font-semibold text-slate-900 transition hover:bg-indigo-50 focus-visible:ring-4 focus-visible:ring-indigo-300 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-40"
      >
        <Play className="h-4 w-4 fill-current" /> {plays === 0 ? 'Escuchar' : 'Escuchar otra vez'}
      </button>
    </div>
  )
}
