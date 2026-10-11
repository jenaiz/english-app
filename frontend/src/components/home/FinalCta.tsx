import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'

export default function FinalCta({ cta }: { cta: { to: string; label: string } }) {
  return (
    <section className="bg-indigo-950 text-white">
      <div className="mx-auto flex max-w-6xl flex-col items-start gap-8 px-4 py-20 md:flex-row md:items-center md:justify-between">
        <p className="font-display text-4xl font-bold leading-tight tracking-tight md:text-5xl">
          Practice makes{' '}
          <span className="border-b-4 border-emerald-400 text-emerald-300">fluent</span>.
        </p>
        <Link
          to={cta.to}
          className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-white px-6 py-3.5 font-semibold text-indigo-950 transition hover:bg-indigo-50"
        >
          {cta.label} <ArrowRight className="h-5 w-5" />
        </Link>
      </div>
    </section>
  )
}
