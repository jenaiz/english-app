import { Link } from 'react-router-dom'
import { Mail } from 'lucide-react'
import LegalPage from '../components/LegalPage'
import { SITE } from '../lib/site'

const faqs = [
  {
    q: `¿Qué es ${SITE.name}?`,
    a: (
      <p>
        Una plataforma para aprender inglés por niveles, con lecciones de vocabulario y gramática, ejercicios de escucha,
        escritura y pronunciación, y un sistema de repaso para que no olvides lo aprendido.
      </p>
    ),
  },
  {
    q: '¿Cuánto cuesta?',
    a: <p>Ahora mismo {SITE.name} es gratuito. Solo necesitas crear una cuenta para guardar tu progreso.</p>,
  },
  {
    q: '¿Cómo funciona el repaso?',
    a: (
      <p>
        Cada palabra que estudias entra en tu repaso. Según lo bien que la recuerdes, volverá a aparecer en unas horas o
        en varios días: así repasas justo antes de olvidarla. Las tarjetas pendientes aparecen en la sección «Repaso».
      </p>
    ),
  },
  {
    q: 'Los ejercicios de pronunciación no funcionan',
    a: (
      <p>
        Usan el reconocimiento de voz del navegador, que funciona mejor en Chrome y Edge. Comprueba que has dado permiso
        de micrófono a la web. Algunos navegadores, como Firefox, aún no lo admiten.
      </p>
    ),
  },
  {
    q: '¿Cómo elimino mi cuenta?',
    a: (
      <p>
        Escríbenos a <a href={`mailto:${SITE.email}`}>{SITE.email}</a> desde el email de tu cuenta y la eliminaremos junto
        con tu progreso. Más información en la <Link to="/privacidad">política de privacidad</Link>.
      </p>
    ),
  },
]

export default function Contact() {
  return (
    <LegalPage
      title="Contacto y ayuda"
      hideUpdated
      intro={
        <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-6 sm:flex-row sm:items-center">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-indigo-50 text-indigo-600">
            <Mail className="h-6 w-6" />
          </span>
          <div>
            <p className="font-semibold text-slate-900">¿Dudas, sugerencias o has encontrado un error?</p>
            <p>
              Escríbenos a <a href={`mailto:${SITE.email}`}>{SITE.email}</a> y te responderemos lo antes posible.
            </p>
          </div>
        </div>
      }
      sections={[
        {
          id: 'faq',
          title: 'Preguntas frecuentes',
          body: (
            <div className="space-y-2">
              {faqs.map((f) => (
                <details key={f.q} className="group rounded-xl border border-slate-200 bg-white px-5 py-4">
                  <summary className="cursor-pointer list-none font-semibold text-slate-800 marker:hidden">
                    <span className="flex items-center justify-between gap-4">
                      {f.q}
                      <span className="text-indigo-600 transition group-open:rotate-45" aria-hidden>
                        +
                      </span>
                    </span>
                  </summary>
                  <div className="mt-2">{f.a}</div>
                </details>
              ))}
            </div>
          ),
        },
      ]}
    />
  )
}
