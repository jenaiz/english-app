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
  player?.pause()
  settle?.('stopped')
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
// One audio element for every line: mobile browsers (iOS Safari) only let an element play
// without a fresh tap once it has played from one, so a new Audio() per line gets blocked.
let player: HTMLAudioElement | null = null
/** Resolves the line that is playing now; stopSpeaking calls it. */
let settle: ((r: LineResult) => void) | null = null
let voiceMap: Promise<Record<string, VoiceInfo>> | null = null

type LineResult = 'ok' | 'missing' | 'blocked' | 'stopped'

function voices() {
  voiceMap ??= fetch('/api/voices')
    .then((r) => (r.ok ? r.json() : {}))
    .catch(() => ({}))
  return voiceMap
}

/**
 * Play dialogue lines in order with each speaker's pre-generated MP3. Only when a file is
 * missing (not generated yet) does the line fall back to a browser voice of the same accent
 * and gender; if the browser blocks playback we stop rather than switch to another voice.
 * Resolves when done or when stopSpeaking is called.
 */
export async function playLines(lines: DialogueLine[]): Promise<void> {
  stopSpeaking()
  const run = playback
  for (const line of lines) {
    if (run !== playback) return
    // The first play() runs synchronously inside the tap, before any await.
    const result = await playMp3(line)
    if (run !== playback || result === 'stopped') return
    if (result === 'blocked') {
      stopSpeaking()
      return
    }
    if (result === 'missing') await speakAs(line, (await voices())[line.speaker])
  }
}

/**
 * Play pre-generated MP3 files in order, by file name (level-exam listenings, whose text the
 * learner must not see). There is no browser-voice fallback: a missing file is skipped.
 * Resolves false if the browser blocked playback or stopSpeaking interrupted it.
 */
export async function playAudioFiles(files: string[]): Promise<boolean> {
  stopSpeaking()
  const run = playback
  for (const file of files) {
    if (run !== playback) return false
    const result = await playSrc(`/api/audio/${encodeURIComponent(file)}`)
    if (run !== playback || result === 'stopped' || result === 'blocked') return false
  }
  return true
}

function playMp3({ speaker, text }: DialogueLine): Promise<LineResult> {
  return playSrc(`/api/audio?${new URLSearchParams({ speaker, text })}`)
}

function playSrc(src: string): Promise<LineResult> {
  player ??= new Audio()
  const audio = player
  return new Promise((resolve) => {
    const done = (r: LineResult) => {
      if (settle === done) settle = null
      resolve(r)
    }
    settle = done
    audio.onended = () => done('ok')
    audio.onerror = () => done('missing')
    audio.src = src
    audio.play().catch((e: DOMException) => {
      // AbortError: another line replaced this one before it started.
      done(e.name === 'NotAllowedError' ? 'blocked' : e.name === 'AbortError' ? 'stopped' : 'missing')
    })
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
  const gender = info?.gender === 'male' ? MALE : FEMALE
  // Keep the gender even if that means another accent: a man's line in a woman's voice is worse.
  const byGender = pool.filter((v) => gender.test(v.name)).concat(english.filter((v) => gender.test(v.name)))
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
