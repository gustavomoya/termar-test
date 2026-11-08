# Termar Servicios — Documento de Requisitos

## 1. Resumen

Se desarrollará una aplicación web **offline-first** para las tabletas Android utilizadas por los técnicos de campo de Termar Servicios.

La aplicación permitirá a los técnicos consultar sus trabajos y completar las hojas de servicio incluso cuando no dispongan de conexión a Internet.

Toda la información se guardará primero en la tableta y se enviará automáticamente al sistema de la oficina cuando se recupere la conexión.

Las hojas de trabajo incluirán listas de comprobación, tiempo empleado, piezas utilizadas, fotografías y firma del cliente.

La aplicación también deberá detectar y permitir resolver conflictos cuando dos técnicos hayan completado el mismo trabajo, evitando que la información de uno sobrescriba silenciosamente la del otro.

---

## 2. Requisitos Funcionales

### 2.1 Pantalla Hoy (`/`)

Esta pantalla mostrará al técnico los trabajos programados para el día y permitirá consultar su estado.

| ID | Requisito                                                                                                                                                                                                                                     |
|---|-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| **RF-01** | Mostrar los trabajos del día ordenados según su horario programado (`scheduledAt`). Cada trabajo incluirá la hora, ubicación, tipo de instalación y estado de recepción por parte de la oficina.                                              |
| **RF-02** | Mostrar en la cabecera el nombre del técnico, la identificación de su furgoneta, la fecha y un indicador de conexión a Internet. El indicador deberá permanecer siempre visible.                                                              |
| **RF-03** | Cuando existan trabajos que todavía no hayan sido recibidos por la oficina, mostrar un aviso con el número de elementos guardados en la tableta y el mensaje: "N items are saved on this tablet and will be sent as soon as you have signal". |
| **RF-04** | Mostrar un resumen con el número de trabajos recibidos por la oficina, los que están guardados únicamente en la tableta y los que necesitan una decisión del técnico.                                                                         |
| **RF-05** | Permitir abrir la hoja de trabajo al seleccionar un trabajo y acceder a la pantalla de sincronización desde el aviso o el botón correspondiente.                                                                                              |
| **RF-06** | Mostrar un botón principal "Start next job — HH:MM Sitio" que permita abrir el siguiente trabajo programado que todavía no haya sido recibido por la oficina.                                                                                 |
| **RF-07** | Actualizar automáticamente los indicadores y contadores cuando cambie el estado de recepción de los trabajos.                                                                                                                                 |

### 2.2 Hoja de Trabajo (`/jobs/[id]`)

Esta pantalla permitirá registrar toda la información correspondiente a un servicio.

#### Tiempo en sitio

| ID | Requisito |
|---|---|
| **RF-08** | Incluir un cronómetro que permita iniciar, detener y reanudar el registro del tiempo empleado en el trabajo. |
| **RF-09** | Conservar el estado y el tiempo registrado aunque se recargue, cierre o reinicie la aplicación. |
| **RF-10** | Mostrar el tiempo transcurrido en formato de horas y minutos (`Hh Mm`) y conservar las marcas de tiempo de inicio y finalización utilizando la hora local del dispositivo. |
| **RF-11** | Incluir una opción "Restart timer" para reiniciar el cronómetro. |

#### Lista de comprobación (Checklist)

| ID | Requisito |
|---|---|
| **RF-12** | Cargar automáticamente la lista de comprobación correspondiente al tipo de instalación: 14 elementos para calderas de gas (`gas_boiler`) y 9 para sistemas de refrigeración (`chiller`). |
| **RF-13** | Permitir seleccionar uno de tres estados para cada comprobación: Apto, No apto o No aplica. Los controles deberán ser suficientemente grandes para facilitar su uso en una tableta. |
| **RF-14** | Para las comprobaciones que requieran mediciones (`measure`), mostrar un campo numérico con su unidad y validar que el valor introducido esté dentro de los límites permitidos. |
| **RF-15** | Exigir una observación cuando una comprobación se marque como No apto. La observación se introducirá mediante un campo de texto asociado a esa comprobación. |
| **RF-16** | Mostrar el progreso de la lista mediante un indicador del tipo "X of Y answered", donde X representa las comprobaciones respondidas e Y el total. |
| **RF-17** | Guardar automáticamente los cambios de la lista en IndexedDB, aplicando un pequeño retraso para agrupar cambios consecutivos y evitar escrituras innecesarias. |
| **RF-18** | Cuando el técnico vuelva a abrir un trabajo parcialmente completado, restaurar exactamente las respuestas, observaciones y mediciones que había registrado. |

#### Piezas
| ID | Requisito |
|---|---|
| **RF-19** | Permitir buscar y consultar las piezas disponibles en el inventario de la furgoneta, utilizando la información proporcionada por `/api/van-stock`. |
| **RF-20** | Permitir añadir y quitar piezas de la hoja de trabajo, indicando la cantidad utilizada. |
| **RF-21** | Comprobar que existe suficiente cantidad disponible antes de registrar el consumo y actualizar el inventario local. |
| **RF-22** | Guardar las piezas utilizadas y sus cantidades. |


#### Fotos
| ID         | Requisito                                                                                                                                                                                                                  |
|------------|----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| **RF-23**  | Permitir subir fotografías.                                                                                                                                                                                                |
| **RF-24**  | Comprimir las fotografías antes de almacenarlas y enviarlas, limitando su dimensión máxima. Si es necesario, aplicar compresión adicional para respetar el límite de tamaño de los envíos.                                 | 
| **RF-25**  | Guardar las fotografías originales comprimidas en IndexedDB, utilizando el almacén `photos`.                                                                                                                               |
| **RF-26**  | Mostrar las fotografías en una galería con un indicador que permita saber si están guardadas únicamente en la tableta o si ya fueron enviadas.                                                                             |
| **RF-27**  | Permitir eliminar fotografías, eliminando tanto el archivo almacenado como sus datos asociados.                                                                                                                            | 
| **RF-28** | Enviar las fotografías comprimidas en formato Base64 dentro de la petición `PUT /api/jobs/:id/worksheet`. Debido al límite de 10 MB del backend del ejercicio, se permitirá enviar un máximo de 4 fotografías por trabajo. |

#### Firma
| ID | Requisito |
|---|---|
| **RF-29** | Incluir un área de firma mediante un elemento Canvas que permita al cliente firmar directamente sobre la pantalla de la tableta. |
| **RF-30** | Permitir borrar la firma y realizarla nuevamente antes de confirmarla. |
| **RF-31** | Guardar la firma en formato PNG (dataURL), junto con el nombre del cliente y la fecha y hora en que se realizó. |
| **RF-32** | Después de registrar una firma, mostrar la opción "Sign again" para permitir realizarla nuevamente. |

#### Acciones de job
| ID | Requisito |
|---|---|
| **RF-33** | Permitir regresar a la pantalla Hoy mediante la opción "Back", sin perder la información registrada en la hoja de trabajo. |
| **RF-34** | Al seleccionar "Finish job", validar que todos los campos obligatorios estén completos. Si la validación es correcta, marcar el trabajo como completado localmente y añadir la información necesaria a la cola de sincronización. |


### 2.3 Pantalla Sincronización (`/sync`)
Esta pantalla permitirá consultar los datos que todavía no han llegado a la oficina, conocer su estado y gestionar los envíos.

| ID | Requisito |
|---|---|
| **RF-35** | Mostrar la cola de envíos agrupada por trabajo, el número de intentos y su estado actual. |
| **RF-36** | Mostrar un resumen del número de elementos que todavía no han sido enviados y el tamaño total que ocupan. |
| **RF-37** | Mostrar el espacio de almacenamiento utilizado y disponible en la tableta. |
| **RF-38** | Incluir un botón "Try sending now" que permita iniciar manualmente el envío de información. Solo estará habilitado cuando exista conexión. |
| **RF-39** | Reanudar automáticamente los envíos cuando se recupere la conexión a Internet. |
| **RF-40** | Mostrar un mensaje tranquilizador que explique que la información guardada en la tableta no se pierde aunque el dispositivo se apague. Por ejemplo: "Nothing here is lost if the tablet is switched off...". |

### 2.4 Motor de sincronización y funcionamiento sin conexión

La aplicación deberá poder utilizarse sin conexión y conservar todos los cambios realizados por el técnico hasta que puedan enviarse al backend.

| ID | Requisito |
|---|---|
| **RF-41** | Incluir un control "Simulate network" que permita activar o desactivar la conexión simulada durante las demostraciones de la aplicación. |
| **RF-42** | Permitir consultar y completar los trabajos sin conexión a Internet, utilizando los datos y recursos previamente almacenados en la tableta. |
| **RF-43** | Mantener una cola de salida (`outbox`) persistente en IndexedDB para almacenar las operaciones que todavía deben enviarse al backend. |
| **RF-44** | Procesar los elementos de la cola de forma secuencial y sin bloquear la interfaz de usuario. |
| **RF-45** | Reintentar automáticamente los envíos que fallen por problemas temporales de comunicación, utilizando un intervalo progresivo (backoff exponencial) entre 1 y 60 segundos y un número máximo de intentos. |
| **RF-46** | Iniciar el proceso de sincronización al arrancar la aplicación, cuando se recupere la conexión, cuando el usuario solicite un envío manual y mediante un intervalo periódico. |
| **RF-47** | Cuando el backend confirme correctamente el envío, actualizar el estado del trabajo a `synced` y reflejar que la información ha sido recibida por la oficina. |
| **RF-48** | Detectar posibles cambios en la conexión utilizando `navigator.onLine` y realizar una comprobación periódica de disponibilidad del servidor (*heartbeat*) cada 30 segundos. La confirmación de que el backend está accesible deberá basarse en una petición real, no únicamente en el estado de red del dispositivo. |

### 2.5 Gestión de conflictos
La aplicación deberá detectar situaciones en las que dos técnicos hayan completado el mismo trabajo y permitir resolverlas sin perder información

| ID | Requisito |
|---|---|
| **RF-49** | Detectar conflictos cuando el backend devuelva una respuesta HTTP 409 o indique que el trabajo tiene el estado `conflict`. |
| **RF-50** | Mostrar una comparación de las dos hojas de trabajo, permitiendo revisar el tiempo empleado, las comprobaciones, los fallos detectados, las piezas utilizadas, las fotografías y la firma. |
| **RF-51** | Mostrar únicamente la información disponible de la hoja del otro técnico. Cuando un dato no esté disponible en la tableta, mostrar `—` e indicar: "The other worksheet was not downloaded to this tablet". |
| **RF-52** | Ofrecer tres opciones para resolver el conflicto: "Keep mine" para conservar la hoja del técnico actual; "Keep [other]'s" para conservar la hoja del otro técnico; y "Send both and let the office decide" para conservar ambas versiones y solicitar que la oficina tome la decisión final. |
| **RF-53** | Guardar una copia recuperable de la hoja que no se seleccione en el almacén local `archive`. Nunca se eliminará silenciosamente una hoja descartada. El almacén existe y se escribe en él; la pantalla de recuperación queda fuera de esta entrega. |
| **RF-54** | Actualizar el estado del trabajo y la información de sincronización después de resolver el conflicto. |
| **RF-55** | Mostrar los conflictos en la pantalla Hoy mediante un indicador o aviso y permitir resolverlos desde la pantalla de sincronización, sin interrumpir al técnico mientras realiza un trabajo. |

### 2.6  Gestión de errores

La aplicación deberá informar al técnico cuando se produzcan problemas durante el envío, la validación o el almacenamiento de la información.

| ID | Requisito                                                                                                                                                                                                                                                                    |
|---|------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| **RF-56** | Cuando falle el envío, marcarlo como `failed`, mostrar el motivo del error y ofrecer un botón "Retry". Los datos deberán permanecer guardados en la tableta.                                                                                                                 |
| **RF-57** | Cuando el servidor rechace una hoja de trabajo por un error de validación o de procesamiento, mostrar un mensaje comprensible y permitir corregir los datos y volver a intentarlo. Los errores temporales del servidor deberán tratarse mediante el mecanismo de reintentos. |
| **RF-58** | Si el backend devuelve un error HTTP 404 porque el trabajo ya no existe, mostrar el mensaje "This job no longer exists at the office" y conservar toda la información registrada localmente.                                                                                 |
| **RF-59** | Cuando el almacenamiento de la tableta esté lleno o no disponga de espacio suficiente, mostrar una advertencia clara y proteger la hoja de trabajo en curso para evitar la pérdida de información.                                                                           |

### 2.7 Persistencia y recuperación de información

La aplicación deberá garantizar que la información registrada por el técnico permanezca disponible incluso si la aplicación o la tableta se cierran inesperadamente.

| ID | Requisito |
|---|---|
| **RF-60** | Conservar los datos después de cerrar la aplicación, agotar la batería, forzar el cierre desde el sistema operativo o reiniciar la tableta. |
| **RF-61** | Guardar automáticamente los cambios de las hojas de trabajo en IndexedDB, aplicando un pequeño retraso para agrupar modificaciones consecutivas. |
| **RF-62** | Guardar el estado del cronómetro cada 10 segundos y también cuando la aplicación cambie de visibilidad (`visibilitychange`) o se cierre (`beforeunload`), cuando el navegador permita ejecutar estos eventos. |
| **RF-63** | Mantener la estructura de la base de datos local versionada y aplicar migraciones cuando se realicen cambios en su esquema. |

### 2.8 Aplicación web progresiva (PWA)

La aplicación deberá poder instalarse en las tabletas Android y ofrecer sus funcionalidades principales incluso cuando no haya conexión a Internet.

| ID | Requisito |
|---|---|
| **RF-64** | Implementar un Service Worker mediante Serwist para almacenar en caché los recursos principales de la aplicación (*app-shell*). |
| **RF-65** | Incluir el archivo `manifest.webmanifest` y los iconos necesarios para permitir la instalación de la aplicación como PWA. |
| **RF-66** | Permitir iniciar la aplicación sin conexión, utilizando los recursos almacenados previamente en caché. |
| **RF-67** | Permitir navegar entre las rutas principales de la aplicación sin conexión, siempre que sus recursos hayan sido almacenados previamente. |

---

## 3. Requisitos No Funcionales

Estos requisitos establecen las condiciones técnicas, de rendimiento, accesibilidad y experiencia de usuario que deberá cumplir la aplicación.

| ID         | Requisito |
|------------|---|
| **RNF-01** | **Diseño visual:** utilizar Tailwind CSS v4 y trasladar los colores, espaciados, tipografías y demás elementos del diseño original a su sistema de estilos. No importar directamente `design.css`; la carpeta `design/` se utilizará como referencia visual. |
| **RNF-02** | **Almacenamiento:** utilizar IndexedDB mediante la biblioteca `idb` para guardar los datos y archivos Blob. Utilizar Storage API para estimar el espacio disponible. No utilizar `localStorage` para almacenar datos de negocio. |
| **RNF-03** | **Rendimiento:** garantizar que la aplicación sea utilizable en tabletas Android de aproximadamente cinco años de antigüedad y con baterías degradadas. Cargar las fotografías de forma diferida y evitar renderizados innecesarios mediante selectores de Zustand. |
| **RNF-04** | **Accesibilidad:** identificar los estados mediante texto y color, utilizar etiquetas ARIA cuando corresponda, mantener visible el indicador de foco y respetar el escalado de texto configurado en el dispositivo. |
| **RNF-05** | **Ergonomía táctil:** utilizar controles con un tamaño mínimo de 48 × 48 píxeles y situar las acciones principales en una barra inferior accesible con el pulgar. |
| **RNF-06** | **Mensajes de estado:** utilizar expresiones comprensibles para el técnico, como "On this tablet only", "At the office" y "Saved on this tablet at HH:MM". Evitar los términos "syncing", "pending" y "offline mode" en la interfaz. |
| **RNF-07** | **Estados de sincronización:** diferenciar visualmente, mediante texto y color, los trabajos guardados únicamente en la tableta, los recibidos por la oficina y los que presentan un conflicto. |
| **RNF-08** | **Separación entre trabajo y sincronización:** distinguir entre el estado del trabajo realizado por el técnico y el estado de recepción por parte de la oficina. Un trabajo puede estar completado localmente y todavía no haber sido enviado. |
| **RNF-09** | **Gestión del tiempo:** utilizar la hora local del dispositivo para registrar las fechas y horas, respetando el formato esperado por el backend, que no incluye información de zona horaria. |
| **RNF-10** | **Compatibilidad:** utilizar versiones recientes de Chrome y Android WebView. Verificar que los dispositivos de destino utilicen Chromium 111 o superior, necesario para Tailwind CSS v4. |
| **RNF-11** | **Autenticación:** no implementar inicio de sesión, autenticación ni expiración de sesiones en esta versión, ya que el backend no proporciona estos servicios. |
| **RNF-12** | **Pruebas:** implementar pruebas unitarias con Vitest para la lógica de datos y sincronización, pruebas de integración con React Testing Library para los componentes principales y pruebas E2E con Playwright para los escenarios de funcionamiento sin conexión, recuperación de conexión y resolución de conflictos. |
---

## 4. Funcionalidades fuera del alcance

Las siguientes funcionalidades no se desarrollarán en esta versión de la aplicación.

| ID | Funcionalidad | Motivo |
|---|---|---|
| **EX-01** | Inicio de sesión, autenticación y expiración de sesiones. | El backend no dispone de endpoints de autenticación y el técnico viene definido por los datos iniciales. |
| **EX-02** | Gestión de rutas y trabajos de varios días. | El backend proporciona información correspondiente a un único día. |
| **EX-03** | Reordenar los trabajos manualmente. | El orden de los trabajos viene determinado por el backend mediante `scheduledAt`. |
| **EX-04** | Utilizar varios técnicos en una misma tableta. | Cada tableta estará asociada a un único técnico. |
| **EX-05** | Crear, editar o eliminar trabajos. | Los trabajos se consultan desde el backend; su gestión no forma parte de esta aplicación. |
| **EX-06** | Notificaciones push. | No existe un servicio de backend para gestionar notificaciones push. |
| **EX-07** | Modo oscuro y temas alternativos. | No están contemplados en el diseño proporcionado. |
| **EX-08** | Exportar documentos PDF e informes. | No forma parte de los requisitos del ejercicio. |
| **EX-09** | Geolocalización y GPS. | No se ha solicitado esta funcionalidad. |
| **EX-10** | Consultar el historial de días anteriores. | La aplicación está limitada al día actual. |
| **EX-11** | Configuración y personalización del usuario. | No forma parte de los requisitos del ejercicio. |
| **EX-12** | Analítica. | No se ha solicitado esta funcionalidad. |
---

## 5. Criterios de Aceptación (Definition of Done)

La aplicación se considerará terminada cuando se cumplan los siguientes criterios:

- [x] Un técnico puede completar los trabajos del día sin conexión a Internet, sin errores ni pérdida de información (con la aplicación ya cargada).
- [x] Cuando se recupera la conexión, la aplicación envía automáticamente los datos almacenados en la tableta.
- [x] Si se recarga o cierra la aplicación a mitad de un trabajo, se conservan el cronómetro, las comprobaciones, las piezas, las fotografías y la firma.
- [x] Los conflictos entre técnicos pueden resolverse utilizando las tres opciones disponibles, sin sobrescribir ni eliminar información silenciosamente.
- [x] Los errores de envío, las hojas rechazadas y los trabajos inexistentes se muestran claramente y permiten realizar las acciones correspondientes.
- [x] La aplicación puede iniciarse y navegar entre sus pantallas sin conexión a Internet, siempre que sus recursos se hayan almacenado previamente.
- [x] Los mensajes de estado utilizan el lenguaje definido: "On this tablet only", "At the office" y "Saved on this tablet at HH:MM".
- [x] La interfaz no utiliza los términos "syncing", "pending" ni "offline mode".
- [ ] Todas las pruebas unitarias, de integración y E2E finalizan correctamente. **(Pendiente: Fase 12.)**
- [x] El README de `frontend/` explica cómo instalar y ejecutar la aplicación y el backend, así como los pasos necesarios para demostrar el funcionamiento sin conexión.
