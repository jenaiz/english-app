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
| `GOOGLE_CLIENT_ID` | *(vacío)*         | Client ID OAuth (tipo "Aplicación web") para "Continuar con Google". Vacío = botón oculto. |

### Login con Google

El frontend usa Google Identity Services: el botón devuelve un ID token (JWT firmado por Google) y el backend lo verifica con las claves públicas de Google (`aud` = tu Client ID, emisor de Google, email verificado). No hace falta client secret.

1. En [Google Cloud Console](https://console.cloud.google.com/apis/credentials), crea un **ID de cliente de OAuth** de tipo **Aplicación web** (antes configura la pantalla de consentimiento).
2. En **Orígenes de JavaScript autorizados** añade `http://localhost:5173`, `http://localhost:3000` y el dominio de producción (`https://fluently.bukios.com`). No hacen falta URIs de redirección.
3. Pon `GOOGLE_CLIENT_ID=<id>.apps.googleusercontent.com` en el `.env` de la raíz y reinicia el backend. El frontend lo obtiene de `GET /api/auth/config`, así que no hay que recompilarlo.

La primera vez que alguien entra con Google se crea su cuenta sin contraseña. Si ya existía una cuenta con ese email, se vincula a Google y **se borra su contraseña**: la app nunca verificó ese email, así que quien la creó podría no ser el dueño. A partir de ahí esa cuenta entra solo con Google.

## API

Todas las rutas salvo register, login, logout, `auth/config`, `auth/google` y health requieren autenticación. Se puede enviar la cookie `token` (la fija el login) o una cabecera `Authorization: Bearer <jwt>`.

| Método | Ruta                                        | Descripción                                                                                    |
| ------ | ------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| POST   | `/api/auth/register`                        | `{email, password}`: crea el usuario (bcrypt), fija la cookie y devuelve `{user, token}`. 409 si el email existe. |
| POST   | `/api/auth/login`                           | `{email, password}`: fija la cookie y devuelve `{user, token}`. 401 si las credenciales son incorrectas. |
| POST   | `/api/auth/logout`                          | Borra la cookie.                                                                               |
| GET    | `/api/auth/config`                          | `{google_client_id}`: vacío si el login con Google no está configurado. Pública.               |
| POST   | `/api/auth/google`                          | `{credential}` (ID token de Google): crea o vincula la cuenta, fija la cookie y devuelve `{user, token}`. 401 si el token no es válido; 404 si no está configurado. |
| GET    | `/api/health`                               | `{status, version}`: comprueba la BD y devuelve la versión del build. Pública.                  |
| GET    | `/api/auth/me`                              | Perfil del usuario autenticado.                                                                |
| GET    | `/api/levels`                               | Resumen de niveles → temas → unidades (sin los pasos).                                         |
| GET    | `/api/levels/{level_id}/units/{unit_id}`    | Unidad completa con lecciones y pasos. Si `level_id` es `-`, se busca en todos los niveles.    |
| GET    | `/api/progress`                             | `{lessons: [...], completed_units: [...]}`                                                     |
| POST   | `/api/progress/complete`                    | `{unit_id, lesson_id?, score?}`. Sin `lesson_id` marca todas las lecciones de la unidad. Crea las tarjetas SRS del vocabulario y devuelve `cards_added`. |
| GET    | `/api/srs/summary`                          | `{due, total}`: tarjetas pendientes y totales del usuario.                                    |
| GET    | `/api/srs/due?limit=20`                     | Tarjetas pendientes con término, traducción, definición, ejemplo y la previsión de intervalo para cada nota. |
| POST   | `/api/srs/review`                           | `{card_id, grade}` con `grade` = `again` \| `hard` \| `good` \| `easy`. Devuelve el nuevo `due_at` e `interval_days`. |

## Base de datos

Las migraciones están en `backend/internal/db/migrations/*.sql`. Van embebidas en el binario y se aplican en orden al arrancar (tabla `schema_migrations`).

- `users`: `id` (UUID), `email` (único), `password_hash` (nulo en cuentas de Google), `google_sub` (ID de la cuenta de Google, único), `created_at`.
- `user_progress`: `id`, `user_id` (FK con borrado en cascada), `unit_id`, `lesson_id`, `status` (`not_started` | `in_progress` | `completed`), `score`, `updated_at`. Tiene `UNIQUE(user_id, lesson_id)`, así que completar una lección es un upsert que conserva la mejor puntuación.

- `srs_cards`: una tarjeta por usuario y término de vocabulario (`UNIQUE(user_id, lesson_id, term)`), con los campos SM-2 `ease`, `interval_days`, `repetitions` y `due_at`. El texto de la tarjeta no se guarda; se lee del catálogo, así que editar el JSON actualiza las tarjetas.

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

Crea o edita un archivo en `backend/data/levels/` y reinicia el backend. Estructura:

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

Las respuestas escritas se comparan normalizadas: sin mayúsculas ni puntuación y con las contracciones expandidas, así que "I'm" equivale a "I am". Conviene incluir en `answers` las variantes razonables.

La puntuación de la lección se calcula con los aciertos a la primera sobre el total de items de ejercicio, y se guarda en `user_progress.score`.

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
