import { useEffect, useMemo, useState } from 'react'
import { Copy, Timer } from 'lucide-react'
import VideoFrame from '../components/club/VideoFrame'
import { activeLine, useYouTubePlayer } from '../lib/useYouTubePlayer'

const idOf = (s: string) => {
  try {
    const u = new URL(s)
    return u.searchParams.get('v') ?? u.pathname.split('/').filter(Boolean).pop() ?? s
  } catch {
    return s.trim()
  }
}

/**
 * Dev-only tool (/club/dev/timing) to time song lines by hand when a video has no usable
 * subtitles: play the video and press Space as each line starts. Copy the JSON into the activity.
 */
export default function ClubTiming() {
  const [url, setUrl] = useState('')
  const [lyrics, setLyrics] = useState('')
  const [times, setTimes] = useState<number[]>([])
  const [end, setEnd] = useState<number | null>(null)
  const [now, setNow] = useState(0)
  const [copied, setCopied] = useState(false)
  const videoId = idOf(url)
  const lines = useMemo(() => lyrics.split('\n').map((l) => l.trim()).filter(Boolean), [lyrics])
  const player = useYouTubePlayer({ videoId, onTime: setNow })

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLElement && e.target.closest('input, textarea')) return
      const t = Math.round(player.time() * 10) / 10
      if (e.code === 'Space') {
        e.preventDefault()
        setTimes((ts) => (ts.length < lines.length ? [...ts, t] : ts))
      } else if (e.code === 'Backspace') {
        setTimes((ts) => ts.slice(0, -1))
      } else if (e.key === 'e') {
        setEnd(t)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [player, lines.length])

  const timed = times.map((t, i) => ({ t, text: lines[i] }))
  const json = JSON.stringify({ start: Math.max(0, Math.floor((times[0] ?? 3) - 3)), end, lines: timed }, null, 2)
  const current = activeLine(timed, now)

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="flex items-center gap-2 font-display text-3xl font-bold text-slate-900">
        <Timer className="h-7 w-7 text-rose-500" /> Marcar tiempos (dev)
      </h1>
      <p className="mt-2 text-slate-600">
        Pega el vídeo y la letra (una línea por fila). Reproduce y pulsa <kbd className="rounded bg-slate-200 px-1.5">Espacio</kbd> cuando empiece cada línea,{' '}
        <kbd className="rounded bg-slate-200 px-1.5">⌫</kbd> para deshacer la última y <kbd className="rounded bg-slate-200 px-1.5">E</kbd> para marcar el final del fragmento.
      </p>
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="space-y-3">
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="URL o id de YouTube"
            className="w-full rounded-lg border border-slate-300 px-3 py-2"
          />
          {videoId && <VideoFrame key={videoId} player={player} videoId={videoId} label="vídeo" />}
          <textarea
            value={lyrics}
            onChange={(e) => {
              setLyrics(e.target.value)
              setTimes([])
            }}
            rows={10}
            placeholder="Letra del fragmento, una línea por fila"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm"
          />
        </div>
        <div className="space-y-3">
          <ol className="rounded-2xl border border-slate-200 bg-white p-3 text-sm">
            {lines.map((l, i) => (
              <li key={i} className={`flex gap-3 rounded-lg px-2 py-1 ${i === current ? 'bg-rose-50' : ''} ${i === times.length ? 'ring-2 ring-rose-300' : ''}`}>
                <button type="button" className="w-12 shrink-0 text-right text-slate-400 tabular-nums" onClick={() => times[i] !== undefined && player.seek(times[i])}>
                  {times[i]?.toFixed(1) ?? '—'}
                </button>
                <span>{l}</span>
              </li>
            ))}
            {end !== null && <li className="px-2 py-1 text-slate-400">fin: {end.toFixed(1)}</li>}
          </ol>
          <div className="relative">
            <pre className="max-h-80 overflow-auto rounded-2xl bg-slate-900 p-4 text-xs text-slate-100">{json}</pre>
            <button
              type="button"
              onClick={() => navigator.clipboard.writeText(json).then(() => setCopied(true))}
              className="absolute top-2 right-2 flex items-center gap-1 rounded-lg bg-white/10 px-2 py-1 text-xs text-white hover:bg-white/20"
            >
              <Copy className="h-3.5 w-3.5" /> {copied ? 'Copiado' : 'Copiar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
