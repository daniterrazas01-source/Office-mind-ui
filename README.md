# Oficina · Monitoreo (pixel art)

La oficina de siempre (misma planta, mismos monitos, mismas viñetas), copiada de
`KALLEROS/oficina-cloud-monitoreo`, con dos reglas nuevas sobre quién aparece:

- **Supervisores (★)**: los eliges tú en `config/oficina.json`. Nunca se van. Si su sesión no reporta, se quedan dormidos esperando instrucciones (los de la tableta, en la Oficina Terrazas).
- **Visitantes**: cualquier otra sesión. Entran caminando cuando la usas, van al cuarto que toca según lo que hacen y pasan a Descanso cuando paran. A las **24 horas sin actividad** salen de la oficina. En sus últimas 3 horas el gafete dice “se va en X h”.

Solo muestra; no edita nada.

## Dónde verla

| | Enlace | Qué muestra |
|---|---|---|
| **En Claude** (Artifact) | https://claude.ai/artifact/KbxrcsXckzZSE5F65iZwCE | Todas tus sesiones de Claude Code (compu, tableta, teléfono, nube), leídas con tu propia cuenta. Privada: solo tú la abres. |
| **Página web / app** | https://daniterrazas01-source.github.io/Office-mind-ui/ | Lo que publican la laptop de Calleros y la tableta, igual que la oficina anterior. Se instala como app: en Chrome, menú ⋮ → *Instalar app* (iPhone: Compartir → *Agregar a inicio*). |
| **En la compu** | `iniciar_oficina.bat`, o `node collector/recolector.mjs --servir` y abrir `http://localhost:8765/oficina.html` | Las sesiones de Claude Code de esa computadora. |

Datos de ejemplo: agrega `?demo` (o `#demo`) al final de la dirección. Pruebas: `npm test`. Solo necesita Node 18 o más nuevo.

Para volver a publicar: la página web sale de la rama `gh-pages`; el Artifact se arma con `node tools/armar_artefacto.mjs`.

## Elegir supervisores

En el Artifact se eligen desde la página: toca un monito y pica **★ Hacer supervisor**. Queda guardado para todos tus aparatos.

En la página web y en la compu, cada supervisor de `config/oficina.json` se amarra a sus sesiones con una de estas llaves:

| Llave | Ejemplo | Agarra |
|---|---|---|
| `id` | `"calleros"` | la sesión que reporta exactamente ese id |
| `proyecto` | `"dragtrim"` | cualquier sesión abierta en una carpeta con ese nombre |
| `titulo` | `"dragtree"` | sesiones cuyo nombre o título contiene ese texto |

Un supervisor es un solo monito: si tiene varias sesiones, muestra la más reciente y las demás no salen como visitantes. `modelo`, `dispositivo` y `persona` dicen cómo se ve mientras no tiene sesión (`"dispositivo": "tableta-android"` lo deja en la Oficina Terrazas).

`venceHoras` (24) y `avisoHoras` (3) cambian el plazo de los visitantes.

## Monitos con tarea programada (◆)

Son permanentes, como los supervisores, pero trabajan solos: cada uno es una tarea programada de Claude que corre cuando le toca, deja su resumen en la base del Artifact y aquí se lee. Viven en un cuarto, salen a trabajar, y avisan con una viñeta cuando traen resumen nuevo. Al tocarlos sale el resumen y los anteriores. En el Artifact se leen de su base; en la página web, del archivo público `monitos.json` de la rama `datos`, que la misma tarea actualiza con `publicar.py`.

El primero es **Nitro**: noticias de arrancones, diario a las 7:23 a.m. (hora de la Ciudad de México). El segundo es **Pole**: noticias de Fórmula 1 (resultados, calendario, cambios en los equipos), diario a las 7:29 a.m. Los dos viven en la Oficina Terrazas y sus noticias se turnan en la pantalla.

Entre tarea y tarea no se quedan quietos: cada pocos minutos cambian de plan. A veces hacen algo por su cuenta (el campo `rutina` de su ficha: lista de `{ area, actividad }`), a veces se quedan en su lugar y a veces se van a Descanso, donde también se pasean. Eso es ambiente; la tarea de verdad es la programada.

### Horario de la oficina

La oficina abre de 6:00 a.m. a 7:30 p.m. (hora del aparato que la ve) y se cambia con el botón **Horario**. En el Artifact se guarda en la base (`oficina/horario`, `{ abre, cierra }`) y lo ven todos; en la página web se guarda en el aparato. **Abierta:** los jefes mandan a sus agentes y cada quien hace lo suyo. **Cerrada:** descansan, se pasean o acomodan cosas (`noche` de cada equipo en `EQUIPOS`), y la oficina se ve de noche: se oscurece y quedan prendidas lámparas de pared (`lamparas()`, salen del mapa: una cada ~5 casillas en cada pared de frente y una cada ~7 en las paredes de los lados de cuartos y pasillos altos; ninguna encima de la pantalla de noticias); se prende y apaga poco a poco. Cada aplique alumbra como luz de verdad (`alcanceLuz()` y `armarNoche()`): sale de la pared en abanico y se apaga poco a poco; solo llega a lo que "ve" sin muros en medio (rayos de la lámpara a cada casilla) y se queda en su cuarto (en las puertas solo se asoma); la cara de un muro solo se alumbra desde abajo y lo de arriba de los muros nunca. Además rebota y deja el cuarto en penumbra. Las luces se suman en un mapa de luz que topa, así dos lámparas juntas no hacen de día (`LUZ_MAX`). Lo que una sesión o una tarea programada hace de verdad se muestra siempre, a la hora que sea. «Ver cómo se ve de noche» la oscurece 20 segundos para probar.

### Cuarto de Agentes

Debajo de la Ampliación hay un pasillo más (el 5) y tres cuartos. El de la izquierda es el **Cuarto de Agentes** (`agentes`, piso `g`): solo entran los monitos con tarea o agentes (`rol: programado`); si una sesión dice ese cuarto, va a Descanso. Tiene cama con buró junto a la entrada, las dos lavadoras de memoria, tapete con mesita y pufs, y al fondo un sillón de espaldas que mira hacia la puerta (`cuartoDeAgentes()`). La cama es para quien va a dormir (actividad «Durmiendo»); si está ocupada, duerme en el sillón. Cada agente se va ahí **dos veces al día**, 25 minutos, a media mañana y a media tarde (a horas un poco distintas para cada uno, `descansoDeAgente()`); mientras tanto su jefe no lo llama, salvo que su sesión lo necesite de verdad. **Reglas de la noche** (fuera de horario): el periférico se apaga: la banda se detiene, no sale ningún envío solo (se quedan en su buzón; «▶ Ver el viaje» sí lo muestra si lo pides) y nadie viaja por él, salvo quien trabaja de verdad. Además, los agentes no hacen ninguna tarea; duermen, descansan en su cuarto o en Descanso, donde se pasean (`NOCHE_AGENTES`). Los jefes no le dan instrucciones a nadie. Solo trabaja el agente que la sesión de su jefe esté usando de verdad: primero su agente principal (`principal: true` en su ficha; hoy Nitro para DragTree y el Ayudante para Calleros) y los demás siguen descansando. Las tareas programadas de verdad (Nitro 7:23, Pole 7:29, mensajero 7:38) caen dentro del horario. **Lavadoras de memoria.** En el Cuarto de Agentes hay dos (`lavadora()`, diseño propio: cuerpo de metal, ventanita redonda, pantallita y tanque de burbujas). Quien se baña se mete: deja de verse, gira dentro de la ventanita con su color y el tanque burbujea; al salir trae brillitos y burbujas un rato (`limpioHasta`). Se usan en dos casos:
- **De ambiente:** los primeros 6 minutos de cada uno de los dos descansos del día («Lavándome la memoria», luego «¡Memoria limpia!» y «En mi descanso»).
- **De verdad:** el paso 4B «Baño de memoria» de la tarea de Nitro y de Pole. Cada ronda ya empieza sin contexto (sesión nueva); lo que se arrastra de un día a otro son sus notas de memoria, que leen al empezar. En el baño las recortan («Ya lo conté»: últimos 7 días, máximo 15; «Pendientes»: lo abierto, máximo 8; «Fuentes»: máximo 6; «Instrucciones del jefe» no se toca) y anotan en su ficha `bano: { cuando, quite, quedan }`, que sale en la ficha del monito («Último baño de memoria»). Mientras su aviso diga `area: "agentes"` y «Lavándome la memoria», el monito está en la lavadora.

Un encargo de verdad de su jefe le gana al baño de ambiente. El cuarto de en medio es el Taller (abajo) y el de la derecha sigue libre.

### Detalles de Descanso y de la Oficina Terrazas

**Descanso** tiene dos sillones frente a frente, con la mesita en medio (el rojo de arriba y uno azul de espaldas abajo): ocho lugares para que los que descansan se sienten y no anden por cualquier lado.

En la **Oficina Terrazas**, las dos lámparas de arriba de los lados son **sables de luz** (`prepararSables()`, `sables()`): el azul en la pared izquierda apuntando hacia arriba y el rojo en la derecha apuntando hacia abajo. De día solo se ve la empuñadura; de noche se prenden (la hoja brilla encima de la oscuridad, con un ligero parpadeo) y alumbran su lado del cuarto con su color, en lugar de esas lámparas.

### Las alas: la oficina es una T invertida

Del pasillo 4 para abajo la oficina se abre a los dos lados: el **Ala Oeste** y el **Ala Este** (botones «Ala Oeste» y «Ala Este» arriba; al abrir, la vista queda centrada en el cuerpo de en medio). En el código: `NUCLEO` (32 columnas del cuerpo de en medio), `ALA` (23 columnas del ala oeste), `ALA_ESTE` (el doble: el Ala Este tiene dos tramos iguales, cada uno con su pasillo), `COLS = ALA + NUCLEO + ALA_ESTE`; todo lo del cuerpo de en medio se sigue escribiendo con sus medidas de siempre y se dibuja recorrido `OX` pixeles (`mueble()`, `enBandas()`, `bloquear()` y `mudar()` lo hacen solos). Lo de las alas se escribe igual, con columnas negativas para el oeste.

Cada ala tiene su pasillo de en medio, de arriba a abajo, y tres pisos de cuartos a los dos lados (uno de afuera y uno de adentro): arriba **libres** (Oeste 1 y 2, Este 1 y 2), en medio **ampliación en obra** (Oeste 3 y 4, Este 3 y 4; la de adentro tiene puerta a la Ampliación de en medio) y abajo **libres** (Oeste 5, Este 5 y 6) más el **Taller 2**. El segundo tramo del Ala Este repite lo mismo: Este 7 y 8 libres, Este 9 y 10 en obra, Este 11 y 12 libres, con su pasillo y su terminal (Ala Este 2) (abajo adentro del oeste, junto al Cuarto de Agentes: banco de trabajo, herramientas y dos bases de carga libres para el próximo droide). Los pasillos 4 y 5 cruzan todo el ancho.

**Moverse a los lados:** arriba solo está el cuerpo de en medio, así que ahí la vista no se va a los lados (con zoom sí, pero solo dentro del cuerpo). Cuando se baja hasta las alas se suelta y aparecen flechas a los lados («◀ Ala Oeste», «Ala Este ▶», «◀ Centro», «Ala Este 2 ▶») que llevan suave a cada tramo. Al subir de nuevo, si la vista quedó de lado, regresa sola al centro cuando dejas de moverte (`vigilarLados()`).

**El periférico** sigue: en el pasillo 4 se abre en dos ramales anchos (con tapa de vidrio) hacia las alas, baja por el pasillo de en medio de cada ala hasta su terminal (Ala Oeste, Ala Este) y por el pasillo 5 un tramo une las dos alas por abajo. Hay estación en todos los cuartos de las alas, en los tres cuartos libres de en medio (D, E y F), en el Taller y en el espacio libre H (`src/tunel.js`: `ESTACIONES`, `TRONCALES`, `RAMALES`, `ANCHOS`; la oficina lo recorre con `desplazar(ALA)`). Los cuartos libres dicen su nombre en el letrero («OESTE 1 · LIBRE»); cuando se les dé uso, se les pone en `espacios` como a los demás.

### Estudio de Clipping (edición de video)

El segundo tramo del Ala Este es el **Estudio de Clipping**, para los agentes que harán clips de video (botón «Clipping» arriba). Piso oscuro de cuarto de edición (`q`) y un lounge con duela (`r`); `estudioClipping()`. Es **abierto**: del pasillo 4 hasta abajo del Centro de diseño no hay paredes (el pasillo de en medio, con el periférico bajo el piso de vidrio, queda adentro y los agentes se pasean por todo); está cerrado hacia el resto del pasillo 4 y **solo se entra por abajo**, desde el pasillo 5. Lo que iba en las paredes que se quitaron va en la pared de arriba (neón, foquitos, storyboard) o de pie (el storyboard de la aux 2). Las zonas siguen siendo las mismas pero sin letrero propio (es una sola área; `oculto: true` en `AREAS`); solo Diseño aux 3, que conserva su cuarto, tiene letrero. **Piso de startup:** duela de madera clara en todo el estudio y cada zona marcada en el piso (`alfombrasClipping()`, en la capa fija): tapete cálido en el lounge, losetas azules en aux 1, losetas grafito en el centro de diseño, tapete verde salvia en aux 2, concreto pulido en el set de grabación y losetas lila en aux 3. La pantalla grande va en la pared de arriba, arriba a la derecha del pasillo (el clip vertical y su línea de tiempo; se prende cuando alguien trabaja en el centro de diseño o en aux 1). Detalles: refri de vidrio con bebidas junto al café, cabina para llamadas, más plantas, y en el lounge dos sillones (uno rojo y uno verde agua) para que quepan todos.

**Quién vive ahí:** toda sesión o monito cuyo nombre, título o proyecto diga «clip» (clipping, clips…) vive en el estudio (`esDeClipping()`, `EN_ESTUDIO`): trabaja en sus zonas (escritorio → centro de diseño, biblioteca → aux 1, internet → aux 2, sala de juntas → aux 3) y cuando espera o descansa se va al lounge, no a Descanso ni al Cuarto de Agentes.
- **Centro de diseño** (`centro de diseno`, la oficina central; el cuarto de en medio de afuera): cuatro mesas de edición con doble monitor (la línea de tiempo corre cuando alguien está sentado, `mesaEdicion()`), la pantalla grande con el clip vertical y su línea de tiempo, el servidor de render, y un set de pantalla verde con aro de luz y celular en tripié.
- **Diseño aux 1, 2 y 3** (`diseno aux N`, oficinas auxiliares): mesas de edición y pizarrón con el storyboard; la aux 2 tiene además una tele con pufs para revisar cómo quedaron los clips.
- **Lounge de diseño** (`lounge de diseno`, el de arriba de adentro): para que descansen los agentes de clipping. Letrero de neón, foquitos, sillón, pufs, futbolito con su pelotita y barra de café.
- El cuarto de abajo de adentro (Este 11) sigue libre. En el área abierta hay solo **dos estaciones** del periférico: «Clipping (arriba)», en la pared del letrero, y «Clipping (entrada)», junto a la entrada de abajo (lounge y aux 1 van a la de arriba; centro de diseño y aux 2, a la de la entrada); Diseño aux 3 tiene la suya y la terminal del pasillo se llama Estudio de Clipping y lugares para los monitos, así que un agente o una sesión ya puede ir ahí diciendo el cuarto (también entiende «clipping», «edición» y «lounge»).

### Taller y el droide BB-8

Junto al Cuarto de Agentes está el **Taller** (`taller`, piso `w`, `tallerDeDroides()`): la casa de los droides. Tiene dos bases de carga con su gabinete (la de BB-8 y una libre, con «+», para el próximo droide), la **máquina de reparación** (dos postes, viga y un brazo que suelda), la **compactadora** (donde se tira la basura; su número es lo que hay en la papelera), una mesa de trabajo con un domo de repuesto y, en la pared, el tablero de herramientas y la pantallita con la batería.

**BB-8** es el droide rodante con la estética de BB-8: esfera blanca que rueda con paneles naranjas que giran, domo con franjas naranjas, ojo negro grande y uno chico, y dos antenas. Su gafete solo dice su nombre y el porcentaje de pila. No viene en los datos: vive en la página (`crearDroide()`, `droide()`, `dibujarDroide()`); su lógica pura está en `src/droide.js` (con pruebas). Qué hace:
- **Patrulla** pasillos y cuartos (menos el Cuarto de Agentes), pita (notitas ♪) y escanea; a veces revisa sus refacciones en la mesa.
- **Limpia** tres veces al día: 10:00 a.m., 3:00 p.m. y media hora antes de cerrar (`rondas()`); si nadie tenía la oficina abierta a esa hora, lo hace en cuanto alguien la abra. Va a la Sala de Noticias y al Almacén, aspira la basura (se ven montoncitos de papel cuando hay) y la lleva a la compactadora. Basura (`basura()`): avisos de la oficina con más de 4 días; resúmenes de los monitos con más de 7 días; envíos con más de 3 días. **Nunca tira** lo que menciona un proyecto protegido (de inicio Drag Tree, Calleros y Cerebro Delta; se cambian en su panel).
- Lo que tira va a la **papelera** (colección `papelera`, con los datos completos): se puede **rescatar** 7 días desde su panel (y ya no lo vuelve a tirar, `perdonados`); después la compactadora lo borra para siempre en su siguiente ronda.
- **Se recarga** en su base cuando baja de 25 % de batería; a la **1:00 p.m.** pasa 10 minutos en la máquina de reparación; **de noche hiberna** en su base (lente apagada, zZ).

Su panel (tocar a BB-8, su base, la compactadora o la máquina) muestra qué hace, lo que va a recoger, «Mandarlo a limpiar ahora», los proyectos protegidos y la papelera. Su configuración va en el documento `oficina/droide` (`protegidos`, `ultimaLimpieza`, `perdonados`, `bitacora`). En la página web (sin base) lo que recoge solo se esconde en ese aparato; se tira de verdad cuando la oficina se abre en Claude. `?depurar` deja ver por dentro desde la consola (`window.oficinaDepurar`).

### Modelo y esfuerzo en el gafete

Todo monito dice en el renglón de abajo de su gafete con qué trabaja, por ejemplo «Opus en alto ▮▮▮▯▯», y con esfuerzo alto o más trae un resplandor a sus pies. Vale para cualquiera que mande los campos `modelo` y `esfuerzo` (`low`, `medium`, `high`, `xhigh`, `max`): las sesiones con aviso (tableta, relevo, laptop con `collector/`), las del pase, las del Artifact cuando Claude da el dato, y los monitos programados, que lo escriben en su ficha. Si falta el esfuerzo, el gafete deja lo de antes (el aparato). A los agentes (Nitro, Pole…) no se les pone su horario en el gafete, para que quede chico: está en su ficha.

### Equipos: quién manda a quién

| Jefe (supervisor) | Su territorio | Su agente |
|---|---|---|
| **DragTree** (sesión de la tableta, en la nube) | Oficina Terrazas y Centro de Pensado | **Nitro** (y Pole) |
| **Calleros** (sesión de la computadora de Calleros) | Oficina Calleros y Cerebro Delta; se pasea por toda la oficina | El agente que vive en la Oficina Calleros (`monitos/ayudante-calleros`, nombre provisional) |

Un monito es del equipo del jefe de su `casa`. Los equipos están en `EQUIPOS`, en `oficina.html`. Pasan dos cosas distintas:

- **De verdad.** Cuando la sesión del jefe trabaja y usa un ayudante (subagente), ese trabajo lo hace su agente en la oficina. Si el aviso de la sesión trae `ayudante_actividad` y `ayudante_area` (lo que hace el ayudante), el agente hace eso mismo en el cuarto que toca y el jefe dice «Coordinando a …». Si solo se sabe que pidió ayuda («Pidiendo ayuda a un ayudante»), el agente se va con él: «Ayudando a DragTree». En la ficha del agente dice «encargo de …, de su sesión».
- **De ambiente.** Mientras la sesión del jefe espera, no se queda quieto: revisa lo suyo, se pasea, llama a su agente para darle instrucciones (salen de su nota de pendientes) o lo manda a un cuarto. Sale del reloj, no de la sesión; la ficha dice «por su cuenta».

Para que llegue el detalle del ayudante, el aviso de la sesión tiene que ser el de esta versión: `para-dragtrim/.claude/hooks/oficina_terrazas.py` (va en el repositorio `dragtrim`) y `relevo/oficina_aviso.py` (para el relevo de Cloudflare). El programa viejo de la laptop de Calleros no manda ese detalle: con él solo se ve cuando Calleros pide ayuda.

Lo que sí leen los monitos de verdad en su ronda es la nota de memoria `instrucciones-del-jefe` de cada uno: ahí van las reglas de su sección.

Para agregar otro, desde cualquier sesión de Claude Code en la nube:

1. Crear su ficha en la base del Artifact, colección `monitos`, con `ArtifactData`: `nombre`, `descripcion`, `casa` (cuarto donde vive: `terrazas`, `descanso`, `calleros`…), `aspecto` (`gorra_roja`, `lentes`, `audifonos`, `bufanda`, `moño`…), `modelo`, `esfuerzo` (`low`, `medium`, `high`, `xhigh` o `max`), `horario` (texto para leer), `frases` (lo que dice de vez en cuando), `estado: "listo"`.
2. Crear la tarea programada (`create_trigger`, sesión nueva en cada corrida) con un mensaje como el de Nitro: avisar `estado: "trabajando"` con su `area` y `actividad` (y en ese mismo aviso su `esfuerzo`, que sale de `echo $CLAUDE_EFFORT`), hacer el trabajo, guardar el resumen en `monitos/<id>/reportes/<AAAA-MM-DD>` (`titulo`, `fecha`, `intro`, `puntos[]` con `titulo`, `resumen`, `fuente`, `url`, `cierre`, `creado`) y terminar con `estado: "listo"`.

## Memoria, archivo y pantalla

Tres cuartos trabajan con lo que dejan los monitos programados. Los tres se pueden tocar:

- **Centro de Pensado (memoria).** La computadora guarda las notas de `monitos/<id>/memoria` (`pendientes`, `ya-contado`, `fuentes`). El monito las lee al empezar su tarea y las actualiza al terminar; así recuerda de un día para otro aunque cada corrida sea una sesión nueva.
- **Almacén (archivo).** Guarda los resúmenes de cada día (`monitos/<id>/reportes/<AAAA-MM-DD>`). En los anaqueles hay una caja por día guardado.
- **Sala de Noticias (pantalla).** Va por **secciones**: una por monito (campo `seccion` de su ficha: Arrancones, Fórmula 1) y una de la Oficina (avisos de la colección `avisos` y tareas). Cambia cada 5 minutos, una sección a la vez: tres rondas de las secciones de los monitos y una de la Oficina. Dentro de cada sección salen primero las noticias más nuevas, alternadas con sus cápsulas. Una noticia con más de 7 días (según su campo `cuando`) ya no sale en pantalla; queda en «Noticias anteriores» de su sección al tocar la pantalla. Al tocar la pantalla se abre la cartelera con **pestañas arriba**, una por sección (Nitro · Arrancones, Pole · Fórmula 1, Oficina), con cuántas noticias trae cada una y un punto en la que está en pantalla; se ve una a la vez y recuerda la última que elegiste en ese aparato. De vez en cuando, el monito de la sección presenta su noticia junto a la pantalla. Las reglas están en `src/pantalla.js`, con pruebas.

Para anunciar un cambio de la oficina en la pantalla, agrega un documento a `avisos` con `ArtifactData`.

La página web recibe todo esto con el **mensajero**: una segunda tarea programada (7:38 a.m.) que copia la base del Artifact a `monitos.json` en la rama `datos` (monitos, resúmenes, memoria, avisos y envíos).

## Sesión maestra

La sesión de Claude Code «Oficina virtual pixel art mejorada» es la sesión maestra de la oficina: ahí se deciden los horarios, las reglas de los agentes y los cambios. Lo que se acuerda queda en este README y en el código.

## El periférico y los envíos

El periférico es una sola línea que recorre la oficina de arriba a abajo: sale de **Internet**, cruza el pasillo 1, pasa por debajo de la **Sala de Juntas**, cruza el pasillo 2, baja entre la **Oficina Calleros** y el **Cerebro Delta**, sigue por el **túnel central** (su parte ancha, en el gran pasillo), cruza el pasillo 4, pasa por debajo del cuarto libre de en medio y termina en la **Ampliación**. Toda la línea es del mismo grueso que el túnel central (dos casillas), va hundida en el piso con tapa de vidrio y se camina por encima; debajo de los muros no se ve. Empieza y termina en una **terminal**: una boca de túnel en Internet y otra en la Ampliación. De él salen ramales delgados y cortos a Calleros, Cerebro Delta, **Oficina Terrazas**, **Centro de Pensado** (que también atiende al almacén) y **Sala de Noticias**. En cada uno hay una **estación** con buzón: siete en total.

Los supervisores y los monitos con tarea programada (los que nunca se van) también lo usan para moverse: cuando les queda más corto, caminan a la estación de su cuarto, viajan como cápsula y salen por la estación de destino.

Los pasillos 1 y 2 son de cuatro casillas de ancho. El mapa se escribió con dos y se le agregaron filas: lo de siempre sigue escrito con sus medidas de antes y se dibuja recorrido (`FILA()`, `PY()`, `enBandas()` en `oficina.html`); el periférico y sus estaciones ya usan las medidas de ahora.

La **Ampliación** es la zona grande de hasta abajo, en obra y sin cuartos.

Un **envío** es algo que un monito o una sesión le manda a otro cuarto. Se escribe en uno de dos lugares:

- En el campo `envios` del resumen del día de un monito (`monitos/<id>/reportes/<AAAA-MM-DD>`): una lista de `{ para, tipo, titulo, texto, url }`, más `enviado` con la hora. Salen del cuarto donde vive el monito. Así lo hace Nitro, y así llegan también a la página web, porque el mensajero ya copia los resúmenes.
- Como documento suelto en la colección `envios` de la base del Artifact, para cualquier sesión:

```json
{ "de": "terrazas", "para": "almacen", "tipo": "archivo", "autor": "Nitro",
  "titulo": "Resumen del 15 de noviembre", "texto": "…", "url": "", "creado": "2026-11-15T13:30:00Z" }
```

- `de` y `para`: `internet`, `calleros`, `cerebro delta`, `terrazas`, `centro de pensado` (o `almacen`, `memoria`), `noticias` y `ampliacion`. Si falta `de`, sale del cuarto donde vive el `autor`; los de tipo `noticias` de un resumen salen de Internet.
- `tipo`: `archivo`, `nota`, `noticias`, `aviso` o `dato`. Cambia el dibujo del paquete.
- Cuando el envío es nuevo (menos de 15 minutos), el paquete se ve viajar por el periférico. Al abrir la oficina también se repite una vez el viaje de lo que llegó en el último día y sigue sin leerse.
- La estación de destino levanta su banderita y prende el foquito verde hasta que se toca y se lee el buzón. Cada tarjeta trae «▶ Ver el viaje» para repetirlo. Al tocar el tronco sale la lista de todos los envíos.
- Un monito cuya actividad menciona el túnel o el buzón se para en la estación de su cuarto.

La oficina no inventa envíos: solo muestra los que están en la base. Nitro manda cuatro al terminar su ronda (resumen al almacén, titulares a la Sala de Noticias, lo más importante a la Oficina Calleros y, si lo hay, un dato al Cerebro Delta). Cualquier sesión de Claude con la herramienta `ArtifactData` puede mandar uno suelto escribiendo en `envios`. La geometría y las reglas están en `src/tunel.js`, con pruebas.

Pendiente: los envíos sueltos (colección `envios`) se ven en el Artifact, pero en la página web solo cuando el mensajero copie esa colección. `publicar.py` ya la sabe leer; falta agregarle a la tarea del mensajero el inciso `d) action "query", collection "envios", query {"order_by": {"field": "creado", "direction": "desc"}, "limit": 40}` y el inciso `e) action "list", collection "visitas"` (las sesiones con pase). Eso solo se puede pedir desde la conversación del mensajero.

## Sesiones con pase

El Artifact muestra solas las sesiones de Claude Code en la nube y las de Remote Control. Para cualquier otra, el botón **＋ Sesión** de la oficina da un texto (el pase) que se pega como mensaje en esa sesión. La sesión se registra escribiendo un documento en la colección `visitas` de la base del Artifact (`nombre`, `area`, `actividad`, `estado`, `modelo`, `equipo`, `sesion`, `actualizado`) y lo actualiza cuando cambia de tarea. La oficina la muestra como visitante: trabajando hasta media hora después de su último aviso, y se va a las 24 horas. Si dice de qué sesión es (`sesion`) y esa ya salía sola, no se duplica. **Paseando:** si se le pide a la sesión que vaya a un cuarto o se pasee, escribe `estado: "paseando"` con `area` y `actividad`; su monito va a ese cuarto y se queda ahí hasta 3 horas o hasta que la muevan otra vez (el paso 5 del pase lo explica). Sirve en sesiones que tengan la herramienta `ArtifactData`. Las reglas están en `src/sesiones.js` (`agenteDeVisita`, `conVisitas`), con pruebas.

## Relevo para la página web

`relevo/` trae armado, sin instalar, el servicio de Cloudflare que deja que la página web vea todas las sesiones. Los pasos están en `relevo/INSTALAR.md`.

## Cómo funciona

- **Rendimiento con zoom:** el lienzo tiene un tope de ~8 millones de pixeles (`MAX_PIXELES`, hasta 3 por pixel del mapa; el navegador agranda el resto sin suavizar) y cada cuadro solo dibuja la parte que se ve (`leerVista()`), con un margen. El pellizco se aplica una vez por cuadro. Antes, con zoom el lienzo llegaba a 31 millones de pixeles y en el teléfono se trababa. `?depurar` guarda cuánto tarda cada cuadro en `oficinaDepurar.TIEMPOS`.

- `oficina.html` es la oficina. Lee el estado cada 2 s en la laptop y cada 15 s desde el teléfono.
- `src/reglas.js` decide quién se ve: supervisores fijos y visitantes sin vencer. Son funciones puras con pruebas en `test/`.
- `src/sesiones.js` traduce la lista de sesiones de Claude Code a monitos; el Artifact la pide cada 30 s con el conector «Claude Code Remote» de quien lo abre. Solo lee.
- `collector/recolector.mjs` lee las sesiones de Claude Code de la computadora (`~/.claude/projects`) y arma `estado.json`: un monito por sesión, con su cuarto, lo que hace, su modelo y su última actividad.
- El **túnel subterráneo** une la Oficina Terrazas con el Centro de Pensado: quien va de un cuarto al otro baja por la escotilla y sale por la otra. Por el **túnel central** viajan los envíos (ver arriba).
- `para-dragtrim/` es el aviso de la tableta (hook de Claude Code). Ahora conserva las sesiones 24 h en vez de 30 min, para que la oficina decida cuándo se van.
- Desde el teléfono (GitHub Pages) la página lee los mismos archivos públicos que antes; se pueden cambiar con `"nube": { "estado": "…", "terrazas": "…" }` en la configuración.
