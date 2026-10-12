import type { LucideIcon } from 'lucide-react'

interface Props {
  Icon: LucideIcon
  title: string
  subtitle?: React.ReactNode
  /** Positive: green. Otherwise amber, for "done, but worth another go". */
  good?: boolean
}

/** Top of every "you finished" screen: lessons, tests, review sessions and Club activities. */
export default function CompletionHeader({ Icon, title, subtitle, good = true }: Props) {
  return (
    <div className="text-center">
      <div className={`mx-auto grid h-20 w-20 place-items-center rounded-full ${good ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'}`}>
        <Icon className="h-10 w-10" />
      </div>
      <h1 className="h-page mt-6">{title}</h1>
      {subtitle && <p className="mt-2 text-slate-500">{subtitle}</p>}
    </div>
  )
}
