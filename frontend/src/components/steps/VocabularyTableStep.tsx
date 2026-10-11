import { BookA, Volume2 } from 'lucide-react'
import { canSpeak, speak } from '../../lib/speech'
import type { VocabularyTableContent } from '../../types'

export default function VocabularyTableStep({ content }: { content: VocabularyTableContent }) {
  return (
    <div>
      <div className="flex items-center gap-3">
        <span className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-100 text-emerald-600">
          <BookA className="h-5 w-5" />
        </span>
        <h2 className="text-xl font-bold text-slate-900">Vocabulario</h2>
      </div>
      <p className="mt-2 text-sm text-slate-500">Estas palabras se añadirán a tu repaso espaciado al terminar la lección.</p>

      {/* Table on wide screens, cards on mobile */}
      <div className="mt-6 hidden overflow-hidden rounded-xl border border-slate-200 md:block">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs tracking-wide text-slate-500 uppercase">
            <tr>
              <th className="px-4 py-3">Término</th>
              <th className="px-4 py-3">Definición</th>
              <th className="px-4 py-3">Traducción</th>
              <th className="px-4 py-3">Ejemplo</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {content.items.map((it) => (
              <tr key={it.term} className="hover:bg-slate-50">
                <td className="px-4 py-3 font-semibold text-indigo-700">
                  <SpeakTerm text={it.term} />
                </td>
                <td className="px-4 py-3 text-slate-700">{it.definition}</td>
                <td className="px-4 py-3 text-slate-700">{it.translation}</td>
                <td className="px-4 py-3 text-slate-500 italic">{it.example}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-6 space-y-3 md:hidden">
        {content.items.map((it) => (
          <div key={it.term} className="rounded-xl border border-slate-200 p-4">
            <div className="flex items-baseline justify-between gap-2">
              <p className="font-semibold text-indigo-700">
                <SpeakTerm text={it.term} />
              </p>
              <p className="text-sm text-slate-500">{it.translation}</p>
            </div>
            <p className="mt-1 text-sm text-slate-700">{it.definition}</p>
            {it.example && <p className="mt-2 text-sm text-slate-500 italic">“{it.example}”</p>}
          </div>
        ))}
      </div>
    </div>
  )
}

function SpeakTerm({ text }: { text: string }) {
  if (!canSpeak) return <>{text}</>
  return (
    <button type="button" onClick={() => speak(text)} className="group inline-flex items-center gap-1.5 text-left hover:text-indigo-900" title="Escuchar">
      {text}
      <Volume2 className="h-3.5 w-3.5 opacity-40 transition group-hover:opacity-100" />
    </button>
  )
}
