# Niveles y exámenes de nivel

Cada nivel del MCER tiene sus unidades (`backend/data/levels/<nivel>/`) y un **examen de nivel** aparte (`backend/data/exams/<nivel>.json`). El examen certifica que se tiene el nivel. No es una lección más:

- Va cronometrado. El reloj sigue corriendo aunque se cierre la página, y al acabar el tiempo se entrega lo que haya.
- Durante el examen no se ve si una respuesta es correcta. Corrige el servidor, y la hoja que llega al navegador no lleva respuestas ni transcripciones.
- Tiene cuatro partes: gramática, vocabulario, reading y listening. Cada una pesa lo mismo y tiene una nota mínima.
- Cada parte tiene dos versiones equivalentes (mismos temas, mismo número de preguntas). Al repetir el examen se da la otra.
- Si se suspende, hay que esperar `retake_hours` para repetirlo.
- Aprobarlo da un certificado imprimible. Es de la app, alineado con el MCER, y lo dice claramente: no es un título oficial.
- Aprobarlo también desbloquea una actividad del Club (milestone `exam:<id>`).

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
