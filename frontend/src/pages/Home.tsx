import { Link } from 'react-router-dom'
import { ArrowRight, BookMarked, Headphones, Trophy, Sparkles } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

const features = [
  { icon: Headphones, title: 'Diálogos en contexto', text: 'Escucha conversaciones reales antes de estudiar la gramática.' },
  { icon: BookMarked, title: 'Gramática clara', text: 'Reglas explicadas en español con ejemplos que puedes usar hoy.' },
  { icon: Trophy, title: 'Progreso guardado', text: 'Marca lecciones y unidades completadas y retoma cuando quieras.' },
]

const levels = ['A1', 'A2', 'B1', 'B2', 'C1']

export default function Home() {
  const { user } = useAuth()
  const cta = user ? { to: '/levels', label: 'Ir a mis niveles' } : { to: '/register', label: 'Empieza gratis' }

  return (
    <div>
      <section className="relative overflow-hidden bg-gradient-to-br from-indigo-600 via-indigo-700 to-violet-800 text-white">
        <div className="pointer-events-none absolute -top-24 -right-24 h-96 w-96 rounded-full bg-white/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 -left-16 h-80 w-80 rounded-full bg-fuchsia-400/20 blur-3xl" />
        <div className="relative mx-auto grid max-w-6xl gap-12 px-4 py-20 md:grid-cols-2 md:py-28">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-sm font-medium">
              <Sparkles className="h-4 w-4" /> Del A1 al C1, a tu ritmo
            </span>
            <h1 className="mt-6 text-4xl font-extrabold leading-tight tracking-tight md:text-5xl">
              Aprende inglés con situaciones reales, paso a paso.
            </h1>
            <p className="mt-5 max-w-lg text-lg text-indigo-100">
              Unidades cortas con diálogos, gramática y vocabulario. Practica en el hotel, en el aeropuerto o en tu
              próxima entrevista de trabajo.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                to={cta.to}
                className="inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3 font-semibold text-indigo-700 shadow-lg transition hover:bg-indigo-50"
              >
                {cta.label} <ArrowRight className="h-5 w-5" />
              </Link>
              {!user && (
                <Link
                  to="/login"
                  className="inline-flex items-center rounded-xl border border-white/30 px-6 py-3 font-semibold text-white transition hover:bg-white/10"
                >
                  Ya tengo cuenta
                </Link>
              )}
            </div>
          </div>

          <div className="hidden items-center justify-center md:flex">
            <div className="w-full max-w-sm rotate-2 rounded-2xl bg-white p-6 text-slate-800 shadow-2xl">
              <p className="text-xs font-semibold tracking-wide text-indigo-600 uppercase">B1 · Travel</p>
              <p className="mt-1 font-bold">Checking into a Hotel</p>
              <div className="mt-4 space-y-3 text-sm">
                <p className="w-fit rounded-2xl rounded-tl-sm bg-slate-100 px-4 py-2">Good afternoon, how can I help you?</p>
                <p className="ml-auto w-fit rounded-2xl rounded-tr-sm bg-indigo-600 px-4 py-2 text-white">
                  Hi, I'd like to check in, please.
                </p>
              </div>
              <div className="mt-5 h-2 overflow-hidden rounded-full bg-slate-100">
                <div className="h-full w-2/3 rounded-full bg-emerald-500" />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16">
        <div className="mb-12 flex flex-wrap justify-center gap-3">
          {levels.map((l) => (
            <span key={l} className="rounded-full border border-indigo-200 bg-white px-5 py-2 font-bold text-indigo-700 shadow-sm">
              {l}
            </span>
          ))}
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          {features.map(({ icon: Icon, title, text }) => (
            <div key={title} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="grid h-11 w-11 place-items-center rounded-xl bg-indigo-50 text-indigo-600">
                <Icon className="h-6 w-6" />
              </div>
              <h3 className="mt-4 font-semibold text-slate-900">{title}</h3>
              <p className="mt-1 text-sm text-slate-600">{text}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
