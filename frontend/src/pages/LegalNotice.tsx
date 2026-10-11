import { Link } from 'react-router-dom'
import LegalPage from '../components/LegalPage'
import { SITE } from '../lib/site'

export default function LegalNotice() {
  return (
    <LegalPage
      title="Aviso legal"
      intro={
        <p>
          En cumplimiento de la Ley 34/2002, de 11 de julio, de Servicios de la Sociedad de la Información y de Comercio
          Electrónico (LSSI-CE), se informa de los datos identificativos del titular de este sitio web.
        </p>
      }
      sections={[
        {
          id: 'titular',
          title: 'Titular del sitio web',
          body: (
            <ul>
              <li>
                <strong>Titular:</strong> {SITE.owner}
              </li>
              {SITE.taxId && (
                <li>
                  <strong>NIF:</strong> {SITE.taxId}
                </li>
              )}
              <li>
                <strong>Domicilio:</strong> {SITE.address}
              </li>
              <li>
                <strong>Email:</strong> <a href={`mailto:${SITE.email}`}>{SITE.email}</a>
              </li>
              <li>
                <strong>Sitio web:</strong> {SITE.url}
              </li>
            </ul>
          ),
        },
        {
          id: 'objeto',
          title: 'Objeto',
          body: (
            <p>
              {SITE.name} es una plataforma online para aprender inglés mediante lecciones, ejercicios y repaso espaciado.
              El acceso y uso del sitio atribuye la condición de usuario e implica la aceptación de este aviso legal y de
              los <Link to="/terminos">términos y condiciones</Link>.
            </p>
          ),
        },
        {
          id: 'propiedad-intelectual',
          title: 'Propiedad intelectual e industrial',
          body: (
            <>
              <p>
                Los contenidos del sitio (textos, lecciones, ejercicios, diseño, logotipos, código fuente y demás
                elementos) son titularidad de {SITE.owner} o de terceros que han autorizado su uso, y están protegidos
                por la normativa de propiedad intelectual e industrial.
              </p>
              <p>
                Se permite su uso personal y no comercial para el aprendizaje. Queda prohibida su reproducción,
                distribución, comunicación pública o transformación con fines comerciales sin autorización expresa.
              </p>
            </>
          ),
        },
        {
          id: 'responsabilidad',
          title: 'Responsabilidad',
          body: (
            <>
              <p>
                El titular trabaja para que la información y el servicio sean correctos y estén disponibles, pero no
                garantiza la ausencia de errores ni la disponibilidad ininterrumpida del sitio, y no se responsabiliza de
                los daños derivados de interrupciones, fallos técnicos o virus ajenos a su control.
              </p>
              <p>
                Los enlaces a sitios de terceros se ofrecen solo como referencia; el titular no controla ni responde de
                sus contenidos.
              </p>
            </>
          ),
        },
        {
          id: 'datos',
          title: 'Protección de datos y cookies',
          body: (
            <p>
              El tratamiento de datos personales se explica en la <Link to="/privacidad">política de privacidad</Link> y
              el uso de cookies en la <Link to="/cookies">política de cookies</Link>.
            </p>
          ),
        },
        {
          id: 'ley',
          title: 'Legislación aplicable y jurisdicción',
          body: (
            <p>
              Este aviso legal se rige por la legislación española. Para cualquier controversia, las partes se someten a
              los juzgados y tribunales que correspondan conforme a la ley; si el usuario es consumidor, los de su
              domicilio.
            </p>
          ),
        },
      ]}
    />
  )
}
