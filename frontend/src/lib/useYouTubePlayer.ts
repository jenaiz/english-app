import { useCallback, useEffect, useRef, useState } from 'react'

// The parts of the YouTube IFrame API we use (https://developers.google.com/youtube/iframe_api_reference).
interface YTPlayer {
  playVideo(): void
  pauseVideo(): void
  seekTo(seconds: number, allowSeekAhead: boolean): void
  getCurrentTime(): number
  setPlaybackRate(rate: number): void
  destroy(): void
}
interface YTNamespace {
  Player: new (
    el: HTMLElement,
    opts: {
      host?: string
      videoId: string
      playerVars?: Record<string, string | number>
      events?: { onReady?: () => void; onStateChange?: (e: { data: number }) => void; onError?: (e: { data: number }) => void }
    },
  ) => YTPlayer
}
declare global {
  interface Window {
    YT?: YTNamespace
    onYouTubeIframeAPIReady?: () => void
  }
}

const PLAYING = 1

let apiPromise: Promise<YTNamespace> | null = null

/** Loads the IFrame API script once. */
function loadApi(): Promise<YTNamespace> {
  if (window.YT?.Player) return Promise.resolve(window.YT)
  if (!apiPromise) {
    apiPromise = new Promise((resolve, reject) => {
      const prev = window.onYouTubeIframeAPIReady
      window.onYouTubeIframeAPIReady = () => {
        prev?.()
        resolve(window.YT!)
      }
      const script = document.createElement('script')
      script.src = 'https://www.youtube.com/iframe_api'
      script.async = true
      script.onerror = () => {
        apiPromise = null
        reject(new Error('YouTube API failed to load'))
      }
      document.head.appendChild(script)
    })
  }
  return apiPromise
}

interface Options {
  videoId: string
  /** Seconds where playback starts. */
  start?: number
  /** Called about every 200 ms while the video plays, with the current time. */
  onTime?: (t: number) => void
}

/**
 * A YouTube player (privacy-enhanced mode, youtube-nocookie.com) mounted into the returned ref
 * once `load()` is called: nothing is fetched from YouTube before the learner asks for it.
 */
export function useYouTubePlayer({ videoId, start, onTime }: Options) {
  const mountRef = useRef<HTMLDivElement>(null)
  const playerRef = useRef<YTPlayer | null>(null)
  const onTimeRef = useRef(onTime)
  onTimeRef.current = onTime
  const [requested, setRequested] = useState(false)
  const [ready, setReady] = useState(false)
  const [playing, setPlaying] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!requested || !mountRef.current) return
    let cancelled = false
    const container = mountRef.current
    const el = document.createElement('div')
    container.appendChild(el)
    loadApi()
      .then((YT) => {
        if (cancelled) return
        playerRef.current = new YT.Player(el, {
          host: 'https://www.youtube-nocookie.com',
          videoId,
          playerVars: { start: Math.floor(start ?? 0), rel: 0, playsinline: 1, modestbranding: 1, cc_load_policy: 0, iv_load_policy: 3 },
          events: {
            onReady: () => {
              if (cancelled) return
              setReady(true)
              playerRef.current?.playVideo()
            },
            onStateChange: (e) => setPlaying(e.data === PLAYING),
            onError: (e) => setError(playerError(e.data)),
          },
        })
      })
      .catch(() => setError('No se pudo cargar YouTube: revisa tu conexión o si un bloqueador lo impide'))
    return () => {
      cancelled = true
      playerRef.current?.destroy()
      playerRef.current = null
      container.replaceChildren()
      setReady(false)
      setPlaying(false)
    }
  }, [requested, videoId, start])

  useEffect(() => {
    if (!playing) return
    const id = window.setInterval(() => {
      const p = playerRef.current
      if (p) onTimeRef.current?.(p.getCurrentTime())
    }, 200)
    return () => window.clearInterval(id)
  }, [playing])

  const play = useCallback(() => playerRef.current?.playVideo(), [])
  const pause = useCallback(() => playerRef.current?.pauseVideo(), [])
  const seek = useCallback((t: number, andPlay = true) => {
    const p = playerRef.current
    if (!p) return
    p.seekTo(t, true)
    onTimeRef.current?.(t)
    if (andPlay) p.playVideo()
  }, [])
  const setRate = useCallback((r: number) => playerRef.current?.setPlaybackRate(r), [])
  const time = useCallback(() => playerRef.current?.getCurrentTime() ?? 0, [])

  return { mountRef, load: () => setRequested(true), requested, ready, playing, error, play, pause, seek, setRate, time }
}

/** What a YouTube player error code means for the learner. */
function playerError(code: number): string {
  switch (code) {
    case 100:
      return 'Este vídeo ya no está disponible en YouTube'
    case 101:
    case 150:
      return 'El autor de este vídeo no permite verlo fuera de YouTube'
    default:
      return `YouTube no ha podido reproducir el vídeo (error ${code})`
  }
}

/** Index of the line being played at time t: the last one that has started. */
export function activeLine(lines: { t: number }[], t: number): number {
  let i = -1
  for (let j = 0; j < lines.length && lines[j].t <= t + 0.15; j++) i = j
  return i
}
