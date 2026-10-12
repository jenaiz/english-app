import { Lightbulb } from 'lucide-react'
import type { GrammarRuleContent } from '../../types'
import RichText from '../RichText'

export default function GrammarRuleStep({ content }: { content: GrammarRuleContent }) {
  return (
    <div>
      <div className="flex items-center gap-3">
        <span className="grid h-10 w-10 place-items-center rounded-xl bg-amber-100 text-amber-600">
          <Lightbulb className="h-5 w-5" />
        </span>
        <h2 className="text-xl font-bold text-slate-900">{content.title}</h2>
      </div>
      <RichText
        text={content.explanation}
        className="mt-5 rounded-xl border-l-4 border-amber-400 bg-amber-50 p-5 leading-relaxed text-slate-700"
      />
      {content.table && (
        <div className="mt-6 overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full text-left text-sm">
            <thead className="bg-amber-50 text-xs tracking-wide text-amber-800 uppercase">
              <tr>
                {content.table.headers.map((h, i) => (
                  <th key={i} className="px-4 py-2.5 whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {content.table.rows.map((row, i) => (
                <tr key={i}>
                  {row.map((cell, j) => (
                    <td key={j} className={`px-4 py-2.5 ${j === 0 ? 'font-semibold text-slate-900' : 'text-slate-700'}`}>
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {content.examples && content.examples.length > 0 && (
        <div className="mt-6">
          <p className="mb-2 text-sm font-semibold tracking-wide text-slate-500 uppercase">Ejemplos</p>
          <ul className="space-y-2">
            {content.examples.map((ex) => (
              <li key={ex} className="rounded-lg bg-slate-50 px-4 py-2.5 font-medium text-slate-800 italic">
                {ex}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
