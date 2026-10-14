# Fluently

App para aprender inglés (hispanohablantes). Backend Go en `backend/`, frontend React + Vite en `frontend/`, contenido en JSON en `backend/data/`. Documentación del contenido en `docs/` (niveles y exámenes en `docs/levels/README.md`).

## Contenido

### Reglas de gramática: unidad y práctica van sincronizadas
Cada punto de gramática tiene dos textos:
- la regla de la lección (`grammar_rule` en `backend/data/levels/<nivel>/*.json`);
- la regla ampliada del tema de práctica (`rule` en `backend/data/practice/<nivel>/<tema>.json`), que enlaza a las unidades de su campo `units`.

La de práctica amplía la de la unidad: usa los mismos términos y ejemplos base y solo añade. **Al corregir una, revisa la otra** para que no se desfasen ni se contradigan. Se relacionan por el `tag` de la regla de la unidad, que está en los `tags` del tema, y por `units`.

### Español e inglés en las explicaciones
Las explicaciones (reglas, `explanation` de los ítems) están en español y no mezclan idiomas en el texto corrido. Todo lo que está en inglés va marcado:
- frases y ejemplos en inglés entre «…»: «I'm from Spain», «Is he a student? — Yes, he is»;
- palabras o formas sueltas que se están explicando, en **negrita**: **at**, **some**, **isn't**.

`RichText` (`frontend/src/components/RichText.tsx`) muestra «…» como ejemplo destacado y `**…**` en negrita.

### Frases propias
Los libros de `assets/` (Grammar in Use y otros, en `.gitignore`) son solo referencia de temas y formatos. No se copia ningún ejemplo ni ejercicio.

## Trabajo
- Al terminar cada parte: revisarla, reiniciar el backend de desarrollo (`docker compose -f docker-compose.dev.yml restart backend`; el frontend recarga solo) y hacer commit si todo funciona.
- Tests: `cd backend && go test ./...`; frontend: `cd frontend && npx tsc -b` (o `npm run build`).
