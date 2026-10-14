# Niveles y exámenes de nivel

Cada nivel del MCER tiene sus unidades (`backend/data/levels/<nivel>/`) y un **examen de nivel** aparte (`backend/data/exams/<nivel>.json`). El examen certifica que se tiene el nivel. No es una lección más:

- Va cronometrado. El reloj sigue corriendo aunque se cierre la página, y al acabar el tiempo se entrega lo que haya.
- Durante el examen no se ve si una respuesta es correcta. Corrige el servidor, y la hoja que llega al navegador no lleva respuestas ni transcripciones.
- Tiene cuatro partes: gramática, vocabulario, reading y listening. Cada una pesa lo mismo y tiene una nota mínima.
- Cada parte tiene dos versiones equivalentes (mismos temas, mismo número de preguntas). Al repetir el examen se da la otra.
- Si se suspende, hay que esperar `retake_hours` para repetirlo.
- Aprobarlo da un certificado imprimible. Es de la app, alineado con el MCER, y lo dice claramente: no es un título oficial.
- Aprobarlo también desbloquea una actividad del Club (milestone `exam:<id>`).

Después del examen, su página muestra «Qué te toca repasar» (los temas con fallos del último intento, del más flojo al menos, con enlaces a las unidades) y el historial de intentos, cada uno con sus notas por partes y un enlace a su resultado completo. Así lo que hay que repasar no se pierde al cerrar los resultados.

## Los exámenes

| Nivel | Duración | Preguntas | Gramática | Vocabulario | Reading | Listening | Temas | Inspirado en |
|---|---|---|---|---|---|---|---|---|
| A1 | 45 min | 59 | 27 | 12 | 10 | 10 | 23 | Cambridge A1 Movers / A2 Key |
| A2 | 60 min | 76 | 41 | 12 | 11 | 12 | 29 | Cambridge A2 Key |
| B1 | 65 min | 75 | 40 | 12 | 11 | 12 | 28 | Cambridge B1 Preliminary |
| B2 | 75 min | 75 | 39 | 12 | 12 | 12 | 27 | Cambridge B2 First |
| C1 | 80 min | 68 | 32 | 12 | 12 | 12 | 23 | Cambridge C1 Advanced |

Todos tienen las mismas reglas:
- **Aprobado:** 70% de media de las cuatro partes y al menos un 50% en cada una.
- **Repetición:** 24 h después de un intento entregado.
- **Audio:** cada listening se escucha como máximo dos veces.

Los textos y diálogos son originales, inspirados en el formato de Cambridge, nunca copiados de exámenes oficiales. Las preguntas de *choice* se escriben con la respuesta correcta primero; el servidor baraja las opciones en cada intento.

## Referencias

- **Principal: *Core Inventory for General English*** (British Council y EAQUALS), [PDF público](https://www.teachingenglish.org.uk/sites/teacheng/files/media/documents/pub-british-council-eaquals-core-inventoryv2.pdf). Se usan las **páginas de detalle por nivel** (pp. 22–35: cada punto con sus ejemplos), no solo los pósters, que resumen y omiten puntos (por ejemplo, los pronombres posesivos en A1).
- **Lista de comprobación: [TrackTest](https://tracktest.eu/english-grammar-cef-level-requirements/).** Es más exhaustiva en A2–B2 y adelanta puntos un nivel (pone en A1 el present perfect, los comparativos o el zero conditional). Lo que TrackTest pide y el Core Inventory no, se añade igualmente si es razonable.
- **El *English Grammar Profile* de Cambridge** (englishprofile.org) pide registro y no se ha consultado directamente.

## Pendiente

La lista completa de pendientes del proyecto está en [docs/BACKLOG.md](../BACKLOG.md). De los exámenes:

- **Revisión humana del contenido nuevo.** Las reglas de gramática añadidas a las unidades y las preguntas de los cinco exámenes las escribió Claude en octubre de 2026 y hay que leerlas antes de publicarlas:
  - **Unidades:** 50 reglas con su ejercicio. A1 9, A2 14, B1 11, B2 11 y C1 5.
  - **Exámenes:** unas 700 preguntas entre las dos versiones de los cinco. Están en `backend/data/exams/`; los scripts que las generaron no se guardaron, así que el JSON es la fuente.
- **Más adelante:** preguntas de exámenes oficiales y un simulador, con writing y speaking.

## Limitaciones conocidas

- **Límite de escuchas.** El de dos escuchas se cuenta en el navegador (`localStorage`). Quien borre los datos de la página puede volver a escuchar. El servidor no lo controla.
- **Corrección de huecos.** Se normaliza igual que en las lecciones: mayúsculas, contracciones y puntuación no cuentan. Los apóstrofos tampoco, así que «parents» vale por «parents'». Por eso las preguntas de posesivo usan formas que se distinguen sin apóstrofo (*children's*, *sister's*).
- **Normalización duplicada.** `backend/internal/content/answers.go` es un port de `frontend/src/lib/answers.ts`. Si cambia uno, hay que cambiar el otro (los casos de `answers_test.go` sirven de referencia).
- **Notas de intentos antiguos.** El resultado de cada intento se guarda al entregarlo. Si después cambian los temas de un examen, los intentos antiguos siguen mostrando los temas de entonces.

La matriz de cobertura de cada nivel (qué pide el MCER, en qué unidad se enseña, con qué etiqueta lo pregunta el examen) está en `docs/levels/<nivel>.md`. Los cinco niveles tienen la suya y su examen: [A1](a1.md), [A2](a2.md), [B1](b1.md), [B2](b2.md) y [C1](c1.md).

## Añadir el examen de un nivel

1. **Matriz `docs/levels/<nivel>.md`.** Se parte de la página de detalle del Core Inventory de ese nivel (no solo del póster, que resume) y se usa TrackTest como lista de comprobación. Lo que falte en las unidades se añade como regla de gramática y ejercicio, sin tocar los diálogos.
2. **`backend/data/exams/<nivel>.json`.**
   - El `syllabus` lleva un tema por punto de la matriz, con las unidades que lo enseñan. Toda unidad del nivel tiene que aparecer en algún tema.
   - Cada parte tiene al menos dos `variants`.
   - Tipos de pregunta: `choice` (el servidor baraja las opciones), `gap` (un solo `___`) y `order`.
3. **Quitar la lección `<nivel>_level_test`** de la unidad 12. `TestLevelsAreComplete` espera 4 tests en un nivel con examen y 5 en uno sin examen.
4. **Generar el audio del listening:** `cd backend && go run ./cmd/tts`.
5. **Registrar los puntos en `levelCoverage`** (`backend/internal/content/coverage_test.go`): por cada punto añadido o repasado, la unidad que lo enseña, un patrón de su regla y de su ejercicio y el tema del examen que lo pregunta.
6. **Pasar los tests:** `go test ./...`. Validan la estructura, la cobertura de unidades y de puntos, que cada tema tenga al menos 2 preguntas, que las versiones sean equivalentes y que exista el audio de cada línea.

## Estado de la alineación

Revisado el 12 de octubre de 2026 contra las **páginas de detalle por nivel del Core Inventory** (el anexo con los puntos de lengua de cada nivel y sus ejemplos, más completo que los pósters), con TrackTest como segunda lista. Un punto cuenta como enseñado si está en una regla de gramática (`grammar_rule`) con su ejercicio; que una palabra salga de pasada en un diálogo no basta.

**Los cinco niveles están alineados.** Los puntos que faltaban se añadieron a las unidades y entran en el examen de su nivel. El detalle está en [a1.md](a1.md), [a2.md](a2.md), [b1.md](b1.md), [b2.md](b2.md) y [c1.md](c1.md).

**Reglas que se mantienen:**
- Si el curso enseña un punto **más tarde** de lo que pide el Core Inventory, se presenta en el nivel que toca (regla breve + ejercicio) y el tratamiento completo se queda donde está.
- Si lo enseña **antes**, el examen del nivel que lo pide lo vuelve a preguntar. Por eso hay temas de repaso: `a1_review` en A2, `a2_review` en B1, `past_habits` en B2, y `mixed_conditionals_wish`, `futures_review` y `past_modals` en C1.
- **`TestLevelCoverage`** (`backend/internal/content/coverage_test.go`) comprueba cada uno de estos puntos: que la unidad lo enseña con regla y ejercicio, en su nivel o antes, y que el examen del nivel tiene el tema y apunta a esa unidad. Si un cambio en una unidad o en un examen deja un hueco, el test falla.

## Temas en reglas y ejercicios

Las reglas y los ejercicios de las unidades usan los mismos temas (`tag`) que el `syllabus` del examen. Así, un fallo en una lección o en el examen cuenta como fallo en ese tema, y Repaso propone práctica de ese tema.

- **Reglas:** cada `grammar_rule` lleva `"tag"` en su `content`. Es obligatorio en todos los niveles.
- **Ejercicios:** el `"tag"` del `content` de un paso es el tema por defecto de sus ítems. Un ítem puede poner el suyo. En el descubrimiento (`discovery`), una pregunta de comprensión del diálogo puede llevar `"tag": ""` para quedar fuera.
- **Qué niveles tienen todos los ítems etiquetados:** los que ya tienen banco de práctica en `backend/data/practice/<nivel>/`. Por ahora, solo A1. Speaking y el speed quiz no cuentan.
- **`TestCourseTags`** comprueba que cada tema existe en el syllabus del nivel de la unidad o de uno anterior, y que en los niveles con banco de práctica no queda ningún ítem sin tema.

## Banco de práctica (Repaso → Gramática)

Un archivo por tema en `backend/data/practice/<nivel>/<topic_id>.json`: regla (`rule`, como un `grammar_rule`), temas del syllabus que practica (`tags`), unidades que lo enseñan (`units`, el tema se abre al empezar una) y conjuntos de ítems por formato (`sets`: `fill_blanks` con `bank` opcional, `multiple_choice`, `transformation`, `translation`, `word_order`).

- Cada ítem lleva un `id` estable `<topic_id>.<n>`: las estadísticas del alumno van por id, así que se puede corregir el texto sin perderlas, pero un id no se reutiliza para otra frase.
- Mínimo 40 ítems y 3 formatos por tema (`TestBundledPractice`).
- `"strict": true` en un conjunto hace que el apóstrofo cuente al corregir lo escrito. Normalmente se ignora («parents house» = «parents' house»), pero en el posesivo «'s» o en «yours» frente a «your's» es justo lo que se practica.
- **Frases propias.** Los libros (Grammar in Use…) sirven de referencia de temas y formatos; no se copia ningún ítem ni ejemplo.
- Cada ronda son 12 ítems: primero los fallados, luego los no vistos y después los vistos hace más tiempo, mezclando formatos. El tema se programa con SM-2 según la nota de la ronda.
