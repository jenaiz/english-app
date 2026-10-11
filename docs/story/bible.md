# Biblia de la historia: *Lucía in Bristol*

Todo el contexto del curso (diálogos, lecturas y frases de ejemplo de gramática, vocabulario y ejercicios) sale de esta historia. Avanza una unidad cada vez, de A1 a C1, como si fuera una novela por entregas. Si una lección necesita un viaje, una discusión, una comida, un recuerdo o un plan, lo viven estos personajes.

Capítulos por nivel: [a1.md](a1.md) · a2.md · b1.md · b2.md · c1.md (se escriben al empezar cada nivel).

## Premisa

**Lucía Martín**, diseñadora de 28 años de Valencia, consigue trabajo en **Harbour Studio**, un pequeño estudio de diseño digital de **Bristol**. Llega sin conocer a nadie, con un inglés de nivel A1, y se instala en una casa compartida en **Clifton Road**. A lo largo del curso su inglés crece con ella: empieza con frases de supervivencia y acaba presentando su propia empresa ante inversores.

La progresión lingüística del alumno y la de Lucía van juntas: en A1 ella también dice frases cortas, en C1 da discursos.

## Personajes y voces

Las voces son fijas. Un personaje suena siempre igual en todas las lecciones. El mapa técnico está en [`backend/data/voices.json`](../../backend/data/voices.json). Un diálogo **no puede** usar un `speaker` que no esté en ese mapa.

### Principales

| Personaje | Quién es | Cómo habla | Voz (Azure) |
|---|---|---|---|
| **Lucía** (F, 28) | Valenciana, diseñadora UX. Curiosa, organizada, algo tímida al principio y cada vez más segura. Echa de menos la luz y la comida de casa. | En A1–A2 usa frases sencillas y a veces pide que le repitan ("Sorry, can you repeat that?"). Va ganando registro. | `en-GB-LibbyNeural` |
| **Sam Turner** (M, 30) | Compañero de piso, de Bristol de toda la vida. Guitarrista en una banda y camarero a media jornada. Desordenado, gracioso, generoso. | Muy coloquial y británico ("mate", "cheers", "brilliant", "fancy a cuppa?"). Hace bromas. | `en-GB-RyanNeural` |
| **Priya Shah** (F, 31) | Compañera de piso, enfermera en el hospital de Bristol, nacida en Leicester (familia de origen indio). Práctica, directa, madruga, organiza la casa. | Clara y rápida, estándar británico. Pone las normas de la casa. | `en-GB-SoniaNeural` |
| **Daniel O'Brien** (M, 32) | Compañero de Lucía en Harbour Studio, desarrollador. Nacido en **Galway**, Irlanda. Tranquilo, amable, gran conversador. Interés romántico a partir de B1. | **Acento irlandés**. Expresiones irlandesas suaves ("grand", "what's the craic?", "sure look"). | **`en-IE-ConnorNeural`** |
| **Javi Martín** (M, 25) | Hermano pequeño de Lucía, en Valencia. Estudia para trabajar en turismo y practica inglés con ella por videollamada ("English only, OK?"). | Inglés de estudiante, con errores que Lucía corrige a veces. | `en-GB-ThomasNeural` |
| **Helen Carter** (F, 55) | Directora y fundadora de Harbour Studio. Exigente y justa. Se jubila en C1 (discurso de despedida). | Formal, preciso, a veces irónico. | `en-GB-AbbiNeural` |

### Secundarios recurrentes

| Personaje | Aparece en | Voz |
|---|---|---|
| **Mrs Green** (F, mayor), casera de Clifton Road | A1–B2 | `en-GB-HollieNeural` |
| **Maureen O'Brien** (F), madre de Daniel, en Galway | B1+ | `en-IE-EmilyNeural` |
| **Mark Reed** (M), cliente estadounidense | B2–C1 | `en-US-GuyNeural` |
| **Ollie** (M, 26), sobrino de Mrs Green, chef en un restaurante español; sustituye a Sam en Clifton Road | B1+ | `en-GB-OliverNeural` |
| **Grace Walker** (F), empresaria australiana con una cadena de albergues ecológicos; primera clienta e inversora de Green Door Design | C1 | `en-AU-NatashaNeural` |
| **Arjun** (M), médico del hospital de Priya y su prometido (no habla en los diálogos) | C1 | — |

### Roles genéricos (voces fijas por rol)

Para camareros, recepcionistas, etc. se usan siempre estos `speaker`. Ninguna voz se repite entre personajes. Nunca hay que inventar uno nuevo sin añadirlo antes a `voices.json`.

| speaker | Voz |
|---|---|
| Waiter | `en-GB-ElliotNeural` |
| Shop assistant | `en-GB-BellaNeural` |
| Receptionist | `en-GB-OliviaNeural` |
| Agent (aeropuerto, estación, oficina) | `en-GB-NoahNeural` |
| Quizmaster (presentador del concurso del pub) | `en-GB-EthanNeural` |
| Interviewer | `en-GB-AlfieNeural` |
| Narrator (lecturas `passage`) | `en-GB-OllieMultilingualNeural` |

## Lugares

- **Clifton Road, nº 14**: la casa compartida. Cocina pequeña, jardín con tomateras de Priya, el cuarto de Sam está lleno de guitarras.
- **Harbour Studio**: oficina junto al puerto (Harbourside), ventanales y una cafetera que siempre falla.
- **The Old Duke**: pub donde toca Sam los viernes.
- **Bristol**: el puente colgante de Clifton, el puerto, Cabot Circus (compras), el parque Brandon Hill, la lluvia.
- Fuera: **Valencia** (familia), **Londres** (A2), **Dublín y Galway** (B1), **Edimburgo** (B2, conferencia), **Nueva York** (C1, inversores).

## Arco por nivel

| Nivel | Época | Arco | Gramática que lo permite |
|---|---|---|---|
| **A1** | Septiembre, año 1 | Llegada, presentaciones, la casa, la comida, rutinas, aficiones, primer fin de semana. | to be, present simple, there is, can, present continuous, primer contacto con el pasado. |
| **A2** | Otoño–Navidad, año 1 | Se asienta: compras, recuerdos de Valencia, comparaciones Bristol/Valencia, viaje a Londres, planes para Navidad, vuelta a casa. | past simple, comparativos, going to, present perfect (intro), will. |
| **B1** | Primavera–verano, año 2 | Viaje a Irlanda con Daniel (aeropuerto, hotel en Dublín, familia en Galway), queja en el hotel, entrevista para un puesto senior. Lucía y Daniel se acercan. | present perfect vs past, condicionales 1/2, pasiva, relativos, phrasal verbs. |
| **B2** | Año 2–3 | Conflictos: nuevo cliente difícil (Mark), tensiones en el piso (Sam quiere traer a su banda a ensayar, Priya se plantea mudarse), conferencia en Edimburgo, debates. La relación con Daniel se formaliza. | condicionales mixtos, estilo indirecto, modales de deducción, conectores de contraste. |
| **C1** | Año 3 | Helen se jubila (discurso de despedida con inversión enfática), Lucía funda su propio estudio, presenta ante inversores en Nueva York y mira atrás a su primer día en Bristol. | inversión, cleft sentences, participle clauses, hedging, registro formal. |

## Reglas para escribir capítulos

1. **Gramática controlada**: un capítulo solo usa la gramática de su unidad y de las anteriores. En A1 nada de pasado hasta la unidad 12, y nada de condicionales hasta B1.
2. **Vocabulario controlado**: las palabras nuevas de la unidad aparecen en el diálogo (son las que luego van al `vocabulary_table`). El resto debería estar en el nivel o por debajo (English Vocabulary Profile).
3. **Diálogos cortos**: A1 6–10 líneas, A2 8–12, B1 10–14, B2/C1 hasta 16 o una lectura (`passage`) de 120–250 palabras.
4. **Continuidad**: cada capítulo empieza donde acabó el anterior o indica el salto ("Two weeks later…"). Los hechos ya contados no se contradicen. Hay que actualizar la línea temporal de abajo al escribir.
5. **Ejemplos**: los ejemplos de gramática, las frases de ejercicios y los ejemplos de vocabulario usan estos personajes y lugares siempre que se pueda ("Sam is a musician", "Priya gets up at six").
6. **Voces**: solo speakers del mapa. Lucía y Javi hablan en inglés entre ellos porque Javi practica para su trabajo ("English only!").
7. **Tono**: amable y con humor ligero. Nada de contenido sensible. Conflictos realistas (platos sin fregar, retrasos, malentendidos) que se resuelven.

## Línea temporal

*(Se completa al escribir cada nivel.)*

- **A1 u1** (sábado 6 sept., año 1): Lucía llega a Bristol en autobús desde el aeropuerto y conoce a Mrs Green en la puerta de Clifton Road.
- **A1 u2**: conoce a Sam y Priya en la cocina.
- **A1 u3**: deshace la maleta; Sam le presta cosas.
- **A1 u4** (lunes 8 sept.): primer día en Harbour Studio; conoce a Helen y Daniel.
- **A1 u5**: cena en The Old Duke con Sam y Priya.
- **A1 u6**: videollamada con Javi: su semana.
- **A1 u7**: Priya explica su horario de turnos.
- **A1 u8**: Lucía busca el supermercado; Daniel le da indicaciones.
- **A1 u9**: concierto de Sam en The Old Duke.
- **A1 u10**: partido de fútbol informal en Brandon Hill con los del estudio.
- **A1 u11**: llueve; Lucía llama a Javi y le cuenta qué está haciendo cada uno.
- **A1 u12** (lunes 22 sept.): en la oficina cuenta su fin de semana a Daniel; Javi pregunta por "el irlandés".
- **A2 u1** (martes, principios de oct.): mañana caótica; las llaves de Lucía aparecen en la nevera. Esa semana entra a las ocho por un proyecto para un cliente nuevo.
- **A2 u2** (sábado): compra con Priya un abrigo de invierno en Cabot Circus, rebajado a 40 libras.
- **A2 u3** (domingo): enseña a Sam fotos de su infancia. Sam creció en Bristol, su padre le regaló una guitarra a los 8 años y no fue a la universidad. Lucía estudió diseño en Valencia y trabajó 3 años en Madrid.
- **A2 u4** (lunes, finales de oct.): el viento rompe el paraguas negro de Sam y a Lucía se le cae el café encima; llega tarde a la oficina.
- **A2 u5** (domingo): Javi le pide que compare Bristol y Valencia. Insiste con Daniel ("just a friend").
- **A2 u6** (jueves): noche de concurso en The Old Duke. El equipo "The Clifton Brains" (Lucía, Sam, Priya y Daniel) gana.
- **A2 u7** (noviembre): planean un fin de semana en Londres con Priya y Daniel; se alojarán en el piso de Ciarán, un amigo de Daniel, en Camden. Sam no va porque toca en una boda.
- **A2 u8** (sábado): en la estación de Temple Meads descubren que los billetes son para el sábado siguiente; los cambian por 10 libras cada uno.
- **A2 u9**: en Londres. Es la primera vez de Lucía. La tía de Priya vive en Wembley y Daniel subió al London Eye el año pasado con su madre.
- **A2 u10** (diciembre): Lucía está resfriada; Priya le da consejos y Sam le prepara la sopa de pollo de su abuela.
- **A2 u11** (viernes): fiesta de Navidad de Harbour Studio. Helen da la bienvenida a Lucía y Daniel la invita a cenar después de Navidad. Ella acepta.
- **A2 u12** (20 dic.): Lucía hace la maleta para volver a Valencia. Sam y Priya le regalan un paraguas rojo.
- **B1 u1** (enero, año 2): primera cita de Lucía y Daniel en un restaurante irlandés. Daniel era muy tímido de niño; Lucía quería ser piloto, pero se mareaba en los aviones.
- **B1 u2** (febrero): Priya prepara el examen para ser enfermera jefe y Sam ensaya para un concierto al que vendrá un productor. Lucía y Daniel han salido tres veces.
- **B1 u3** (marzo): Helen entrevista a Lucía para el puesto de diseñadora sénior. Lucía lo consigue.
- **B1 u4** (abril, Semana Santa): vuelo Bristol–Dublín. Llegan justo a tiempo, pagan 30 £ por exceso de equipaje y el vuelo se retrasa 30 minutos.
- **B1 u5**: hotel Liffey House (Dublín), habitación 214. Hay ruido en la calle y la ducha no funciona; les descuentan un 10% y les invitan al desayuno.
- **B1 u6**: cena en Galway con Maureen; al día siguiente van a los acantilados de Moher.
- **B1 u7** (mayo): el productor ofrece a la banda de Sam grabar un disco en Londres durante seis meses. Sam acepta.
- **B1 u8** (junio): Mrs Green pone las normas para el nuevo compañero: nada de fumar ni de mascotas, fianza de un mes y nada de música después de las once.
- **B1 u9**: Ollie, sobrino de Mrs Green y chef de Manchester, visita la casa y se queda con la habitación de Sam.
- **B1 u10** (julio): a Helen le encanta la web del museo y pide a Lucía que dé una charla en un congreso en Edimburgo en octubre, con Daniel como apoyo técnico. Javi aprueba el examen y consigue trabajo en un hotel de Dublín desde septiembre.
- **B1 u11**: concierto de despedida de Sam en The Old Duke. Se va la luz y Sam toca con su guitarra acústica.
- **B1 u12** (agosto): Sam se muda a Londres y Ollie llega a la casa. Lucía y Daniel vuelan a Valencia el día 15 para que Daniel conozca a sus padres.
- **B2 u1** (octubre, año 2): tren nocturno a Edimburgo. Lucía da una charla en el European Design Forum ante 400 diseñadores y Daniel se encarga de la pantalla.
- **B2 u2**: después de la charla, Mark Reed (dueño de Reed Hotels, 42 hoteles) quiere que Harbour Studio rediseñe sus webs.
- **B2 u3**: Daniel pierde el portátil con la demo. Aparece debajo de una silla de la sala principal y alguien del centro de congresos lo lleva al hotel.
- **B2 u4** (noviembre): primera reunión con Mark en Bristol. Prefiere más fotos y texto; Lucía y Helen defienden el diseño sencillo (2 s de carga frente a 10). Acuerdan preparar dos versiones.
- **B2 u5**: Mark admite que la versión sencilla es mejor, insiste en poner vídeos y acepta probar con clientes reales. Invita al equipo al lanzamiento en Nueva York.
- **B2 u6** (diciembre): el día del lanzamiento se publica la versión antigua. Helen lo detecta, lo arreglan a tiempo y Mark no se entera.
- **B2 u7** (enero, año 3): Ollie cocina de madrugada y deja la cocina hecha un desastre. Lo hablan y promete no hacer ruido y limpiar.
- **B2 u8** (febrero): se estropea la caldera en la semana más fría. Mrs Green la manda arreglar el jueves y también va a pintar la cocina.
- **B2 u9** (marzo): sale el disco de The Clifton Cats, que recibe muy buenas críticas. Se espera que toquen en Madrid en junio.
- **B2 u10** (abril): en el puerto, Daniel pide a Lucía que se vaya a vivir con él (su contrato de alquiler acaba en junio). Ella acepta.
- **B2 u11** (mayo): Javi visita Bristol por primera vez. En el puente colgante, Lucía le cuenta que piensa montar su propio estudio.
- **B2 u12** (junio): Helen anuncia que se jubila a final de año. Mark Reed quiere comprar el estudio, pero Helen prefiere que Lucía se quede con parte de los clientes en su propio estudio.
- **C1 u1** (julio, año 3): Lucía y Daniel se mudan a un piso junto al puerto. Ella duda si montar su estudio y Daniel se ofrece como socio.
- **C1 u2** (diciembre): despedida de Helen con discurso. Rechazó la oferta de Mark y se jubila para navegar por Grecia.
- **C1 u3** (enero, año 4): alquilan una oficina encima de la librería de Park Street, la calle donde Lucía se perdió en A1. Nace Green Door Design, en honor a la puerta de Mrs Green.
- **C1 u4** (febrero): primera clienta, Grace Walker (albergues ecológicos). Acuerdan una prueba piloto con un albergue.
- **C1 u5** (marzo): el piloto sale bien y buscan a su primer empleado. Helen les manda currículos.
- **C1 u6** (abril): Grace invierte a cambio de un puesto en el consejo y de un crecimiento del 30%. Mark les invita a presentar en Nueva York.
- **C1 u7** (mayo): en Nueva York, la noche antes de la presentación, pasan las diapositivas a registro formal.
- **C1 u8**: presentación en Reed Hotels. Mark invierte y les encarga sus hoteles europeos, con la condición de que Grace siga en el proyecto.
- **C1 u9**: de vuelta, Lucía se lo cuenta a Javi. La oficina de Madrid abrirá en octubre.
- **C1 u10** (junio): fiesta de compromiso de Priya y Arjun en Clifton Road. Sam vuelve de la gira, Ollie cocina y Lucía será dama de honor. Daniel: "Not yet."
- **C1 u11** (agosto): entrevista de radio a Lucía sobre Green Door Design.
- **C1 u12** (octubre, año 4): Green Door Design gana el Bristol Business Award. En su discurso, Lucía repasa su llegada a Bristol. Después, Daniel le pide matrimonio y ella acepta.
