# Club: catálogo completo y cuándo se ve cada actividad

Foto del contenido del Club a 12/10/2026: 26 actividades en `backend/data/club/`, más 3 de laboratorio que solo existen en dev.

## Cómo se desbloquea

- **Hitos.** Cada nivel tiene 12 unidades, 4 checkpoints (el test que cierra las unidades 3, 6, 9 y 12) y un examen de nivel. Eso son **17 hitos por nivel**:
  - terminar todas las lecciones de una unidad (`unit:<id>`);
  - aprobar un checkpoint (`checkpoint:<lesson_id>`);
  - aprobar el examen de nivel, que cuenta como un checkpoint más (`exam:<id>`).
- **Una actividad por hito.** El backend elige una actividad aún bloqueada que no sea de un nivel superior al del hito. El orden de preferencia es:
  1. la que está atada a la unidad del hito (`after_unit`);
  2. una del mismo nivel y del mismo tipo de hito (`milestone: unit|checkpoint`);
  3. una del mismo nivel;
  4. cualquier otra, incluidas las de niveles inferiores y las atadas a una unidad anterior.

  Una actividad atada a una unidad nunca sale antes de esa unidad.

  Entre empatadas decide un barajado sembrado con el usuario y el hito. Cada alumno recibe sus propias sorpresas, pero siempre las mismas.
- **Cuándo se ve.** Desde el primer día el Club muestra **todas** las cartas. Las bloqueadas aparecen boca abajo con la sala, el nivel y una pista: «Termina la unidad «X»», «Supera un checkpoint de A2» o «Termina una unidad de B1». Al desbloquearse:
  - aparece el regalo en la pantalla de lección completada;
  - la insignia ámbar del menú cuenta las nuevas sin ver;
  - la carta se da la vuelta en el álbum.
- **Salas.** Canción → 🎵 Música, lectura → 📚 Biblioteca, vídeo → 🎬 Cine y `verb_cloze` → 🎲 Juegos.

## Resumen

| Nivel | 🎵 Música | 📚 Biblioteca | 🎬 Cine | 🎲 Juegos | Total | Hitos del nivel |
|---|---|---|---|---|---|---|
| A1 | 3 | 2 | – | 1 | 6 | 17 |
| A2 | 3 | 2 | – | 2 | 7 | 17 |
| B1 | 2 | – | 2 | – | 4 | 17 |
| B2 | 2 | – | 3 | – | 5 | 17 |
| C1 | 2 | – | 2 | – | 4 | 17 |
| **Total** | **12** | **4** | **7** | **3** | **26** | **85** |

## Catálogo por nivel

La columna «Hito» es el tipo de hito que la prefiere. «Atada a» es la unidad con la que casa por tema.

### A1

| Actividad | Sala | Hito | Atada a | Min | Detalle |
|---|---|---|---|---|---|
| Three Little Birds (Bob Marley & The Wailers) | 🎵 | unidad | – | 4 | 9 líneas (0:36–1:18), 3 preguntas sobre la letra |
| Yellow (Coldplay) | 🎵 | unidad | `numbers_colors` · Unpacking | 4 | 5 líneas (0:33–1:11), 2 preguntas |
| Happy (Pharrell Williams) | 🎵 | unidad | `free_time` · Friday Night Music | 4 | 8 líneas (0:27–0:55), 3 preguntas |
| My New Home: correo de Lucía a Javi | 📚 | unidad | `new_flatmates` · The Flatmates | 8 | 688 palabras, 7 preguntas |
| Welcome to Bristol: guía de la ciudad | 📚 | checkpoint | – | 8 | 632 palabras, 7 preguntas |
| Priya's Long Day: repaso para el examen A1 | 🎲 | unidad | `shift_work` · Priya's Shifts | 10 | 6 párrafos, 38 huecos, 11 temas del examen |

### A2

| Actividad | Sala | Hito | Atada a | Min | Detalle |
|---|---|---|---|---|---|
| Someone Like You (Adele) | 🎵 | unidad | – | 5 | 15 líneas (0:12–1:14), 3 preguntas |
| Photograph (Ed Sheeran) | 🎵 | unidad | `past_memories` · Old Photos | 5 | 12 líneas (0:52–1:33), 2 preguntas |
| Viva la Vida (Coldplay) | 🎵 | checkpoint | – | 5 | 6 líneas (0:12–1:10), 3 preguntas |
| Two Months in Bristol: diario de Lucía | 📚 | unidad | `comparing_cities` · Bristol or Valencia? | 10 | 855 palabras, 8 preguntas |
| The Secret Artist of Bristol (Banksy) | 📚 | checkpoint | – | 10 | 752 palabras, 7 preguntas |
| Sam's Terrible Saturday: repaso para el examen A2 | 🎲 | unidad | `a_bad_day` · What a Morning! | 12 | 7 párrafos, 42 huecos, 8 temas del examen |
| Shopping at Cabot Circus: repaso para el examen A2 | 🎲 | checkpoint | `past_memories` · Old Photos | 12 | 7 párrafos, 32 huecos, 6 temas del examen |

### B1

| Actividad | Sala | Hito | Atada a | Min | Detalle |
|---|---|---|---|---|---|
| Let Her Go (Passenger) | 🎵 | unidad | – | 5 | 8 líneas (0:23–1:30), 3 preguntas |
| Thinking Out Loud (Ed Sheeran) | 🎵 | checkpoint | – | 5 | 13 líneas (0:06–1:19), 3 preguntas |
| AI 101 (Brandon Leshchinskiy, MIT OCW) | 🎬 | checkpoint | – | 11 | tramo 0:30–11:13, 2 pausas + 3 preguntas finales |
| How to Speak (Patrick Winston, MIT OCW) | 🎬 | checkpoint | – | 10 | tramo 0:15–10:17, 2 pausas + 2 preguntas finales |

### B2

| Actividad | Sala | Hito | Atada a | Min | Detalle |
|---|---|---|---|---|---|
| Rolling in the Deep (Adele) | 🎵 | unidad | – | 4 | estribillo, 8 líneas (0:40–1:18), 3 preguntas |
| Mr. Brightside (The Killers) | 🎵 | checkpoint | – | 4 | primera estrofa, 7 líneas (0:08–0:24), 3 preguntas |
| What Changed in the 1980s? (Tom Kochan, MIT OCW) | 🎬 | unidad | – | 5 | completo, 1 pausa + 3 preguntas |
| The MIT Climate Primer (Laur Hesse Fisher & Kerry Emanuel) | 🎬 | checkpoint | – | 6 | completo, 1 pausa + 3 preguntas |
| Generative AI and Science Photography (Felice Frankel, MIT OCW) | 🎬 | checkpoint | – | 11 | completo, 2 pausas + 2 preguntas |

### C1

| Actividad | Sala | Hito | Atada a | Min | Detalle |
|---|---|---|---|---|---|
| The Sound of Silence (Simon & Garfunkel) | 🎵 | unidad | – | 5 | 14 líneas (0:08–1:31), 3 preguntas |
| Bohemian Rhapsody (Queen) | 🎵 | checkpoint | – | 6 | intro, 13 líneas (0:00–0:52), 3 preguntas |
| The Ethics of AI: Bias (seminario dramatizado, MIT OCW) | 🎬 | unidad | – | 4 | completo, 1 pausa + 3 preguntas |
| Deliberative Democracy (mesa redonda, MIT OCW) | 🎬 | checkpoint | – | 5 | completo, 1 pausa + 3 preguntas |

### Laboratorio (solo dev, no se reparten)

`lab_song` (Never Gonna Give You Up), `lab_video` (Ken Robinson, TED) y `lab_cloze` (A Weekend in London: 6 párrafos, 31 huecos, 13 temas del examen A2). Están en `backend/data/lab_club/`, se cargan solo si existe `LAB_CLUB_DIR` y siempre se ven desbloqueadas.

## Cronología: qué recibe un alumno que hace el curso en orden

Esto es la simulación real del algoritmo `Club.Pick` con los datos actuales, para un alumno que completa todas las lecciones en orden y aprueba cada examen. En cada unidad con checkpoint, el checkpoint (test) llega antes que la unidad completa.

| Nivel | Hito | Desbloquea | ¿Igual para todos? |
|---|---|---|---|
| A1 | 1 · unidad Hello, Bristol | Three Little Birds | sí |
| A1 | 2 · unidad The Flatmates | My New Home | sí (atada) |
| A1 | 3 · checkpoint 1 | Yellow | sí (atada a Unpacking, que contiene el checkpoint) |
| A1 | 4 · unidad Unpacking | Welcome to Bristol | sí |
| A1 | unidades 4–6 y checkpoint 2 | nada | |
| A1 | unidad Priya's Shifts | Priya's Long Day | sí (atada) |
| A1 | checkpoint 3 (en Friday Night Music) | Happy | sí (atada) |
| A1 | resto de A1 y examen | **nada** | |
| A2 | 1 · unidad A Busy Week | Someone Like You | sí |
| A2 | 2 · unidad A Coat for the Winter | Banksy *o* Viva la Vida | varía |
| A2 | 3 · checkpoint 1 y unidad Old Photos | Photograph y Shopping at Cabot Circus (las dos atadas), en orden variable | varía |
| A2 | unidad What a Morning! | Sam's Terrible Saturday | sí (atada) |
| A2 | unidad Bristol or Valencia? | Two Months in Bristol | sí (atada) |
| A2 | checkpoint 2 | la que quedó de Banksy / Viva la Vida | varía |
| A2 | resto de A2 y examen | **nada** | |
| B1 | 1–4 · unidades 1–3 y checkpoint 1 | las 4 actividades de B1 en orden variable | varía |
| B1 | 5–17 | **nada** | |
| B2 | 1–5 · unidades 1–4 y checkpoint 1 | las 5 actividades de B2 en orden variable | varía |
| B2 | 6–17 | **nada** | |
| C1 | 1–4 · unidades 1–3 y checkpoint 1 | las 4 actividades de C1 en orden variable | varía |
| C1 | 5–17 | **nada** | |

## Lo que salta a la vista

1. **El catálogo se agota pronto.** En B1, B2 y C1 todo se desbloquea entre las unidades 1 y 4; en A1 y A2 las actividades atadas llegan hasta las unidades 9 y 5. El resto de hitos no da ningún regalo: hay 26 actividades para 85 hitos.
2. **El tipo de hito pesa poco.** Los vídeos de B1 se marcaron para checkpoint, pero, como no hay nada más, salen en las unidades 1–3.
3. **Resuelto (octubre de 2026):** las actividades atadas a una unidad ya no salen antes de ella. Antes *Happy* y *Priya's Long Day* se abrían en las unidades 5 y 6, y su pista («Termina la unidad…») engañaba.

## Opciones para repartirlo mejor

- **A. Más contenido:** ~17 actividades por nivel, una por hito. Es lo ideal, pero lleva tiempo. Los juegos que salgan de los libros van en esta línea.
- **B. Espaciar los regalos:** desbloquear solo en checkpoints y examen (5 por nivel) y en las unidades atadas. Con el catálogo actual casi cuadra: A1 tiene 6, A2 7, B1 4, B2 5 y C1 4.
- **C. Atar cada actividad a un hito concreto:** `after_unit` en todas, repartidas por el nivel. El reparto queda fijo y predecible, pero se pierde la sorpresa. Los juegos ya lo llevan siempre.
