# Fluently: English Learning App

Monorepo de una aplicación para aprender inglés del A1 al C1.

- **`frontend/`**: React 18 + Vite + TypeScript, Tailwind CSS v4, React Router v6 y Lucide icons.
- **`backend/`**: Go con chi, PostgreSQL (pgx), JWT en cookie HTTP-only y bcrypt.
- **Contenido**: archivos JSON en `backend/data/levels/` que se cargan en memoria al arrancar. Para añadir cursos no hace falta tocar la base de datos.

```
                 ┌────────────────────────── docker compose ───────────────────────────┐
 navegador ──▶   │ frontend (nginx :80 → host :3000)                                   │
                 │   ├── /         → SPA React (dist/)                                 │
                 │   └── /api/*    → proxy ──▶ backend (Go :8080) ──▶ postgres (:5432) │
                 │                               └── data/levels/*.json (en memoria)   │
                 └─────────────────────────────────────────────────────────────────────┘
```

El navegador habla con un único origen, así que no hay problemas de CORS.

## Arranque rápido (Docker)

```bash
cp .env.example .env        # opcional: ajusta JWT_SECRET, puertos, etc.
docker compose up --build
```

- App: http://localhost:3000
- API directa: http://localhost:8080/api (healthcheck en `/healthz`)

Los datos de Postgres se guardan en el volumen `pgdata`. Para borrarlos: `docker compose down -v`.

## Desarrollo con Docker (hot reload)

`docker-compose.dev.yml` monta el código en contenedores: Vite con hot reload en lugar de nginx, `go run` para el backend y un Postgres con volumen propio (`pgdata-dev`).

```bash
docker compose -f docker-compose.dev.yml up -d
docker compose -f docker-compose.dev.yml logs -f            # ver logs
docker compose -f docker-compose.dev.yml restart backend    # tras cambiar código Go o JSON de contenido
docker compose -f docker-compose.dev.yml down               # parar (añade -v para borrar datos)
```

- App: http://localhost:5173 (los cambios en `frontend/src` se ven al instante)
- API: http://localhost:8080
- Postgres: `localhost:5432` (usuario, contraseña y BD: `english`, `english`, `english_app`)

## Desarrollo local (sin Docker para el código)

Requisitos: Go 1.26+, Node 22+ y Docker (solo para Postgres).

```bash
# 1. Base de datos
docker run -d --name english-dev-db -p 5432:5432 \
  -e POSTGRES_USER=english -e POSTGRES_PASSWORD=english -e POSTGRES_DB=english_app \
  postgres:16-alpine

# 2. Backend (aplica las migraciones al arrancar)
cd backend
JWT_SECRET=dev-secret go run ./cmd/server     # :8080

# 3. Frontend (hot reload; proxy de /api → localhost:8080)
cd frontend
npm install
npm run dev                                    # http://localhost:5173
```

Tests y builds:

```bash
cd backend  && go vet ./... && go test ./...
cd frontend && npm run build
```

### Variables de entorno del backend

| Variable        | Por defecto          | Descripción                                    |
| --------------- | -------------------- | ---------------------------------------------- |
| `PORT`          | `8080`               | Puerto HTTP                                    |
| `DB_HOST`       | `localhost`          | Host de PostgreSQL                             |
| `DB_PORT`       | `5432`               |                                                |
| `DB_USER`       | `english`            |                                                |
| `DB_PASSWORD`   | `english`            |                                                |
| `DB_NAME`       | `english_app`        |                                                |
| `DB_SSLMODE`    | `disable`            |                                                |
| `JWT_SECRET`    | *(inseguro en dev)*  | Clave HS256. **Obligatoria en producción.**    |
| `COOKIE_SECURE` | `false`              | `true` si sirves por HTTPS                     |
| `CONTENT_DIR`   | `./data/levels`      | Carpeta con los JSON de niveles                |
| `CLUB_DIR`      | `./data/club`        | Actividades del Club (una por JSON). Si no existe, el Club está vacío. |
| `GOOGLE_CLIENT_ID` | *(vacío)*         | Client ID OAuth (tipo "Aplicación web") para "Continuar con Google". Vacío = botón oculto. |
| `APP_URL`       | `http://localhost:3000` | URL pública del frontend, para los enlaces de los emails. |
| `MAIL_FROM`     | `Fluently <no-reply@bukios.com>` | Remitente de los emails (tiene que estar verificado en SES). |
| `AWS_REGION`    | `eu-west-1`          | Región de Amazon SES.                          |
| `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` | *(vacío)* | Credenciales de SES. Vacías = los emails se escriben en el log del backend (desarrollo). |

### Emails: verificación y contraseña

- Al registrarse con email se envía un enlace de confirmación (`/verificar-email?token=…`, válido 48 h) y **no se inicia sesión** hasta abrirlo. El login de una cuenta sin verificar devuelve 403 `email_not_verified`, y el usuario puede pedir que se reenvíe.
- «¿Olvidaste tu contraseña?» envía un enlace a `/restablecer-contrasena?token=…` (válido 1 h). Restablecer la contraseña también verifica el email. Sirve para que una cuenta creada con Google añada contraseña.
- Los tokens son de un solo uso y en la BD solo se guarda su SHA-256 (tabla `email_tokens`). Cada tipo de email se envía como mucho una vez por minuto a la misma cuenta.
- Las cuentas que existían antes de esta función se marcaron como verificadas en la migración `004`.
- En desarrollo, sin credenciales de AWS, el enlace aparece en `docker compose logs backend`.

### Login con Google

El frontend usa Google Identity Services: el botón devuelve un ID token (JWT firmado por Google) y el backend lo verifica con las claves públicas de Google (`aud` = tu Client ID, emisor de Google, email verificado). No hace falta client secret.

1. En [Google Cloud Console](https://console.cloud.google.com/apis/credentials), crea un **ID de cliente de OAuth** de tipo **Aplicación web** (antes configura la pantalla de consentimiento).
2. En **Orígenes de JavaScript autorizados** añade `http://localhost:5173`, `http://localhost:3000` y el dominio de producción (`https://fluently.bukios.com`). No hacen falta URIs de redirección.
3. Pon `GOOGLE_CLIENT_ID=<id>.apps.googleusercontent.com` en el `.env` de la raíz y reinicia el backend. El frontend lo obtiene de `GET /api/auth/config`, así que no hay que recompilarlo.

La primera vez que alguien entra con Google se crea su cuenta sin contraseña y ya verificada. Si ya existía una cuenta con ese email, el backend responde 409 `link_required` y el frontend pregunta al usuario si quiere vincular las cuentas. Si acepta, repite la llamada con `link: true`:

- Si la cuenta estaba verificada, conserva su contraseña y se puede entrar de las dos formas.
- Si no lo estaba, queda verificada (Google demuestra que el email es suyo), pero **se borra su contraseña**: quien la creó podría no ser el dueño del email. Se puede crear otra con «¿Olvidaste tu contraseña?».

## API

Todas las rutas salvo register, login, logout, `auth/config`, `auth/google`, las de verificación y contraseña y health requieren autenticación. Se puede enviar la cookie `token` (la fija el login) o una cabecera `Authorization: Bearer <jwt>`.

| Método | Ruta                                        | Descripción                                                                                    |
| ------ | ------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| POST   | `/api/auth/register`                        | `{email, password}`: crea el usuario (bcrypt) sin verificar y envía el email de confirmación. Devuelve 201 `{verification_sent, email}`, sin sesión. 409 si el email existe. |
| POST   | `/api/auth/login`                           | `{email, password}`: fija la cookie y devuelve `{user, token}`. 401 si las credenciales son incorrectas; 403 `{code: "email_not_verified"}` si falta confirmar el email. |
| POST   | `/api/auth/verify-email`                    | `{token}`: confirma el email e inicia sesión (`{user, token}`). 400 `invalid_token` si ha caducado o ya se usó. |
| POST   | `/api/auth/resend-verification`             | `{email}`: reenvía la confirmación si la cuenta existe y no está verificada. Siempre 204. |
| POST   | `/api/auth/forgot-password`                 | `{email}`: envía el enlace para restablecer la contraseña si la cuenta existe. Siempre 204. |
| POST   | `/api/auth/reset-password`                  | `{token, password}`: cambia la contraseña, verifica el email e inicia sesión. 400 `invalid_token` si no vale. |
| POST   | `/api/auth/logout`                          | Borra la cookie.                                                                               |
| GET    | `/api/auth/config`                          | `{google_client_id}`: vacío si el login con Google no está configurado. Pública.               |
| POST   | `/api/auth/google`                          | `{credential, link?}` (ID token de Google): crea la cuenta o inicia sesión, fija la cookie y devuelve `{user, token}`. 409 `{code: "link_required", email, keeps_password}` si el email ya tiene cuenta y `link` no es `true`. 401 si el token no es válido; 404 si no está configurado. |
| GET    | `/api/health`                               | `{status, version}`: comprueba la BD y devuelve la versión del build. Pública.                  |
| GET    | `/api/auth/me`                              | Perfil del usuario autenticado.                                                                |
| GET    | `/api/levels`                               | Resumen de niveles → temas → unidades (sin los pasos).                                         |
| GET    | `/api/levels/{level_id}/units/{unit_id}`    | Unidad completa con lecciones y pasos. Si `level_id` es `-`, se busca en todos los niveles.    |
| GET    | `/api/progress`                             | `{lessons: [...], completed_units: [...]}`                                                     |
| POST   | `/api/progress/complete`                    | `{unit_id, lesson_id?, score?}`. Sin `lesson_id` marca todas las lecciones de la unidad. Crea las tarjetas SRS del vocabulario y devuelve `cards_added` y `unlocked_activities` (actividades del Club desbloqueadas). |
| GET    | `/api/club`                                 | `{activities: [...]}`: todas las actividades con su `state` (`locked` \| `new` \| `unlocked` \| `done`). Antes desbloquea los hitos pendientes. Las bloqueadas solo traen sala, nivel y `hint`. |
| GET    | `/api/club/summary`                         | `{new, unlocked, total}`, para el aviso de la barra de navegación.                             |
| GET    | `/api/club/{id}`                            | `{activity, card}`: la actividad con su contenido; la marca como vista. `403 locked` si no está desbloqueada. |
| POST   | `/api/club/{id}/complete`                   | `{score}` (0-100). Guarda la mejor puntuación y devuelve `best_score`.                          |
| GET    | `/api/srs/summary`                          | `{due, total}`: tarjetas pendientes y totales del usuario.                                    |
| GET    | `/api/srs/due?limit=20`                     | Tarjetas pendientes con término, traducción, definición, ejemplo y la previsión de intervalo para cada nota. |
| POST   | `/api/srs/review`                           | `{card_id, grade}` con `grade` = `again` \| `hard` \| `good` \| `easy`. Devuelve el nuevo `due_at` e `interval_days`. |

## Base de datos

Las migraciones están en `backend/internal/db/migrations/*.sql`. Van embebidas en el binario y se aplican en orden al arrancar (tabla `schema_migrations`).

- `users`: `id` (UUID), `email` (único), `password_hash` (nulo en cuentas de Google), `google_sub` (ID de la cuenta de Google, único), `created_at`.
- `user_progress`: `id`, `user_id` (FK con borrado en cascada), `unit_id`, `lesson_id`, `status` (`not_started` | `in_progress` | `completed`), `score`, `updated_at`. Tiene `UNIQUE(user_id, lesson_id)`, así que completar una lección es un upsert que conserva la mejor puntuación.

- `srs_cards`: una tarjeta por usuario y término de vocabulario (`UNIQUE(user_id, lesson_id, term)`), con los campos SM-2 `ease`, `interval_days`, `repetitions` y `due_at`. El texto de la tarjeta no se guarda; se lee del catálogo, así que editar el JSON actualiza las tarjetas.

- `user_activity`: actividades del Club desbloqueadas por cada usuario (`PRIMARY KEY(user_id, activity_id)`), con el hito que las desbloqueó (`unit:<id>` o `checkpoint:<lesson_id>`), `seen_at`, `completed_at` y `best_score`.

Una unidad se considera completada cuando todas sus lecciones lo están.

### Repaso espaciado (SRS)

Al completar una lección, cada término de su `vocabulary_table` se convierte en una tarjeta. En `/review` el repaso es activo: hay que responder antes de ver la tarjeta, en una de dos direcciones. En modo "Mixto" se alternan por tarjeta, y también se puede fijar una.

- **Escuchar → ES**: suena el término en inglés, sin mostrarlo, y se escribe su significado. La comprobación ignora tildes y artículos, acepta las variantes separadas por `/` y la forma `-o/a`, y tolera erratas pequeñas.
- **ES → Inglés**: se muestran la traducción y la definición, y se dice el término por micrófono (≥ 75 % de coincidencia) o se escribe.

Un fallo o "No lo sé" califica la tarjeta como "Otra vez" y la tarjeta vuelve a salir en la misma sesión. Si se acierta, el usuario elige entre Difícil, Bien y Fácil. El algoritmo, un SM-2 simplificado que está en `backend/internal/srs/sm2.go`, decide cuándo vuelve a salir:

| Nota       | Efecto                                                                         |
| ---------- | ------------------------------------------------------------------------------ |
| Otra vez   | Reinicia la tarjeta: vuelve en 10 minutos y la facilidad (`ease`) baja 0,2     |
| Difícil    | Intervalo × 1,2 y facilidad −0,15                                              |
| Bien       | 1 día, luego 3 días, después intervalo × facilidad                             |
| Fácil      | Como "Bien" × 1,3 y facilidad +0,15                                            |

La facilidad nunca baja de 1,3.

## Añadir contenido

El temario está en [`docs/syllabus.md`](docs/syllabus.md) (12 unidades por nivel, siguiendo el Cambridge English Grammar/Vocabulary Profile) y todo el contexto sale de una historia continua: [`docs/story/bible.md`](docs/story/bible.md) (personajes, voces y reglas) y un libro por nivel (`docs/story/a1.md`…). Un test (`story_test.go`) comprueba que el diálogo de cada unidad coincide palabra por palabra con su capítulo, así que hay que cambiar los dos a la vez.

### Estado del curso

- **A1 a C1 completos**: 5 niveles × 12 unidades, en 4 temas de 3 unidades. Cada tema acaba con un checkpoint (`kind: "test"`) y la unidad 12 incluye además el test final del nivel.
- **Una sola historia** cuenta todo el curso: Lucía, una diseñadora valenciana, llega a Bristol (A1) y termina con su propio estudio, Green Door Design, y una pedida de mano (C1). Todos los diálogos y ejemplos salen de ella.
- **Audio en todas las líneas**: 811 MP3 en `backend/data/audio/` (unos 25 MB, versionados en git). Cada personaje tiene siempre la misma voz; Daniel y Maureen tienen acento irlandés.
- **135 verbos irregulares** de A1 a C1 en `backend/data/expressions/irregular_verbs.json`, con la pestaña «Verbos irregulares» en Expresiones y su tipo de tarjeta en Repaso. Los ejemplos también salen de la historia.
- `backend/data/expressions/unit_expressions.json` asocia a cada unidad unos cuantos idioms y phrasal verbs. Un test exige que esas unidades existan, así que si cambias un `unit_id` hay que actualizarlo también ahí.
- **Pendiente**: recorrer en el navegador, con una cuenta, al menos un par de unidades y un checkpoint de cada nivel antes de publicar.

### Cambiar o añadir diálogos

1. Edita el capítulo en `docs/story/<nivel>.md` **y** el `audio_context` del JSON de la unidad. Si no coinciden, `go test ./internal/content` (`TestStoryMatchesLessons`) dice qué línea falla.
   - Formato del capítulo: `## N. Título`, después `` `unit: <unit_id>` `` (o `` `unit: <unit_id>/<lesson_id>` `` si la unidad tiene varias lecciones), la escena en líneas `> …` (la lee el narrador) y las líneas `**Speaker:** texto`.
2. Respeta las reglas de [`docs/story/bible.md`](docs/story/bible.md): solo gramática del nivel o anterior y continuidad con la línea temporal (actualízala si añades hechos).
3. Si aparece un personaje nuevo, añádelo a `backend/data/voices.json` con una voz que **no use nadie más** (el loader rechaza las voces repetidas) y también a la tabla de personajes de la biblia.
4. Genera el audio (ver «Voces de los diálogos») con `-prune` y commitea los MP3 junto con el contenido.
5. `cd backend && go test ./...` y reinicia el backend.

Cada nivel es una carpeta con un fichero por unidad: `backend/data/levels/a1/00_level.json` (nivel y orden de los temas) y `NN_<unit_id>.json`, que repite `level_id` e indica su `theme_id`. El backend junta los ficheros con el mismo `level_id`. Reinicia el backend después de editarlos. Estructura:

```
level (level_id, title, description)
└── themes[] (theme_id, title)
    └── units[] (unit_id, title, description)
        └── lessons[] (lesson_id, title)
            └── steps[] (phase, type, content)
```

### Flujo de 7 fases por lección

Cada lección debe recorrer estas fases **en orden**. Una fase puede tener varios pasos, por ejemplo práctica = `fill_blanks` + `word_order`.

| # | `phase`      | Objetivo                                         | Tipos habituales                                   |
| - | ------------ | ------------------------------------------------ | -------------------------------------------------- |
| 1 | `context`    | Escuchar o leer un diálogo o texto real          | `audio_context`                                    |
| 2 | `discovery`  | Identificar palabras o estructuras               | `multiple_choice`, `match_pairs`                   |
| 3 | `grammar`    | Explicar la regla con ejemplos y tabla           | `grammar_rule`                                     |
| 4 | `practice`   | Practicar la estructura                          | `fill_blanks`, `word_order`, `transformation`      |
| 5 | `production` | Producir: hablar, dictado, traducción            | `speaking`, `dictation`, `translation`             |
| 6 | `vocabulary` | Ficha resumen con audio                          | `vocabulary_table`                                 |
| 7 | `review`     | Consolidar                                       | `speed_quiz` (y SRS automático del vocabulario)    |

### Tests (checkpoints)

Una lección con `"kind": "test"` no sigue las 7 fases: es una lista de ejercicios puntuados (al menos uno), normalmente con `phase: "review"`. Cada nivel tiene un checkpoint cada 3 unidades y un test final en la unidad 12.

### Voces de los diálogos

Cada `speaker` de un `audio_context` debe estar en [`backend/data/voices.json`](backend/data/voices.json), que le asigna una voz fija (el `passage` lo lee `Narrator`). Si falta alguno, el backend no arranca. Los audios se generan aparte con Azure Speech: solo se generan las líneas nuevas o cambiadas.

```bash
cd backend
go run ./cmd/tts -prune   # -dry-run para ver qué falta sin llamar a Azure
```

Los MP3 van a `backend/data/audio/` y se sirven desde `/api/audio`. Si falta uno, la app usa la voz del navegador.

- **Clave de Azure**: `cmd/tts` la lee del `.env` de la raíz (ignorado por git) con `AZURE_SPEECH_KEY_1` (o `_KEY_2`) y `AZURE_SPEECH_LOCATION` (la nuestra es `northeurope`). Las variables de entorno tienen prioridad, y también se aceptan los nombres `AZURE_SPEECH_KEY` y `AZURE_SPEECH_REGION`. `AZURE_SPEECH_ENDPOINT` no se usa, porque la URL de síntesis se construye a partir de la región. Para crear la clave: en [portal.azure.com](https://portal.azure.com), un recurso **Speech service** en el plan gratuito **F0** (500.000 caracteres al mes), y en «Keys and Endpoint» copias **KEY 1** y **Location/Region**.
- **Coste**: todo el curso son unos 60.000 caracteres, así que regenerarlo entero cabe de sobra en el plan gratuito.
- **Nombre de cada fichero**: es el `sha1(voz|texto)`. Si cambias una línea o la voz de un personaje, se genera un MP3 nuevo y `-prune` borra el antiguo. Si ninguna línea ha cambiado, el script no genera nada.
- **Voces disponibles**: si un nombre de voz no existe en Azure, el script se detiene y lo indica. Hay que cambiarlo en `voices.json` y volver a ejecutarlo.
- **Alternativas sin Azure**: AWS Polly no tiene ninguna voz irlandesa masculina (en-IE solo tiene a Niamh) y Google Cloud TTS no tiene en-IE. Por eso usamos Azure (`en-IE-ConnorNeural` para Daniel).

### Tipos de paso

Los ejercicios comparten la forma `{ "instructions": "...", "items": [...] }`. Cada item admite además `explanation`, que se muestra tras responder, y `hint`, que se muestra antes.

| `type`             | `content`                                                                                     |
| ------------------ | --------------------------------------------------------------------------------------------- |
| `audio_context`    | `{ "dialogue": [{ "speaker", "text" }] }` o `{ "title"?, "passage" }` (lectura). Se escucha con la síntesis de voz del navegador |
| `grammar_rule`     | `{ "title", "explanation", "examples"?: [..], "table"?: { "headers": [..], "rows": [[..]] } }` |
| `vocabulary_table` | `{ "items": [{ "term", "definition", "translation", "example"? }] }`. Cada término tiene audio |
| `multiple_choice`  | items: `{ "question", "options": [..], "answer": <índice> }`                                   |
| `match_pairs`      | `{ "pairs": [{ "left", "right" }] }` (sin `items`)                                            |
| `fill_blanks`      | items: `{ "sentence": "We ___ in at 3.", "answers": [["checked"]] }`: una lista de respuestas válidas por cada `___` |
| `word_order`       | items: `{ "answer": "We checked in at three", "distractors"?: [..] }`: las palabras se barajan solas |
| `transformation`   | items: `{ "prompt"?, "source", "answers": [..] }`                                             |
| `translation`      | items: `{ "source": "frase en español", "answers": [..] }`                                    |
| `dictation`        | items: `{ "text" }`: se reproduce con voz y el usuario lo escribe                             |
| `speaking`         | items: `{ "text" }`: el usuario lo lee en voz alta (Web Speech API, ≥ 75 % de coincidencia); si el navegador no lo soporta, se escribe |
| `speed_quiz`       | `{ "time_limit_seconds", "items": [ítems de multiple_choice] }`: cronómetro global             |
| `verb_cloze`       | items: `{ "text": "She ___ (go) home and ___ (have) dinner.", "answers": [["went"], ["had"]] }`: párrafos con el verbo base entre paréntesis tras cada hueco; puntúa cada hueco |

Las respuestas escritas se comparan normalizadas: sin mayúsculas ni puntuación y con las contracciones expandidas, así que "I'm" equivale a "I am". Conviene incluir en `answers` las variantes razonables.

La puntuación de la lección se calcula con los aciertos a la primera sobre el total de items de ejercicio, y se guarda en `user_progress.score`.

### Club: actividades desbloqueables

El Club (`/club`) reúne actividades de academia repartidas en salas: 🎵 Música (`song`), 📚 Biblioteca (`reading`), 🎬 Cine (`video`) y 🎲 Juegos (`verb_cloze`). Cada actividad es un JSON en `backend/data/club/<nivel>/` y se valida al arrancar.

**Desbloqueo.** Terminar una unidad o aprobar un checkpoint (un hito) desbloquea una actividad del nivel. Se elige en este orden:
1. La que tiene `after_unit` igual a esa unidad.
2. Una del mismo `milestone` (`unit` | `checkpoint`) y nivel.
3. Cualquiera del nivel.
4. Una de un nivel inferior.

Entre las candidatas se elige con un sorteo fijo por usuario e hito: cada alumno recibe sorpresas distintas, pero siempre las mismas. Un hito que no encuentra actividad queda pendiente, así que el contenido que se añada después llega también a los alumnos que van por delante.

Campos comunes:

```json
{ "id", "type", "level", "title", "subtitle"?, "minutes", "youtube_id"?, "milestone", "after_unit"?,
  "content": { …según el tipo…, "vocabulary"?: [{ "term", "translation", "definition"? }], "expressions"?: ["phrasal:get-up", "idiom:time-flies"] } }
```

| `type` | `content` |
| ------ | --------- |
| `song` | `{ "start"?, "end", "lines": [{ "t", "text": "I ___ you", "answers"?: [["love"]] }], "distractors"?: [..], "mode"?: "bank" \| "type" }`. Solo un fragmento (máx. 16 líneas) por derechos de autor. Hasta A2 los huecos se rellenan con un banco de palabras |
| `reading` | `{ "kind"?, "paragraphs": [..], "glossary"?: { "palabra": "traducción" }, "questions": [ítems de multiple_choice], "source"? }`. Longitud por nivel: A1 500-800 palabras, A2 700-1200, B1 1000-1800, B2 1500-2500, C1 2000-3000 |
| `video` | `{ "speaker"?, "license", "source_url", "start"?, "transcript": [{ "t", "text" }], "checkpoints": [{ "t", "questions": [..] }] }`. El vídeo se para en cada `t` y pregunta |
| `verb_cloze` | `{ "instructions"?, "items": [{ "text": "She ___ (go) home.", "answers": [["went"]] }] }`. También vale como paso de una lección |

**Vocabulario nuevo.** Las actividades sirven para ampliar vocabulario: un término de `vocabulary` no puede estar en el `vocabulary_table` de ninguna unidad. Si lo está, el backend no arranca y dice en qué unidad aparece.

**Vídeos de YouTube.** Se cargan en modo privacidad (youtube-nocookie) y solo cuando el alumno pulsa play.

Para los tiempos:
- `go run ./cmd/subs [-song] <url>` necesita `yt-dlp` y saca las líneas con tiempo de los subtítulos. Prefiere los escritos por personas y avisa si solo hay automáticos.
- Si no hay subtítulos útiles, la página de desarrollo `/club/dev/timing` permite marcar cada línea pulsando Espacio mientras suena.
- Las charlas TED tienen licencia CC BY-NC-ND (no comercial), así que hay que revisarlas antes de monetizar.

**Laboratorio.** Con `LAB_CLUB_DIR` (solo en `docker-compose.dev.yml`) se cargan las actividades de `backend/data/lab_club`, que están siempre abiertas, para probar los reproductores.

### Validación

Al arrancar (y en `go test ./...`), `backend/internal/content/validate.go` comprueba:

- `unit_id` y `lesson_id` únicos en todo el catálogo;
- que cada lección tenga las 7 fases y en orden;
- los campos obligatorios de cada tipo, por ejemplo que el número de `___` coincida con `answers`, que `answer` sea un índice válido o que haya al menos 2 parejas.

Si algo falla, el backend no arranca y el error indica dónde está el problema, por ejemplo: `b1_intermediate.json: unit hotel_checkin / lesson phrasal_verbs_hotel / step 5 (fill_blanks): item 2 has 2 blanks but 1 answers`.

### Añadir un tipo de ejercicio nuevo

1. Crea el componente en `frontend/src/components/exercises/`. Para ejercicios de varios items puedes reutilizar `ExerciseShell` y `useExerciseItems`. El componente debe llamar a `onComplete({correct, total})`.
2. Añade el `case` en `components/steps/StepRenderer.tsx` y el tipo en `EXERCISE_TYPES`.
3. Opcional: añade la validación en `validate.go`. Los tipos desconocidos se aceptan y se muestran como JSON.

## Despliegue en un VPS

Producción actual: VPS de bukios en Hetzner, en `fluently.bukios.com` (temporal), con `./deploy/deploy.sh`. Ver [`deploy/README.md`](deploy/README.md).

Despliegue genérico en un VPS propio:

```bash
git clone <repo> && cd english-app
cp .env.example .env    # pon un JWT_SECRET fuerte (openssl rand -hex 32)
docker compose up -d --build
```

Para actualizar: `git pull && docker compose up -d --build`. Si pones un proxy con TLS delante (Caddy, Traefik, nginx), apúntalo al puerto del frontend y activa `COOKIE_SECURE=true`.

## Estructura

```
backend/
  cmd/server/main.go           arranque, router y apagado ordenado
  internal/config              variables de entorno
  internal/db                  pool pgx y migraciones embebidas
  internal/content             cargador e índice de los JSON de niveles
  internal/auth                JWT, middleware y bcrypt
  internal/store               consultas SQL (usuarios y progreso)
  internal/handlers            handlers HTTP
  data/levels/*.json           catálogo de contenido
frontend/
  src/api/client.ts            wrapper de fetch
  src/context/AuthContext.tsx  sesión
  src/pages/                   Home, Login, Register, Levels, UnitView
  src/components/steps/        un renderizador por tipo de paso
docker-compose.yml
```
