
Vas a inicializar un repositorio completo para una aplicación de aprendizaje de inglés desde cero.
El repositorio debe organizarse en una estructura monorepo limpia con dos carpetas principales: `frontend/` y `backend/`.

---

## 1. Arquitectura General y Stack

1. **Frontend (`/frontend`)**:
   - Framework: **React + Vite + TypeScript**.
   - UI / Estilos: **Tailwind CSS**.
   - Iconos: **Lucide React**.
   - Enrutamiento: **React Router v6**.
   - Estado y Fetching: Axios o Fetch API con Context API / custom hooks para autenticación.

2. **Backend (`/backend`)**:
   - Lenguaje: **Go (Golang)**.
   - Router/Framework HTTP: **Chi Router** (`github.com/go-chi/chi/v5`) o librería estándar `net/http`.
   - Autenticación: **JWT (JSON Web Tokens)** guardados en HTTP-only cookies o Authorization Headers.
   - Hashing de contraseñas: **bcrypt**.
   - Base de Datos: **PostgreSQL** (para guardar usuarios, autenticación y su progreso de unidades).
   - Controlador de Contenido: Carga dinámica de archivos JSON con la estructura de Niveles, Temas y Unidades.

3. **Infraestructura y Despliegue (`/docker`)**:
   - `Dockerfile` independiente para el frontend (build multi-stage con Nginx).
   - `Dockerfile` independiente para el backend en Go (build multi-stage ultraligero con Alpine/Scratch).
   - `docker-compose.yml` en la raíz que orqueste:
     - `postgres` (Base de datos).
     - `backend` (API Go expuesta en puerto 8080).
     - `frontend` (Nginx/React expuesto en puerto 80 o 3000).

---

## 2. Estructura de Datos de Contenido (JSON)

Crea una carpeta `backend/data/levels/` que contenga el catálogo de contenidos en archivos JSON. Define el cargador en Go para parsear estos JSONs al arrancar.

### Ejemplo de esquema JSON (`b1_intermediate.json`):
```json
{
  "level_id": "B1",
  "title": "B1 Intermediate",
  "description": "Nivel intermedio de consolidación y fluidez",
  "themes": [
    {
      "theme_id": "travel_accommodation",
      "title": "Travel & Accommodations",
      "units": [
        {
          "unit_id": "hotel_checkin",
          "title": "Checking into a Hotel & Complaints",
          "description": "Aprende phrasal verbs y vocabulario para gestionar tu estancia.",
          "lessons": [
            {
              "lesson_id": "phrasal_verbs_hotel",
              "title": "Phrasal Verbs for Hotel Stay",
              "steps": [
                {
                  "type": "audio_context",
                  "content": {
                    "dialogue": [
                      {"speaker": "Receptionist", "text": "Good afternoon, how can I help you?"},
                      {"speaker": "Guest", "text": "Hi, I'd like to check in, please."}
                    ]
                  }
                },
                {
                  "type": "grammar_rule",
                  "content": {
                    "title": "Phrasal Verbs: Separables vs Inseparables",
                    "explanation": "Los verbos como 'check in' son inseparables, mientras que 'turn off' permite poner el objeto en medio."
                  }
                },
                {
                  "type": "vocabulary_table",
                  "content": {
                    "items": [
                      {"term": "Check in", "definition": "Arrive and register at a hotel", "translation": "Registrarse", "example": "We checked in at 3 PM."}
                    ]
                  }
                }
              ]
            }
          ]
        }
      ]
    }
  ]
}

```

---

## 3. Modelo de Base de Datos y Progreso (PostgreSQL)

Crea las migraciones o scripts de inicialización SQL en el backend para dos tablas principales:

1. `users`:
* `id` (UUID / SERIAL PRIMARY KEY)
* `email` (VARCHAR UNIQUE)
* `password_hash` (VARCHAR)
* `created_at` (TIMESTAMP)


2. `user_progress`:
* `id` (UUID / SERIAL PRIMARY KEY)
* `user_id` (FOREIGN KEY -> users.id)
* `unit_id` (VARCHAR)
* `lesson_id` (VARCHAR)
* `status` (VARCHAR: "not_started", "in_progress", "completed")
* `score` (INT)
* `updated_at` (TIMESTAMP)



---

## 4. Endpoints del Backend (Go)

Implementa los siguientes endpoints RESTful:

### Autenticación:

* `POST /api/auth/register`: Registro de usuario con hash bcrypt.
* `POST /api/auth/login`: Autenticación y retorno de JWT.
* `GET /api/auth/me`: Retorna el perfil del usuario autenticado.

### Contenido y Progreso (Rutas protegidas por Middleware JWT):

* `GET /api/levels`: Retorna la lista resumida de niveles y temas disponibles cargados desde los JSONs.
* `GET /api/levels/{level_id}/units/{unit_id}`: Retorna el contenido completo de una unidad con sus lecciones y pasos.
* `GET /api/progress`: Retorna el progreso del usuario autenticado (qué unidades tiene completadas).
* `POST /api/progress/complete`: Registra la finalización de una lección o unidad para el usuario actual.

---

## 5. Vistas del Frontend (React + Tailwind)

Construye las siguientes páginas e interfaces interactivas:

1. **Home / Landing Page (`/`)**:
* Hero banner presentando la aplicación.
* Botón para iniciar sesión o ir directamente a los niveles si ya hay sesión activa.


2. **Login / Registro (`/login`, `/register`)**:
* Formularios simples con validación para autenticarse.


3. **Navegador de Niveles (`/levels`)**:
* Muestra tarjetas para los niveles (A1, A2, B1, B2, C1).
* Al seleccionar un nivel, despliega sus **Temas** y las **Unidades** asociadas.
* Marca visualmente las unidades completadas vs pendientes según el estado de progreso devuelto por el backend.


4. **Vista de Unidad / Lección (`/units/:unitId`)**:
* Renderizador dinámico según el tipo de paso que venga en el JSON (`audio_context`, `grammar_rule`, `vocabulary_table`, etc.).
* Botones de navegación para avanzar de paso o completar la unidad.



---

## 6. Configuración de Docker

1. **`backend/Dockerfile`**:
* Multi-stage build en Go (compila binario ejecutable y corre en imagen `alpine` minimalista).


2. **`frontend/Dockerfile`**:
* Multi-stage build (compila React con Vite y sirve assets estáticos con `nginx:alpine`).


3. **`docker-compose.yml`**:
* Levanta PostgreSQL con volúmenes persistentes.
* Levanta el backend en Go conectándolo a PostgreSQL mediante variables de entorno (`DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`).
* Levanta el frontend y configura proxy/puertos para evitar problemas de CORS en entorno local.



---

### Paso Final de Ejecución:

Genera la estructura de carpetas, escribe todo el código inicial básico pero funcional, crea un archivo `README.md` explicativo con las instrucciones para levantar el proyecto con `docker compose up --build`, e inicia la compilación de prueba para verificar que no hay errores.

```

---

## ¿Por qué esta estructura es ideal para arrancar?

1. **Modificabilidad Total del Contenido:** No necesitas tocar la base de datos para añadir nuevos cursos. Simplemente creas o editas archivos como `backend/data/levels/a2_elementary.json` y el servidor los cargará en memoria automáticamente al iniciar.
2. **Estructura Escalable:** Separa limpiamente el contenido pedagógico (JSONs) de los datos del usuario (Progreso en PostgreSQL).
3. **Despliegue Instantáneo:** Al incluir `docker-compose.yml`, cuando quieras subir la app a un servidor VPS (como Hetzner) sólo tendrás que hacer `git pull` y `docker compose up -d`.

<FollowUp label="¿Quieres que añadamos algún tipo de ejercicio específico al JSON de ejemplo antes de ejecutar a Claude Code?" query="Añadamos al JSON de ejemplo la estructura para un ejercicio interactivo de ordenar palabras y rellenar huecos."/>

```