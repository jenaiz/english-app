import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'

/** "← Section": back to where this page hangs from, named after it. */
export default function BackLink({ to, children }: { to: string; children: React.ReactNode }) {
  return (
    <Link
      to={to}
      className="inline-flex items-center gap-1.5 rounded-md text-sm font-medium text-slate-500 transition hover:text-indigo-700 focus-visible:ring-4 focus-visible:ring-indigo-200 focus-visible:outline-none"
    >
      <ArrowLeft className="h-4 w-4" /> {children}
    </Link>
  )
}
