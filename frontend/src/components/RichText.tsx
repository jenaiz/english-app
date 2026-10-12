import type { ReactNode } from 'react'

/**
 * Renders the small text format used in the content JSON (grammar explanations):
 * - a blank line separates paragraphs;
 * - lines starting with "•" or "- " become a list;
 * - a paragraph starting with "Ojo:" is shown as a warning;
 * - «English» becomes an example chip and **text** is bold.
 */
export default function RichText({ text, className = '' }: { text: string; className?: string }) {
  const blocks = text.split(/\n\s*\n/).map((b) => b.trim()).filter(Boolean)
  return <div className={`space-y-3 ${className}`}>{blocks.map((b, i) => <Block key={i} text={b} />)}</div>
}

const BULLET = /^\s*(?:•|-\s)\s*/

function Block({ text }: { text: string }) {
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean)
  const intro: string[] = []
  const items: string[] = []
  for (const line of lines) {
    if (BULLET.test(line)) items.push(line.replace(BULLET, ''))
    else if (items.length) items[items.length - 1] += ` ${line}`
    else intro.push(line)
  }

  const warning = /^ojo:/i.test(lines[0] ?? '')
  const body = (
    <>
      {intro.length > 0 && <p>{inline(intro.join(' '))}</p>}
      {items.length > 0 && (
        <ul className={`space-y-1.5 ${intro.length ? 'mt-2' : ''}`}>
          {items.map((it, i) => (
            <li key={i} className="flex gap-2">
              <span className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" aria-hidden />
              <span>{inline(it)}</span>
            </li>
          ))}
        </ul>
      )}
    </>
  )
  if (warning) {
    return <div className="rounded-lg border border-amber-300 bg-white/70 px-4 py-3 text-amber-900">{body}</div>
  }
  return <div>{body}</div>
}

/** «example» → chip, **bold** → strong, "Ojo:" → bold label. */
function inline(text: string): ReactNode[] {
  return text.split(/(«[^»]+»|\*\*[^*]+\*\*|^Ojo:)/i).map((part, i) => {
    if (part.startsWith('«') && part.endsWith('»')) {
      return (
        <span key={i} className="rounded-md bg-white px-1.5 py-0.5 font-medium text-slate-900 [box-decoration-break:clone] shadow-[0_0_0_1px_rgb(0_0_0/0.06)]">
          {part.slice(1, -1)}
        </span>
      )
    }
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={i} className="font-semibold text-slate-900">
          {part.slice(2, -2)}
        </strong>
      )
    }
    if (/^ojo:$/i.test(part)) {
      return (
        <strong key={i} className="font-semibold">
          {part}
        </strong>
      )
    }
    return part
  })
}
