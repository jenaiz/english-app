/** A grey placeholder in the shape of what is loading. */
export function Skeleton({ className = '' }: { className?: string }) {
  return <div aria-hidden="true" className={`animate-pulse rounded-2xl bg-slate-200/70 ${className}`} />
}

/** Loading state of a page: a title and a grid of cards, so the layout doesn't jump when the data arrives. */
export function PageSkeleton({ cards = 6, width = 'max-w-6xl' }: { cards?: number; width?: string }) {
  return (
    <div className={`mx-auto ${width} px-4 py-8 md:py-12`} role="status" aria-label="Cargando">
      <Skeleton className="h-10 w-64" />
      <Skeleton className="mt-3 h-5 w-full max-w-lg" />
      <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: cards }, (_, i) => (
          <Skeleton key={i} className="h-44" />
        ))}
      </div>
    </div>
  )
}
