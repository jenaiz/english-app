import { Link } from 'react-router-dom'
import LegalPage from '../components/LegalPage'
import { SITE } from '../lib/site'

export default function Terms() {
  return (
    <LegalPage
      title="Términos y condiciones"
      intro={
        <p>
          Estos términos regulan el uso de {SITE.name}, ofrecido por {SITE.owner}. Al crear una cuenta o usar el servicio
          los aceptas. Si no estás de acuerdo, no uses la plataforma.
        </p>
      }
      sections={[
        {
          id: 'servicio',
          title: 'El servicio',
          body: (
            <p>
              {SITE.name} es una plataforma online para aprender inglés con lecciones organizadas por niveles, ejercicios
              interactivos (incluidos ejercicios de escucha y pronunciación) y un sistema de repaso espaciado de
              vocabulario. Actualmente el servicio es gratuito.
            </p>
          ),
        },
        {
          id: 'cuenta',
          title: 'Registro y cuenta',
          body: (
            <ul>
              <li>Debes tener al menos 14 años o contar con autorización de tus padres o tutores.</li>
              <li>Los datos que nos facilites deben ser veraces y estar actualizados.</li>
              <li>
                Eres responsable de mantener la confidencialidad de tu contraseña y de la actividad realizada con tu
                cuenta. Avísanos si sospechas de un uso no autorizado.
              </li>
              <li>La cuenta es personal e intransferible.</li>
            </ul>
          ),
        },
        {
          id: 'uso',
          title: 'Uso aceptable',
          body: (
            <>
              <p>Te comprometes a no:</p>
              <ul>
                <li>Usar el servicio con fines ilícitos o contrarios a estos términos.</li>
                <li>Intentar acceder sin autorización a sistemas, cuentas o datos ajenos.</li>
                <li>Sobrecargar el servicio, automatizar peticiones masivas o extraer contenidos de forma sistemática.</li>
                <li>Copiar, revender o redistribuir los contenidos de la plataforma.</li>
              </ul>
            </>
          ),
        },
        {
          id: 'contenidos',
          title: 'Propiedad intelectual',
          body: (
            <p>
              Las lecciones, ejercicios, textos, audios, diseño y software de {SITE.name} pertenecen a {SITE.owner} o a sus
              licenciantes. Te concedemos una licencia personal, limitada, no exclusiva e intransferible para usarlos con
              fines de aprendizaje no comerciales.
            </p>
          ),
        },
        {
          id: 'disponibilidad',
          title: 'Disponibilidad y cambios del servicio',
          body: (
            <p>
              Podemos modificar, ampliar o retirar contenidos y funcionalidades, así como interrumpir temporalmente el
              servicio por mantenimiento o causas técnicas. Si en el futuro se introducen funciones de pago, se
              informará de sus condiciones antes de que debas aceptarlas; nunca se te cobrará sin tu aceptación expresa.
            </p>
          ),
        },
        {
          id: 'baja',
          title: 'Baja y suspensión de la cuenta',
          body: (
            <>
              <p>
                Puedes dejar de usar el servicio en cualquier momento y solicitar la eliminación de tu cuenta escribiendo
                a <a href={`mailto:${SITE.email}`}>{SITE.email}</a>. Se eliminarán tu cuenta y tu progreso.
              </p>
              <p>
                Podemos suspender o cancelar cuentas que incumplan estos términos, avisándote cuando sea posible.
              </p>
            </>
          ),
        },
        {
          id: 'responsabilidad',
          title: 'Limitación de responsabilidad',
          body: (
            <p>
              {SITE.name} es una herramienta de apoyo al aprendizaje y no garantiza la obtención de un nivel o
              certificación concretos. El servicio se presta «tal cual»; en la medida en que lo permita la ley, no
              respondemos de daños indirectos derivados de su uso o de la imposibilidad de usarlo. Nada en estos
              términos limita los derechos que te reconoce la normativa de consumidores y usuarios.
            </p>
          ),
        },
        {
          id: 'datos',
          title: 'Datos personales',
          body: (
            <p>
              El tratamiento de tus datos se rige por la <Link to="/privacidad">política de privacidad</Link> y la{' '}
              <Link to="/cookies">política de cookies</Link>.
            </p>
          ),
        },
        {
          id: 'modificaciones',
          title: 'Modificaciones de los términos',
          body: (
            <p>
              Podemos actualizar estos términos. Publicaremos la nueva versión en esta página y, si los cambios son
              relevantes, te avisaremos con antelación. Si sigues usando el servicio después de su entrada en vigor, se
              entenderá que los aceptas.
            </p>
          ),
        },
        {
          id: 'ley',
          title: 'Ley aplicable y jurisdicción',
          body: (
            <p>
              Estos términos se rigen por la legislación española. Si eres consumidor, serán competentes los juzgados y
              tribunales de tu domicilio.
            </p>
          ),
        },
      ]}
    />
  )
}
