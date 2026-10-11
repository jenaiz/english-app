import type { Hack } from '../../types'
import SpeakButton from '../SpeakButton'

export default function HackCard({ hack }: { hack: Hack }) {
  return (
    <article className="flex flex-col rounded-3xl bg-yellow-300 p-7 text-slate-900">
      <div className="flex items-center justify-between gap-3">
        <h3 className="font-semibold">{hack.title}</h3>
        <span className="rounded-full bg-white/60 px-2.5 py-1 text-xs font-semibold">{hack.level}</span>
      </div>
      <p className="mt-3 font-display text-3xl leading-tight font-bold">{hack.formula}</p>
      <p className="mt-2 text-slate-800">{hack.explanation}</p>
      <ul className="mt-5 space-y-2">
        {hack.examples.map((s) => (
          <li key={s} className="flex items-center justify-between gap-3 rounded-xl bg-white/60 px-4 py-2.5 font-medium">
            {s}
            <SpeakButton text={s} />
          </li>
        ))}
      </ul>
    </article>
  )
}
