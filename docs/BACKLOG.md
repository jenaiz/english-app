# Backlog

Pendientes del proyecto, de más a menos urgente dentro de cada bloque. Al cerrar uno, bórralo de aquí (y, si deja algo que contar, cuéntalo en la documentación que corresponda).

## Exámenes de nivel y contenido

Contexto: [docs/levels/README.md](levels/README.md).

- [ ] **Revisión humana del contenido nuevo.** Lo escribió Claude en octubre de 2026. Los tests garantizan la estructura y la cobertura, no que cada explicación o ejemplo sea correcto y natural.
  - **Unidades:** 50 reglas de gramática nuevas, cada una con su ejercicio: A1 9, A2 14, B1 11, B2 11 y C1 5. Están en `backend/data/levels/`, en las unidades que se citan en `docs/levels/<nivel>.md`.
  - **Exámenes:** unas 700 preguntas entre las dos versiones de los cinco (`backend/data/exams/`). Mira sobre todo:
    - en los huecos (`gap`), si faltan alternativas válidas en `accept`;
    - en las de opción (`choice`), si algún distractor también podría ser correcto.
- [ ] **Probar el examen en el móvil.**
  - La pantalla del examen y la de ordenar palabras a ancho de móvil.
  - El listening en iOS Safari, que a veces bloquea el audio.
- [ ] **Probar el certificado impreso o guardado en PDF.** Solo se ha visto en pantalla.
- [ ] **Decidir sobre las limitaciones conocidas** (detalle en [docs/levels/README.md](levels/README.md#limitaciones-conocidas)):
  - El límite de dos escuchas se cuenta en el navegador (`localStorage`), no en el servidor.
  - La corrección ignora los apóstrofos: «parents» vale por «parents'».
  - La normalización de respuestas está duplicada en `backend/internal/content/answers.go` y `frontend/src/lib/answers.ts`.
  - No hay generadores de los exámenes: para cambiar una pregunta hay que editar el JSON a mano.
- [ ] **Preguntas de exámenes oficiales y simulador**, con writing y speaking. El formato JSON de los exámenes está pensado para ampliarlo.
- [ ] **Checkpoints de las unidades.** Siguen corrigiéndose en el navegador y no tienen tiempo límite. Es aceptable para repasar, pero decidir si deben parecerse más a los exámenes.

## Analítica (GA4)

- [ ] **Registrar los parámetros de los eventos de examen** como dimensiones y métricas personalizadas (*Admin → Custom definitions*). Los eventos son `exam_start` (`exam_id`, `attempt`) y `exam_submit` (`exam_id`, `score`, `passed`). Si no se registran, no salen en los informes.
- [ ] **Marcar `pack_completed` como evento clave.** Hay que esperar a que llegue el primero desde producción; después se marca en *Admin → Events → Recent events*.

## Lanzamiento

- [ ] **Dominio propio antes de abrir al público.** Ahora está en `fluently.bukios.com`, que es temporal. Sigue la lista «Cambiar de dominio» de [deploy/README.md](../deploy/README.md):
  - DNS y certbot;
  - el vhost en `nginx/prod.conf` del repo de bukios y `DOMAIN` en `deploy/deploy.sh`;
  - los orígenes autorizados del cliente OAuth de Google;
  - la URL del flujo web en GA4.

  Los usuarios tendrán que volver a iniciar sesión, porque la cookie es del host.
- [ ] **Cuando haya usuarios reales**, dejar de reescribir libremente los `unit_id` y `lesson_id`, porque el progreso guardado depende de ellos.

## Producto (ideas abiertas)

- [ ] **Expresiones:** enlazar cada expresión con la unidad o sección donde se explica (idea sin decidir).
- [ ] **Expresiones:** explorador de phrasal verbs también por partícula, además de por verbo.
- [ ] **Apps de Android e iOS.** Se añaden al mismo proyecto de Firebase (`fluently-learn`), para que informen a la misma propiedad de GA4.
- [ ] **Monetización:** todo es gratis por ahora. Si hay uso, revisar la idea de un mes gratis y luego una suscripción mensual. Mientras tanto, nada de muros de pago.

## Limpieza local

- [ ] **Base de datos de desarrollo:** borrar los usuarios de prueba `examtest1@example.com` y `examtest2@example.com`, con sus intentos de examen y las actividades del Club que desbloquearon.
- [ ] **`.env` local:** quitar la línea `DEV_TEST_PASSWORD` del final. Git ignora el archivo.
