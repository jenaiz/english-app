import type { ReactNode } from 'react'

const WIDTHS = {
  /** One thing at a time: a review session. */
  focus: 'max-w-xl',
  /** Reading and forms: a lesson, an exam intro, an expression, settings. */
  text: 'max-w-3xl',
  /** Content with a side column or a few cards per row. */
  medium: 'max-w-5xl',
  /** Dashboards and catalogues: Mi curso, Club, Expresiones. */
  wide: 'max-w-6xl',
} as const

interface Props {
  width: keyof typeof WIDTHS
  as?: 'div' | 'article'
  className?: string
  children: ReactNode
}

/** The page frame: one of four widths and the same side and vertical padding everywhere. */
export default function PageShell({ width, as: Tag = 'div', className = '', children }: Props) {
  return <Tag className={`mx-auto ${WIDTHS[width]} px-4 py-8 md:py-12${className ? ` ${className}` : ''}`}>{children}</Tag>
}
