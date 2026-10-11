export default function ProgressLegend() {
  return (
    <>
      <span className="inline-flex items-center gap-1.5">
        <i className="h-2.5 w-2.5 rounded-full bg-indigo-300" /> Sin añadir
      </span>
      <span className="inline-flex items-center gap-1.5">
        <i className="h-2.5 w-2.5 rounded-full bg-amber-400" /> Aprendiendo
      </span>
      <span className="inline-flex items-center gap-1.5">
        <i className="h-2.5 w-2.5 rounded-full bg-emerald-500" /> Dominado
      </span>
    </>
  )
}
