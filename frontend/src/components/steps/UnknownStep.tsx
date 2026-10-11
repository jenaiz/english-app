import type { Step } from '../../types'

export default function UnknownStep({ step }: { step: Step }) {
  return (
    <div>
      <p className="text-sm text-slate-500">
        Tipo de paso no soportado todavía: <code className="rounded bg-slate-100 px-1.5 py-0.5">{step.type}</code>
      </p>
      <pre className="mt-4 overflow-auto rounded-lg bg-slate-900 p-4 text-xs text-slate-100">{JSON.stringify(step.content, null, 2)}</pre>
    </div>
  )
}
