import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { BookOpen, Clapperboard, Dices, Music, type LucideIcon } from 'lucide-react'
import { api } from '../api/client'
import type { ClubRoom, ClubSummary } from '../types'

export interface RoomInfo {
  id: ClubRoom
  label: string
  /** What the room holds, in plural, for the album counter ("3/12 canciones"). */
  plural: string
  intro: string
  Icon: LucideIcon
  /** Tailwind classes: card background and accent text. */
  bg: string
  accent: string
}

export const ROOMS: RoomInfo[] = [
  {
    id: 'music',
    label: 'Música',
    plural: 'canciones',
    intro: 'Escucha la canción y completa la letra mientras suena.',
    Icon: Music,
    bg: 'from-rose-500 to-orange-400',
    accent: 'text-rose-600',
  },
  {
    id: 'library',
    label: 'Biblioteca',
    plural: 'lecturas',
    intro: 'Textos largos a tu nivel, con glosario y un test para ver si lo has entendido.',
    Icon: BookOpen,
    bg: 'from-emerald-500 to-teal-400',
    accent: 'text-emerald-600',
  },
  {
    id: 'cinema',
    label: 'Cine',
    plural: 'vídeos',
    intro: 'Charlas y vídeos reales con transcripción. El vídeo se para para hacerte preguntas.',
    Icon: Clapperboard,
    bg: 'from-indigo-600 to-violet-500',
    accent: 'text-indigo-600',
  },
  {
    id: 'games',
    label: 'Juegos',
    plural: 'juegos',
    intro: 'Ejercicios de academia: párrafos enteros para conjugar verbos y phrasal verbs.',
    Icon: Dices,
    bg: 'from-amber-500 to-yellow-400',
    accent: 'text-amber-600',
  },
]

export const roomOf = (id: ClubRoom) => ROOMS.find((r) => r.id === id) ?? ROOMS[0]

export const youtubeThumb = (id: string) => `https://i.ytimg.com/vi/${encodeURIComponent(id)}/hqdefault.jpg`

/** Club counts for the navbar; refreshes on navigation and when the Club changes. */
export function useClubSummary(enabled: boolean) {
  const [summary, setSummary] = useState<ClubSummary | null>(null)
  const { pathname } = useLocation()

  useEffect(() => {
    if (!enabled) {
      setSummary(null)
      return
    }
    const load = () => api.clubSummary().then(setSummary).catch(() => {})
    load()
    window.addEventListener('club-changed', load)
    return () => window.removeEventListener('club-changed', load)
  }, [enabled, pathname])

  return summary
}
