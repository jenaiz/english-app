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
  playback++
  currentAudio?.pause()
  currentAudio = null
  if (canSpeak) window.speechSynthesis.cancel()
}

// --- Story dialogues: each speaker has a fixed voice (backend/data/voices.json) ---

export interface DialogueLine {
  speaker: string
  text: string
}

interface VoiceInfo {
  voice: string
  lang: string
  gender: 'male' | 'female'
}

/** Bumped by stopSpeaking so a running playLines stops before its next line. */
let playback = 0
let currentAudio: HTMLAudioElement | null = null
let voiceMap: Promise<Record<string, VoiceInfo>> | null = null

function voices() {
  voiceMap ??= fetch('/api/voices')
    .then((r) => (r.ok ? r.json() : {}))
    .catch(() => ({}))
  return voiceMap
}

/**
 * Play dialogue lines in order with each speaker's pre-generated MP3. If a file is
 * missing (not generated yet) the line falls back to a browser voice of the same
 * accent and gender. Resolves when done or when stopSpeaking is called.
 */
export async function playLines(lines: DialogueLine[]): Promise<void> {
  stopSpeaking()
  const run = playback
  const map = await voices()
  for (const line of lines) {
    if (run !== playback) return
    const ok = await playMp3(line, run)
    if (!ok && run === playback) await speakAs(line, map[line.speaker])
  }
}

function playMp3({ speaker, text }: DialogueLine, run: number): Promise<boolean> {
  return new Promise((resolve) => {
    const audio = new Audio(`/api/audio?${new URLSearchParams({ speaker, text })}`)
    currentAudio = audio
    audio.onended = () => resolve(true)
    audio.onpause = () => resolve(true)
    audio.onerror = () => resolve(false)
    if (run !== playback) return resolve(true)
    audio.play().catch(() => resolve(false))
  })
}

// Browser voice names hinting at gender; voices carry no gender field.
const MALE = /\b(male|daniel|arthur|oliver|rishi|fred|alex|tom|george|ryan|thomas|aaron|guy|david|mark|james)\b/i
const FEMALE = /\b(female|moira|karen|samantha|serena|kate|tessa|fiona|martha|sonia|libby|susan|hazel|zira|emily)\b/i

function speakAs({ text }: DialogueLine, info?: VoiceInfo): Promise<void> {
  if (!canSpeak) return Promise.resolve()
  const all = window.speechSynthesis.getVoices()
  const lang = info?.lang ?? 'en-GB'
  const sameLang = all.filter((v) => v.lang.replace('_', '-') === lang)
  const english = all.filter((v) => v.lang.startsWith('en'))
  const pool = sameLang.length ? sameLang : english
  const byGender = pool.filter((v) => (info?.gender === 'male' ? MALE : FEMALE).test(v.name))
  return new Promise((resolve) => {
    const u = new SpeechSynthesisUtterance(text)
    u.lang = lang
    u.voice = byGender[0] ?? pool[0] ?? null
    u.rate = 0.95
    u.onend = () => resolve()
    u.onerror = () => resolve()
    window.speechSynthesis.speak(u)
  })
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
