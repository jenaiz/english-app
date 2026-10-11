import { Link } from 'react-router-dom'
import LegalPage from '../components/LegalPage'
import { SITE } from '../lib/site'

export default function Privacy() {
  return (
    <LegalPage
      title="Política de privacidad"
      intro={
        <p>
          Esta política explica qué datos personales tratamos cuando usas {SITE.name}, para qué y con qué derechos
          cuentas, conforme al Reglamento (UE) 2016/679 (RGPD) y la Ley Orgánica 3/2018 (LOPDGDD).
        </p>
      }
      sections={[
        {
          id: 'responsable',
          title: 'Responsable del tratamiento',
          body: (
            <ul>
              <li>
                <strong>Responsable:</strong> {SITE.owner}
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
                <strong>Contacto:</strong> <a href={`mailto:${SITE.email}`}>{SITE.email}</a>
              </li>
            </ul>
          ),
        },
        {
          id: 'datos',
          title: 'Qué datos tratamos',
          body: (
            <ul>
              <li>
                <strong>Datos de cuenta:</strong> tu email, el nombre que elijas mostrar (opcional) y tu contraseña, que
                guardamos cifrada (hash) y nunca en claro.
              </li>
              <li>
                <strong>Inicio de sesión con Google:</strong> si lo usas, recibimos de Google tu email y un
                identificador de cuenta. No accedemos a tu contraseña de Google ni a otros datos.
              </li>
              <li>
                <strong>Datos de aprendizaje:</strong> lecciones completadas, puntuaciones y el historial de repaso de
                vocabulario.
              </li>
              <li>
                <strong>Datos técnicos:</strong> dirección IP, navegador y fechas de acceso registrados en los logs del
                servidor por seguridad.
              </li>
              <li>
                <strong>Datos de uso (solo con tu consentimiento):</strong> estadísticas de navegación recogidas por
                Google Analytics. Ver la <Link to="/cookies">política de cookies</Link>.
              </li>
            </ul>
          ),
        },
        {
          id: 'finalidades',
          title: 'Para qué los usamos y base legal',
          body: (
            <table>
              <thead>
                <tr>
                  <th>Finalidad</th>
                  <th>Base legal (RGPD)</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Crear y gestionar tu cuenta, guardar tu progreso y prestarte el servicio</td>
                  <td>Ejecución del contrato (art. 6.1.b)</td>
                </tr>
                <tr>
                  <td>Responder a tus consultas y solicitudes</td>
                  <td>Ejecución del contrato o medidas precontractuales (art. 6.1.b)</td>
                </tr>
                <tr>
                  <td>Seguridad del servicio y prevención de abusos</td>
                  <td>Interés legítimo (art. 6.1.f)</td>
                </tr>
                <tr>
                  <td>Analítica de uso para mejorar la plataforma</td>
                  <td>Consentimiento (art. 6.1.a), que puedes retirar cuando quieras</td>
                </tr>
              </tbody>
            </table>
          ),
        },
        {
          id: 'terceros',
          title: 'Con quién los compartimos',
          body: (
            <>
              <p>No vendemos tus datos ni los cedemos a terceros con fines comerciales. Solo intervienen:</p>
              <ul>
                <li>
                  <strong>Hetzner Online GmbH</strong> (Alemania): alojamiento del servidor y la base de datos, dentro de
                  la Unión Europea, como encargado del tratamiento.
                </li>
                <li>
                  <strong>Google Ireland Ltd.</strong>: inicio de sesión con Google (solo si lo eliges) y Google
                  Analytics (solo si lo aceptas). Google puede transferir datos a EE. UU.; Google LLC está adherida al
                  Marco de Privacidad de Datos UE-EE. UU. (EU-US Data Privacy Framework).
                </li>
                <li>
                  <strong>Reconocimiento de voz del navegador:</strong> los ejercicios de pronunciación usan la API de
                  voz de tu navegador. Algunos navegadores (como Chrome) envían el audio a los servidores de su
                  proveedor para transcribirlo; {SITE.name} no recibe ni guarda el audio, solo el texto reconocido para
                  corregir el ejercicio.
                </li>
                <li>Autoridades públicas, cuando exista una obligación legal.</li>
              </ul>
            </>
          ),
        },
        {
          id: 'conservacion',
          title: 'Cuánto tiempo los conservamos',
          body: (
            <ul>
              <li>Datos de cuenta y de aprendizaje: mientras tengas la cuenta activa.</li>
              <li>
                Si borras la cuenta (desde Ajustes o escribiéndonos), borramos tus datos, salvo los que debamos conservar
                bloqueados durante los plazos legales de prescripción.
              </li>
              <li>Logs del servidor: el tiempo imprescindible por motivos de seguridad.</li>
              <li>
                Datos de analítica: según la configuración de retención de Google Analytics (máximo 14 meses).
              </li>
            </ul>
          ),
        },
        {
          id: 'derechos',
          title: 'Tus derechos',
          body: (
            <>
              <p>
                Puedes ejercer tus derechos de acceso, rectificación, supresión, oposición, limitación del tratamiento y
                portabilidad, así como retirar tu consentimiento en cualquier momento. Desde Ajustes puedes cambiar tu
                nombre, descargar una copia de tus datos y borrar tu cuenta; para lo demás, escribe a{' '}
                <a href={`mailto:${SITE.email}`}>{SITE.email}</a> e indicando el email de tu cuenta. Responderemos en un
                plazo máximo de un mes.
              </p>
              <p>
                Si consideras que no hemos atendido correctamente tu solicitud, puedes presentar una reclamación ante la
                Agencia Española de Protección de Datos (
                <a href="https://www.aepd.es" target="_blank" rel="noopener noreferrer">
                  www.aepd.es
                </a>
                ).
              </p>
            </>
          ),
        },
        {
          id: 'menores',
          title: 'Menores de edad',
          body: (
            <p>
              Para crear una cuenta debes tener al menos 14 años. Los menores de esa edad necesitan el consentimiento de
              sus padres o tutores (art. 7 LOPDGDD). Si detectamos una cuenta de un menor de 14 años sin ese
              consentimiento, la eliminaremos.
            </p>
          ),
        },
        {
          id: 'seguridad',
          title: 'Seguridad',
          body: (
            <p>
              Aplicamos medidas técnicas y organizativas adecuadas: conexión cifrada (HTTPS), contraseñas almacenadas con
              hash, cookies de sesión protegidas (HttpOnly) y acceso restringido al servidor.
            </p>
          ),
        },
        {
          id: 'cambios',
          title: 'Cambios en esta política',
          body: (
            <p>
              Podemos actualizar esta política. Publicaremos la nueva versión en esta página con su fecha y, si los
              cambios son importantes, te avisaremos.
            </p>
          ),
        },
      ]}
    />
  )
}
