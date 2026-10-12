import { Award, Clock, ListChecks, ShieldCheck } from 'lucide-react'
import { colorOf } from '../../lib/levels'

const POINTS = [
  { Icon: Clock, text: 'Un examen cronometrado por nivel, de 45 a 80 minutos.' },
  { Icon: ListChecks, text: 'Gramática, vocabulario, reading y listening, alineados con el marco europeo (MCER).' },
  { Icon: ShieldCheck, text: 'Apruebas con un 70 % y al menos la mitad en cada parte. Si no, sabrás qué repasar.' },
  { Icon: Award, text: 'Al aprobar, un certificado que puedes imprimir o guardar en PDF.' },
]

/** Level exams on the landing: the proof at the end of each level. */
export default function ExamSection() {
  const c = colorOf('B1')
  return (
    <section className="border-y border-slate-200 bg-white">
      <div className="mx-auto grid max-w-6xl items-center gap-14 px-4 py-20 md:grid-cols-2 md:py-28">
        <div>
          <h2 className="font-display text-4xl font-bold leading-tight tracking-tight text-indigo-950 md:text-5xl">Demuestra tu nivel</h2>
          <p className="mt-4 text-lg text-slate-600">Cuando termines un nivel, haz su examen y comprueba que lo dominas de verdad.</p>
          <ul className="mt-8 space-y-4">
            {POINTS.map(({ Icon, text }) => (
              <li key={text} className="flex gap-3 text-slate-700">
                <Icon className="mt-0.5 h-5 w-5 shrink-0 text-indigo-600" />
                {text}
              </li>
            ))}
          </ul>
        </div>

        {/* A certificate, drawn: what you get, not a real one. */}
        <div aria-hidden="true" className="relative mx-auto w-full max-w-md">
          <div className="absolute inset-0 translate-x-3 translate-y-3 rotate-2 rounded-3xl bg-indigo-100" />
          <div className="relative rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-xl">
            <div className={`mx-auto grid h-14 w-14 place-items-center rounded-full ${c.soft} ${c.text}`}>
              <Award className="h-7 w-7" />
            </div>
            <p className="mt-4 text-xs font-semibold tracking-[0.2em] text-slate-500 uppercase">Certificado de nivel</p>
            <p className={`mt-3 font-display text-6xl font-extrabold ${c.text}`}>B1</p>
            <p className="mt-1 text-sm font-medium text-slate-500">Intermediate</p>
            <div className="mt-6 grid grid-cols-4 gap-2 text-xs">
              {[
                ['Gramática', 82],
                ['Vocabulario', 76],
                ['Reading', 88],
                ['Listening', 71],
              ].map(([label, pct]) => (
                <div key={label}>
                  <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                    <div className={`h-full rounded-full ${c.solid}`} style={{ width: `${pct}%` }} />
                  </div>
                  <p className="mt-1.5 text-slate-500">{label}</p>
                </div>
              ))}
            </div>
            <p className="mt-6 font-display text-3xl font-extrabold text-slate-900">
              79<span className="text-lg">%</span>
            </p>
            <p className="text-sm font-semibold text-emerald-700">Aprobado</p>
          </div>
        </div>
      </div>
    </section>
  )
}
