import { Link } from 'react-router-dom'
import { BookOpen } from 'lucide-react'
import { useConsent } from '../context/ConsentContext'
import { SITE } from '../lib/site'

const linkClass = 'text-slate-500 transition hover:text-indigo-600'

export default function Footer() {
  const { openPreferences } = useConsent()

  return (
    <footer className="border-t border-slate-200 bg-white">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:grid-cols-2 md:grid-cols-[2fr_1fr_1fr]">
        <div>
          <Link to="/" className="flex items-center gap-2 text-lg font-bold text-slate-900">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-indigo-600 text-white">
              <BookOpen className="h-5 w-5" />
            </span>
            <span className="font-display text-xl">{SITE.name}</span>
          </Link>
          <p className="mt-3 max-w-xs text-sm text-slate-500">
            Aprende inglés paso a paso: vocabulario, gramática, pronunciación y repaso espaciado.
          </p>
        </div>

        <nav aria-label="Ayuda">
          <h2 className="text-sm font-semibold text-slate-900">Ayuda</h2>
          <ul className="mt-3 space-y-2 text-sm">
            <li>
              <Link to="/contacto" className={linkClass}>
                Contacto
              </Link>
            </li>
            <li>
              <Link to="/contacto#faq" className={linkClass}>
                Preguntas frecuentes
              </Link>
            </li>
          </ul>
        </nav>

        <nav aria-label="Legal">
          <h2 className="text-sm font-semibold text-slate-900">Legal</h2>
          <ul className="mt-3 space-y-2 text-sm">
            <li>
              <Link to="/aviso-legal" className={linkClass}>
                Aviso legal
              </Link>
            </li>
            <li>
              <Link to="/privacidad" className={linkClass}>
                Política de privacidad
              </Link>
            </li>
            <li>
              <Link to="/cookies" className={linkClass}>
                Política de cookies
              </Link>
            </li>
            <li>
              <Link to="/terminos" className={linkClass}>
                Términos y condiciones
              </Link>
            </li>
            <li>
              <button type="button" onClick={openPreferences} className={linkClass}>
                Configurar cookies
              </button>
            </li>
          </ul>
        </nav>
      </div>
      <div className="border-t border-slate-100">
        <p className="mx-auto max-w-6xl px-4 py-5 text-xs text-slate-400">
          © {new Date().getFullYear()} {SITE.owner} · {SITE.name}
        </p>
      </div>
    </footer>
  )
}
