# Termar Servicios — Registro de Supuestos

Este documento recoge las decisiones que hemos tenido que asumir porque el brief no define determinados comportamientos de la aplicación.

Incluye únicamente supuestos relacionados con el funcionamiento y la experiencia de usuario. No incluye decisiones tecnológicas ni detalles de implementación, salvo cuando son necesarios para explicar una limitación del ejercicio.

---

## 1. Identidad y sesión

| ID | Supuesto | Qué dice (o no) el brief |
|---|---|---|
| **A-01** | En esta entrega no habrá inicio de sesión. Se asume que cada tablet está asignada a un técnico y que la aplicación ya sabe quién la está utilizando. | El brief menciona que una aplicación anterior perdía la sesión, pero no solicita implementar un sistema de inicio de sesión. |
| **A-02** | La sesión no caduca ni se cierra automáticamente. La aplicación no solicitará al técnico que vuelva a iniciar sesión. | El brief no define cómo funciona la autenticación ni cuánto dura una sesión. |
| **A-03** | Cada tablet pertenece a un único técnico. No se contempla que varios técnicos compartan el mismo dispositivo o cambien de usuario durante la jornada. | El brief indica que cada técnico dispone de su propia tablet, pero no menciona dispositivos compartidos ni cambios de turno. |

## 2. Alcance temporal

| ID | Supuesto | Qué dice (o no) el brief |
|---|---|---|
| **A-04** | La aplicación mostrará los trabajos correspondientes a la jornada del técnico. No se implementará una planificación específica de rutas de varios días, pero los trabajos iniciados y los datos que todavía no se hayan enviado se conservarán aunque cambie la jornada. | El brief menciona rutas de montaña que pueden durar hasta dos días, pero no especifica cómo deben organizarse los trabajos entre jornadas. |
| **A-05** | Si una ruta continúa al día siguiente, los trabajos y datos que todavía no se hayan enviado permanecerán guardados en la tablet. No se eliminarán al cambiar de día. | El brief no especifica qué debe ocurrir con los trabajos que todavía no se han enviado cuando termina una jornada. |

## 3. Estado del trabajo y datos

| ID | Supuesto | Qué dice (o no) el brief |
|---|---|---|
| **A-06** | La aplicación distinguirá, mediante texto y color, los estados de sincronización: "On this tablet only" (guardado local, todavía no aceptado por el servidor), "Sending now" (enviándose), "At the office" (recibido), además de "Could not send" para fallos y "Needs your decision" para conflictos. El estado de finalización del trabajo se gestiona aparte. | El brief pide que el técnico pueda ver qué información ha llegado a la oficina, pero no define los estados ni su significado exacto. El diseño muestra varios tratamientos visuales distintos para representar estas situaciones. |
| **A-07** | El estado del trabajo y el estado del envío se gestionan por separado. Un técnico puede haber terminado un trabajo, aunque la hoja todavía no haya llegado a la oficina. | El brief no diferencia explícitamente entre completar un trabajo y enviar sus datos. |
| **A-08** | Todas las horas se registran utilizando la hora local de la tablet, sin incluir información de zona horaria. El reloj del dispositivo será la referencia para calcular el tiempo facturable. | El brief no especifica cómo deben gestionarse las zonas horarias ni qué reloj debe utilizarse. |
| **A-09** | El conflicto incluido en los datos de ejemplo se tratará como un caso de una lógica general que también pueda utilizarse con otros conflictos. | El brief describe un caso de conflicto entre técnicos, pero no especifica si pueden producirse otros ni cómo deben detectarse. |

## 4. Conflictos

| ID | Supuesto | Qué dice (o no) el brief |
|---|---|---|
| **A-10** | Los conflictos se muestran en la lista de trabajos del día y se resuelven desde la pantalla de sincronización. No interrumpen al técnico mientras está realizando un trabajo. | El brief no indica si el técnico debe resolver un conflicto inmediatamente o si puede continuar trabajando. |
| **A-11** | El técnico podrá elegir entre tres opciones para resolver un conflicto: "Keep mine", conservar la hoja registrada en su tablet; "Keep [other]'s", conservar la hoja del otro técnico; o "Send both", conservar la hoja propia y los metadatos disponibles de la otra para que la oficina pueda revisarlas. | El brief describe el problema de dos técnicos trabajando sobre el mismo encargo, pero no define las opciones disponibles para resolverlo. |
| **A-12** | La hoja que no se elija como principal nunca se eliminará silenciosamente. Se conservará como una copia archivada en el almacén local `archive`, con quién la escribió y cómo se resolvió el conflicto. La pantalla para recuperar esas copias queda fuera de esta entrega. | El brief señala como problema la sobrescritura silenciosa de información, pero no especifica qué debe hacerse con la hoja descartada. |
| **A-13** | La opción "Send both" conserva la hoja propia completa y los metadatos disponibles de la otra hoja, sin fusionarlas ni sobrescribirlas, y anota la resolución en el envío. Como el backend únicamente permite crear o reemplazar una hoja por trabajo, no se garantiza que ambas versiones lleguen a la oficina. La interfaz distingue entre las hojas conservadas localmente y las recibidas por el servidor. | El brief no especifica cómo debe funcionar esta opción. El backend de ejercicio solo dispone de `PUT /api/jobs/:id/worksheet`, que permite crear o reemplazar una hoja, pero no almacenar dos versiones independientes del mismo trabajo. Además, la hoja completa del otro técnico no está descargada en la tablet. |
| **A-14** | Si la hoja completa del otro técnico no está disponible en la tablet, la comparación mostrará únicamente los datos que sí estén disponibles. El resto se identificará claramente como información no disponible. | El brief no especifica qué información del otro técnico debe mostrarse durante la comparación. |
| **A-35** | Para poder demostrar la opción **«Conservar la mía»**, se creará una hoja local de ejemplo para `job-88223` cuando `NEXT_PUBLIC_DEMO_CONFLICT=true`. Esta información solo existirá en IndexedDB, no modificará los datos ni las semillas del backend y no se activará por defecto. | El backend incluye el trabajo `job-88223` en estado de conflicto, pero no proporciona una hoja local de Ángel. Sin esa hoja no sería posible demostrar la conservación ni la comparación de los datos del técnico. El brief tampoco especifica de dónde debe obtenerse esa información. |
| **A-36** | La opción **«Simulate no signal»** solo aparecerá cuando `NEXT_PUBLIC_DEMO_NETWORK=true`. Al activarla, se bloquearán las llamadas realizadas mediante `apiFetch` y la aplicación se comportará como si no tuviera conexión. No se modificará el estado real de conexión del navegador ni se alterará el backend. | El brief solicita un control para simular la pérdida de conexión durante la demostración, pero no especifica dónde debe aparecer ni cómo debe afectar al navegador y al backend. |

## 5. Hoja de trabajo
| ID | Supuesto | Qué dice (o no) el brief |
|---|---|---|
| **A-15** | El cronómetro permitirá iniciar, detener y reanudar el tiempo de trabajo. No habrá una función de pausa independiente. El tiempo que se contabiliza para la facturación será el tiempo transcurrido mientras el cronómetro está activo. | El brief indica cuándo debe iniciarse y detenerse el cronómetro, pero no define cómo deben gestionarse las pausas. |
| **A-16** | Si un valor medido está fuera del rango esperado, se solicitará una nota explicativa. Sin embargo, esto no hará que el resultado se marque automáticamente como **«No apto»**. | El brief solicita registrar valores medidos y añadir notas cuando haya comprobaciones fallidas, pero no define los rangos válidos ni qué consecuencias tiene superarlos. |
| **A-17** | Para finalizar un trabajo será obligatorio detener el cronómetro, responder al menos una comprobación de la lista y obtener la firma del cliente. | El brief indica que el cliente debe firmar y que el trabajo debe completarse, pero no establece los requisitos mínimos para permitir su finalización. |
| **A-18** | Los trabajos que ya estén sincronizados o que tengan un conflicto no podrán reabrirse ni editarse desde el flujo normal de trabajo. Si el backend indica que un trabajo tiene un estado `synced`, pero no existe una hoja asociada, se considerará una inconsistencia de los datos y no se permitirá editarlo automáticamente. | El brief no indica si un trabajo terminado puede modificarse posteriormente. Se asume que los trabajos enviados o en conflicto no deben reabrirse sin un proceso específico. Hay que tener en cuenta que `synced` representa el estado de sincronización, no el estado de finalización del trabajo. |
| **A-19** | Si el técnico deja una lista de comprobación sin terminar, los datos respondidos hasta ese momento se guardarán y podrá continuar desde el mismo punto más adelante. | El brief no describe qué debe ocurrir si el técnico abandona un trabajo antes de completar la lista de comprobación. |
| **A-20** | Las piezas utilizadas se descontarán del inventario local de la furgoneta. En esta entrega, los cambios de stock no se enviarán a la oficina. | El brief solicita registrar las piezas utilizadas del stock de la furgoneta, pero no especifica si el inventario debe actualizarse también en la oficina. |
| **A-21** | Las fotografías se capturarán con la cámara del dispositivo. Se comprimirán en la tablet, con un tamaño máximo de 1920 píxeles y calidad JPEG de 0.8. Se guardarán en IndexedDB como archivos Blob junto con una miniatura. Tras el envío se marcan como enviadas pero permanecen almacenadas; en esta entrega no se eliminan automáticamente. | El brief solicita fotografiar las piezas sustituidas y el trabajo realizado, pero no define el tamaño, la compresión, el almacenamiento ni la limpieza posterior de las imágenes. |
| **A-22** | El límite de fotografías será de **4 por trabajo**. Cada imagen se comprimirá para intentar mantener su tamaño por debajo de aproximadamente 1,5 MB y evitar superar el límite de 10 MB que admite el backend. En trabajos complicados, el técnico tendrá que seleccionar las fotografías más importantes. | El brief menciona como referencia que pueden tomarse alrededor de 12 fotografías, pero no establece un límite obligatorio. El backend de prueba no tiene un endpoint específico para subir imágenes y limita el tamaño de las solicitudes a 10 MB. |
| **A-37** | Las fotografías se enviarán codificadas en base64 dentro de la solicitud `PUT /api/jobs/:id/worksheet`. Si una fotografía pertenece a una hoja remota y no está almacenada en la tablet, se mostrará como no disponible y solo se enviará su información descriptiva. En un backend real sería preferible disponer de un endpoint específico para subir archivos binarios, lo que permitiría eliminar el límite de cuatro fotografías. | El backend del ejercicio no dispone de un endpoint independiente para fotografías. Tampoco especifica cómo recuperar imágenes que no están almacenadas en el dispositivo. |
| **A-38** | La pantalla de sincronización mostrará **una fila por cada operación encolada** (hoja de trabajo o actualización de estado). Las fotografías y la firma no aparecerán como operaciones independientes, porque se enviarán junto con la hoja en una única solicitud `PUT`. Por tanto, compartirán el mismo estado, número de intentos y comportamiento de reintento. El tamaño de las fotografías y la firma se mostrará como información adicional dentro de la fila de la hoja. | El brief no define cómo deben organizarse las operaciones de envío ni cómo deben subirse las fotografías. El backend de prueba tampoco ofrece un protocolo independiente para estos archivos. |
| **A-23** | El cliente firmará directamente en la pantalla de la tablet. La firma se guardará junto con el nombre de la persona que firma y la hora en que se realizó. | El brief indica que el cliente debe firmar en la pantalla, pero no especifica qué información adicional debe guardarse. |
| **A-24** | Si el cliente vuelve a firmar, la nueva firma sustituirá a la anterior. | El brief no define qué debe ocurrir cuando se registra una segunda firma. |
| **A-39** | Al salir de la hoja de trabajo (botón "Back to today", flecha de la cabecera o cierre/recarga de la pestaña) se fuerza el guardado local. Si quedan cambios sin persistir o un error de guardado, el navegador pide confirmación antes de abandonar la página. | El brief no especifica cómo evitar que una navegación accidental descarte trabajo, aunque insiste en que la información no debe perderse. |
| **A-40** | No se utiliza vibración ni feedback háptico. La confirmación de las acciones es visual y textual, para no depender del hardware ni de permisos del navegador. | El brief no menciona feedback háptico; solo pide que los controles sean grandes y legibles con guantes. |


## 6. Sincronización y conectividad

| ID | Supuesto | Qué dice (o no) el brief |
|---|---|---|
| **A-25** | Los datos guardados localmente se enviarán automáticamente cuando la conexión con el servidor vuelva a estar disponible. El técnico no tendrá que iniciar el proceso manualmente. | El brief quiere que el técnico pueda trabajar sin preocuparse por la conectividad, pero no especifica cómo debe reanudarse el envío de datos después de recuperar la conexión. |
| **A-26** | Las operaciones pendientes se enviarán siguiendo un orden definido. Si alguna falla por un problema temporal, se volverá a intentar después de un tiempo de espera progresivamente mayor, hasta alcanzar un número máximo de intentos. | El brief no establece un orden de envío ni define cómo deben funcionar los reintentos. |
| **A-27** | Además del envío automático, el técnico dispondrá de una opción para **«Intentar enviar ahora»** y solicitar manualmente un nuevo intento de sincronización. | El brief no menciona una acción manual para iniciar el envío de los datos. |
| **A-28** | Los datos guardados en la tablet deben mantenerse aunque la aplicación se cierre, el dispositivo se apague o se reinicie. | El brief considera la pérdida de información un problema grave, pero no especifica cuánto tiempo deben conservarse los datos ni qué garantías debe ofrecer el almacenamiento local. |
| **A-29** | La indicación de qué información ha llegado a la oficina dependerá de la confirmación de aceptación del servidor. Que una operación esté guardada en la cola o que se haya iniciado su envío no significa que la oficina la haya recibido. | El brief solicita mostrar qué información ha llegado a la oficina, pero no define el criterio que determina cuándo puede considerarse recibida. |

## 7. Almacenamiento y errores

| ID | Supuesto | Qué dice (o no) el brief |
|---|---|---|
| **A-30** | Si el almacenamiento disponible en la tablet se agota, la aplicación avisará al técnico y dará prioridad a proteger los datos del trabajo que está realizando. No se eliminarán datos guardados silenciosamente para liberar espacio. | El brief menciona rutas que pueden durar hasta dos días, pero no especifica qué debe hacer la aplicación cuando se queda sin espacio de almacenamiento. |
| **A-31** | Si una operación de envío falla, la aplicación informará al técnico y le permitirá intentar enviarla de nuevo. | El brief no define cómo deben mostrarse los errores de sincronización ni qué acciones debe poder realizar el técnico. |
| **A-32** | Si el servidor rechaza una hoja de trabajo por un problema de validación o de datos, se mostrará el motivo del rechazo y se permitirá corregir la información y volver a enviarla. | El brief no contempla explícitamente los rechazos del servidor ni el proceso para corregirlos. |
| **A-33** | Si un trabajo ya no existe en la oficina, se informará al técnico y se conservarán los datos que tenga guardados en la tablet. No se eliminará la información local automáticamente. | El brief no describe qué debe ocurrir si un trabajo se elimina o se reprograma mientras el técnico todavía tiene información local sin enviar. |
| **A-34** | La aplicación podrá abrirse y utilizarse sin conexión, incluso después de cerrarla y volver a iniciarla, siempre que sus recursos y datos necesarios se hayan descargado y guardado previamente en la tablet. La primera carga de la aplicación requerirá conexión. En esta entrega el trabajo sin conexión funciona con la aplicación ya cargada; el arranque offline completo queda pendiente de la Fase 10 (PWA/Service Worker). | El brief pide que los técnicos puedan trabajar sin preocuparse por la conectividad, pero no especifica cómo debe funcionar el primer acceso ni qué recursos deben estar disponibles para iniciar la aplicación sin señal. |

## 8. Resumen de decisiones de producto

| Área | Decisión asumida |
|---|---|
| **Autenticación** | No habrá inicio de sesión. Cada tablet estará asignada a un técnico. |
| **Alcance temporal** | La aplicación organiza los trabajos por día. Los datos que no se hayan enviado se conservarán al cambiar de jornada. |
| **Estado del trabajo** | La finalización del trabajo y la recepción de los datos en la oficina se gestionan por separado. |
| **Conflictos** | Se ofrecen tres opciones: conservar mi hoja, conservar la del otro técnico o conservar ambas. Las hojas descartadas se archivan localmente (sin pantalla de recuperación en esta entrega). |
| **Conservar ambas** | Se conserva la hoja propia completa y los metadatos disponibles de la otra. No se afirmará que ambas llegaron a la oficina si el backend no permite almacenarlas. |
| **Conflicto de demostración** | La hoja local de `job-88223` se crea únicamente cuando `NEXT_PUBLIC_DEMO_CONFLICT=true`. No se modifica el backend. |
| **Red simulada** | El control de demostración solo aparece con `NEXT_PUBLIC_DEMO_NETWORK=true`. Bloquea las llamadas a la API sin modificar la conexión real del navegador ni el backend. |
| **Cronómetro** | Permite iniciar, detener y reanudar. No tiene una función de pausa independiente. |
| **Piezas** | Se descuentan del inventario local de la furgoneta. No se envían actualizaciones de stock a la oficina. |
| **Fotografías** | Se capturan y comprimen en la tablet. Se permiten hasta cuatro por trabajo y permanecen almacenadas tras el envío (no se eliminan automáticamente). |
| **Firma** | Se guarda junto con el nombre de quien firma y la hora. Una nueva firma sustituye a la anterior. |
| **Sincronización** | El envío es automático al recuperar la conexión. Se realizan reintentos y también existe una opción de envío manual. |
| **Errores** | Los fallos de envío, los rechazos del servidor y los trabajos inexistentes se muestran al técnico y ofrecen una acción adecuada. |
| **Almacenamiento lleno** | La aplicación avisa al técnico y protege los datos del trabajo en curso. |
| **Uso sin conexión** | La aplicación puede utilizarse sin conexión con la app ya cargada. El arranque offline completo queda pendiente de la Fase 10 (PWA/Service Worker). |

---
