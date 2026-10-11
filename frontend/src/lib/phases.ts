import { BookA, Headphones, Lightbulb, Mic, PencilLine, Search, Zap, type LucideIcon } from 'lucide-react'
import type { Phase } from '../types'

/** The 7 phases every lesson goes through, in order. */
export const PHASES: { id: Phase; label: string; Icon: LucideIcon }[] = [
  { id: 'context', label: 'Contexto', Icon: Headphones },
  { id: 'discovery', label: 'Descubre', Icon: Search },
  { id: 'grammar', label: 'Gramática', Icon: Lightbulb },
  { id: 'practice', label: 'Práctica', Icon: PencilLine },
  { id: 'production', label: 'Producción', Icon: Mic },
  { id: 'vocabulary', label: 'Vocabulario', Icon: BookA },
  { id: 'review', label: 'Repaso', Icon: Zap },
]
