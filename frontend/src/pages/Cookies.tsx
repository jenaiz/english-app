import { Link } from 'react-router-dom'
import LegalPage from '../components/LegalPage'
import { useConsent } from '../context/ConsentContext'
import { SITE } from '../lib/site'
import { buttonClass } from '../components/ui/Button'

interface Row {
  name: string
  provider: string
  purpose: string
  duration: string
  kind: string
}

const necessary: Row[] = [
  {
    name: 'token',
    provider: SITE.name,
    purpose: 'Mantener tu sesión iniciada',
    duration: '30 días desde tu última visita',
    kind: 'Cookie técnica',
  },
  {
    name: 'fluently.lastEmail',
    provider: SITE.name,
    purpose: 'Rellenar el email en el inicio de sesión con el último que usaste en este dispositivo',
    duration: 'Hasta que borres los datos del navegador o tu cuenta',
    kind: 'Almacenamiento local',
  },
  {
    name: 'cookie-consent',
    provider: SITE.name,
    purpose: 'Recordar tu elección sobre cookies',
    duration: '12 meses',
    kind: 'Almacenamiento local',
  },
  {
    name: 'review-mode',
    provider: SITE.name,
    purpose: 'Recordar el modo de repaso que prefieres',
    duration: 'Hasta que lo borres',
    kind: 'Almacenamiento local',
  },
  {
    name: 'selectedLevel',
    provider: SITE.name,
    purpose: 'Recordar el nivel abierto mientras navegas',
    duration: 'Sesión',
    kind: 'Almacenamiento de sesión',
  },
]

const analytics: Row[] = [
  { name: '_ga', provider: 'Google', purpose: 'Distinguir visitantes de forma anónima', duration: '2 años', kind: 'Analítica' },
  {
    name: '_ga_<ID>',
    provider: 'Google',
    purpose: 'Mantener el estado de la sesión de analítica',
    duration: '2 años',
    kind: 'Analítica',
  },
]

function CookieTable({ rows }: { rows: Row[] }) {
  return (
    <div className="overflow-x-auto">
      <table>
        <thead>
          <tr>
            <th>Nombre</th>
            <th>Titular</th>
            <th>Finalidad</th>
            <th>Duración</th>
            <th>Tipo</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.name}>
              <td>
                <code className="text-xs">{r.name}</code>
              </td>
              <td>{r.provider}</td>
              <td>{r.purpose}</td>
              <td>{r.duration}</td>
              <td>{r.kind}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default function Cookies() {
  const { openPreferences } = useConsent()

  return (
    <LegalPage
      title="Política de cookies"
      intro={
        <p>
          Esta política explica qué cookies y tecnologías similares usa {SITE.name}, para qué sirven y cómo puedes
          gestionarlas, conforme al artículo 22.2 de la LSSI-CE y al RGPD.
        </p>
      }
      sections={[
        {
          id: 'que-son',
          title: '¿Qué son las cookies?',
          body: (
            <p>
              Son pequeños archivos que una web guarda en tu navegador para recordar información sobre tu visita. Con el
              mismo criterio tratamos el almacenamiento local del navegador (localStorage y sessionStorage).
            </p>
          ),
        },
        {
          id: 'necesarias',
          title: 'Cookies necesarias',
          body: (
            <>
              <p>
                Son imprescindibles para que la web funcione y están exentas de consentimiento. No se pueden desactivar
                desde el panel, aunque puedes borrarlas desde tu navegador (en ese caso tendrás que volver a iniciar
                sesión).
              </p>
              <CookieTable rows={necessary} />
            </>
          ),
        },
        {
          id: 'analitica',
          title: 'Cookies de analítica',
          body: (
            <>
              <p>
                Solo se instalan si las aceptas. Usamos Google Analytics 4 para obtener estadísticas agregadas (páginas
                visitadas, duración de las visitas, tipo de dispositivo) sin guardar tu dirección IP y sin señales de
                publicidad. La información la trata Google Ireland Ltd.; consulta su{' '}
                <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer">
                  política de privacidad
                </a>
                .
              </p>
              <CookieTable rows={analytics} />
            </>
          ),
        },
        {
          id: 'terceros',
          title: 'Inicio de sesión con Google',
          body: (
            <p>
              Si usas «Continuar con Google» en las páginas de inicio de sesión o registro, se carga el servicio de
              Google Identity Services, que puede leer o instalar sus propias cookies en el dominio de Google para
              identificarte. Solo ocurre en esas páginas y porque tú solicitas ese servicio. Más información en la{' '}
              <a href="https://policies.google.com/technologies/cookies" target="_blank" rel="noopener noreferrer">
                política de cookies de Google
              </a>
              .
            </p>
          ),
        },
        {
          id: 'gestionar',
          title: 'Cómo cambiar o retirar tu consentimiento',
          body: (
            <>
              <p>
                Puedes cambiar tu elección en cualquier momento desde el enlace «Configurar cookies» del pie de página o
                desde aquí:
              </p>
              <p>
                <button
                  type="button"
                  onClick={openPreferences}
                  className={buttonClass({ size: 'sm' })}
                >
                  Configurar cookies
                </button>
              </p>
              <p>
                También puedes bloquear o borrar las cookies desde la configuración de tu navegador:{' '}
                <a href="https://support.google.com/chrome/answer/95647" target="_blank" rel="noopener noreferrer">
                  Chrome
                </a>
                ,{' '}
                <a
                  href="https://support.mozilla.org/es/kb/Borrar%20cookies"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Firefox
                </a>
                ,{' '}
                <a href="https://support.apple.com/es-es/guide/safari/sfri11471/mac" target="_blank" rel="noopener noreferrer">
                  Safari
                </a>{' '}
                y{' '}
                <a
                  href="https://support.microsoft.com/es-es/microsoft-edge/eliminar-cookies-en-microsoft-edge-63947406-40ac-c3b8-57b9-2a946a29ae09"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Edge
                </a>
                .
              </p>
              <p>
                Volveremos a pedirte el consentimiento pasados 12 meses o si cambiamos las cookies que usamos. Para más
                información sobre tus datos consulta la <Link to="/privacidad">política de privacidad</Link>.
              </p>
            </>
          ),
        },
      ]}
    />
  )
}
