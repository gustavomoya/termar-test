# Diseño — Hoja de trabajo de campo de Termar Servicios

Abre `index.html` en un navegador. Sin paso de build, sin servidor, sin
dependencias. Redimensiona la ventana al ancho de una tableta (alrededor de
900–1100 px) para verlo como está pensado.

## Pantallas

| Archivo | Qué es |
|------|------------|
| `index.html` | **Hoy.** La jornada del técnico, con cada trabajo mostrando dónde vive actualmente su información. |
| `job.html` | **La hoja de trabajo.** Cronómetro, lista de comprobación específica de la instalación, piezas del stock de la furgoneta, fotos, firma. |
| `sync.html` | **Sincronización.** La cola de salida, el uso de almacenamiento local y un conflicto a la espera de una decisión humana. |

## Lee el dimensionado, es el diseño

Esto se usa con guantes puestos, en una sala de calderas, por alguien que no lleva
sus gafas de leer en el sitio y tiene una llave inglesa en la otra mano. Eso
determina la mayor parte de lo que aquí parece inusual:

- Cada objetivo interactivo mide al menos **48 px**. El control de apto/no
  apto/no aplica es deliberadamente enorme.
- El tipo base es un paso más grande que el resto de este sistema de diseño.
- Las acciones primarias van en una **barra inferior**, al alcance del pulgar, no
  en el encabezado.
- El estado se transmite mediante **color y texto juntos**, nunca solo color.
- Los tres estados de sincronización tienen tres tratamientos distintos, porque la
  distinción entre "guardado aquí" y "la oficina ya lo tiene" es el objetivo
  entero de la app.

No los encojas para que quepa más en pantalla. Que quepa más en pantalla no es un
objetivo de este producto.

## Aquí el lenguaje importa

Fíjate en lo que dice la interfaz: *"On this tablet only"*, *"At the office"*,
*"Saved on this tablet at 13:51. It will be sent automatically."*

Nunca dice "sincronizando", "pendiente" ni "modo offline". Al técnico no le
importa la cola — le importa si el trabajo de su tarde está a salvo. Mantén ese
registro.

## Archivos

- `design.css` — estilos de pantalla, incluidas las sobrescrituras de
  dimensionado para tableta.
- `design.js` — solo el comportamiento del mockup. Aquí no hay capa offline, ni
  almacenamiento, ni implementación de la cola. Construir eso es el ejercicio.
- `data.js` — datos de ejemplo que usa el mockup, ya incluidos aquí.
- `design-system/` — los estilos compartidos (`tokens.css`, `base.css`,
  `components.css`), incluidos dentro de esta carpeta para que sea
  autocontenida.

Esta carpeta es autónoma: abre `index.html` directamente en el navegador y se
renderiza con todos sus estilos, sin depender de nada externo.

## Lo que este diseño no especifica

Decisiones que se espera que tomes y registres:

- **Todo el mecanismo de sincronización.** Las pantallas muestran su salida, no su
  diseño.
- **Qué ocurre en el momento en que vuelve la señal.** Aquí nada muestra la
  transición.
- **Si la pantalla de conflicto es la única forma en que afloran los conflictos**,
  o si se interrumpe al técnico cuando aparece uno.
- **Qué hace realmente "Keep Berta's"** con el trabajo que Ángel ya registró. ¿Se
  descarta? ¿Se conserva para la oficina? ¿Es recuperable?
- **Qué pasa cuando el almacenamiento local se llena** en el segundo día de una
  ruta de montaña.
- **Cómo se captura la foto**, se comprime o se genera su miniatura.
- **La captura de la firma en sí** — el mockup muestra un panel firmado, no el acto
  de firmar.
- **Qué aspecto tiene una lista de comprobación parcialmente completada** cuando el
  técnico deja el sitio y vuelve al día siguiente.
- **El inicio de sesión, y qué le pasa bajo tierra.**
- **Estados de error.** No se dibuja ninguno. Una subida fallida, una hoja de
  trabajo rechazada y un trabajo que ya no existe necesitan uno cada uno.

Si una decisión no está escrita en ninguna parte, es tuya. Tómala
deliberadamente y cuéntanos qué elegiste.
