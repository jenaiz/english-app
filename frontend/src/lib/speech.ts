import { useCallback, useEffect, useRef, useState } from 'react'

export const canSpeak = typeof window !== 'undefined' && 'speechSynthesis' in window

/** Speak one or more texts in en-US. Returns a promise that resolves when done. */
export function speak(texts: string | string[], rate = 0.95): Promise<void> {
  if (!canSpeak) return Promise.resolve()
  const list = Array.isArray(texts) ? texts : [texts]
  window.speechSynthesis.cancel()
  return new Promise((resolve) => {
    list.forEach((text, i) => {
      const u = new SpeechSynthesisUtterance(text)
      u.lang = 'en-US'
      u.rate = rate
      if (i === list.length - 1) {
        u.onend = () => resolve()
        u.onerror = () => resolve()
      }
      window.speechSynthesis.speak(u)
    })
  })
}

export function stopSpeaking() {
  if (canSpeak) window.speechSynthesis.cancel()
}

// Minimal typing for the Web Speech recognition API (not in lib.dom for all browsers).
interface RecognitionResultEvent {
  results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }>
}
interface Recognition {
  lang: string
  maxAlternatives: number
  interimResults: boolean
  continuous: boolean
  start(): void
  stop(): void
  onresult: ((e: RecognitionResultEvent) => void) | null
  onend: (() => void) | null
  onerror: ((e: { error: string }) => void) | null
}
type RecognitionCtor = new () => Recognition

const RecognitionImpl: RecognitionCtor | undefined =
  typeof window !== 'undefined'
    ? ((window as unknown as Record<string, RecognitionCtor | undefined>).SpeechRecognition ??
      (window as unknown as Record<string, RecognitionCtor | undefined>).webkitSpeechRecognition)
    : undefined

export function useSpeechRecognition() {
  const [listening, setListening] = useState(false)
  const [transcript, setTranscript] = useState('')
  // Alternative full transcripts of the utterance (the recognizer's other guesses).
  const [alternatives, setAlternatives] = useState<string[]>([])
  const [error, setError] = useState('')
  const recRef = useRef<Recognition | null>(null)

  useEffect(() => () => recRef.current?.stop(), [])

  const start = useCallback(() => {
    if (!RecognitionImpl) return
    recRef.current?.stop()
    const rec = new RecognitionImpl()
    rec.lang = 'en-US'
    rec.interimResults = true
    rec.continuous = false
    rec.maxAlternatives = 5
    rec.onresult = (e) => {
      const results = Array.from(e.results)
      const prefix = results.slice(0, -1).map((r) => r[0].transcript).join(' ')
      const last = results[results.length - 1]
      setTranscript(results.map((r) => r[0].transcript).join(' '))
      setAlternatives(Array.from(last).map((alt) => `${prefix} ${alt.transcript}`.trim()))
    }
    rec.onerror = (e) => setError(e.error === 'not-allowed' ? 'Permiso de micrófono denegado' : e.error)
    rec.onend = () => setListening(false)
    recRef.current = rec
    setTranscript('')
    setAlternatives([])
    setError('')
    setListening(true)
    rec.start()
  }, [])

  const stop = useCallback(() => recRef.current?.stop(), [])

  const reset = useCallback(() => {
    setTranscript('')
    setAlternatives([])
  }, [])

  return { supported: !!RecognitionImpl, listening, transcript, alternatives, error, start, stop, reset }
}
