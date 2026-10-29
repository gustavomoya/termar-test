# Ejercicio 03 — Termar Servicios

**Perfil:** Frontend · **Esfuerzo estimado:** 6–8 horas

---

## Lee esto primero

Este brief no tiene una lista de requisitos. Es la descripción de un negocio y
su problema, más o menos tal como nos lo contó el cliente.

Parte de lo que te pedimos es que descubras qué hay que construir. Junto con
tu código, envíanos **tu propia lista de requisitos** y **los supuestos que
tuviste que asumir**. En este ejercicio esos documentos importan tanto como la
implementación.

---

## El cliente

Termar Servicios mantiene instalaciones de calefacción y refrigeración en todo
el norte del país. Salas de calderas, enfriadoras en azoteas, ventilación en
bloques de oficinas y hospitales. Veintiséis técnicos en furgonetas, una
despachadora llamada Loreto y un gerente de oficina llamado Quim que se
encarga de la facturación.

Cada técnico lleva una tableta Android resistente. Ahora mismo la tableta se
usa para una sola cosa: leer la lista de trabajos del día en una página web.
Todo lo demás es papel. El técnico rellena una hoja de trabajo autocopiativa
en cada sitio, el cliente la firma, y el técnico le entrega el taco de hojas a
Quim al final de la semana.

Quieren la hoja de trabajo en la tableta.

## Dónde ocurre el trabajo

Quim fue directo sobre por qué esto ya ha fracasado dos veces:

> "La última gente nos construyó algo precioso y no funcionó, porque lo
> construyeron en una oficina. Nuestra gente trabaja en salas de calderas.
> Las salas de calderas están en sótanos. No hay señal en un sótano. Tampoco
> hay señal en la sala de máquinas de la azotea del hospital, porque es una
> caja metálica.
>
> Un técnico baja a las nueve de la mañana, sube a las once y media, conduce
> hasta el siguiente y vuelve a bajar. Algunos días la furgoneta no pasa por
> ni un solo sitio con cobertura hasta que la aparca en casa. En las rutas de
> montaña pueden estar fuera dos días.
>
> La última aplicación mostraba un spinner. Eso era todo. Un spinner, durante
> dos horas y media, y luego todo lo que había escrito desapareció. Volvió al
> papel esa misma tarde y no lo culpo."

Loreto añadió:

> "Y no van a confiar en ella hasta que puedan ver que funcionó. Ángel sigue
> fotografiando cada hoja de trabajo con su propio teléfono antes de
> entregarla, porque una vez se perdió una en 2019. Si la aplicación no puede
> mostrarle, claramente, que su trabajo está a salvo, seguirá fotografiando
> hojas de trabajo y no habremos ganado nada."

## Cómo es una visita

El técnico abre el trabajo. Hay una lista de comprobación que depende del
tipo de instalación de que se trate: una caldera de gas tiene catorce
comprobaciones, una enfriadora tiene nueve y tres de ellas necesitan un valor
medido escrito, no solo una marca. Cada comprobación es apto, no apto o no
aplica, y una comprobación fallida necesita una nota.

Registra las piezas que ha usado del stock de la furgoneta. Fotografía todo
lo que sustituye —Quim insiste en esto, porque los clientes discuten los
cargos por piezas y una foto de la válvula corroída zanja la discusión.
Normalmente dos o tres fotos, pero después de un trabajo complicado pueden
ser una docena.

Registra el tiempo que pasa en el sitio. Lo pone en marcha cuando entra y lo
para cuando sale, y esto es lo que se le factura al cliente, así que tiene
que ser exacto.

Al final el cliente firma en la pantalla de la tableta. Entonces el trabajo
está terminado y conduce hasta el siguiente.

## Lo que nos contaron que había fallado antes

> "Hace el trabajo, y entonces la tableta le pide que inicie sesión otra vez
> porque la sesión caducó bajo tierra. Todo perdido." — Quim

> "Termina en el hospital y conduce hasta el siguiente trabajo. Mientras
> tanto yo he reasignado el trabajo del hospital a Berta, porque él me dijo
> por radio que iba con retraso, y yo no sabía que ya lo había hecho. Cuando
> a su tableta por fin le llega señal a las ocho de la tarde, los dos han
> rellenado el mismo trabajo. La última vez que pasó esto, el segundo
> sobrescribió el primero en silencio y le facturamos al cliente las piezas
> del técnico equivocado." — Loreto

> "Llevan guantes. Gruesos, en invierno. Y la pantalla tiene grasa encima.
> Los botones pequeños son inútiles. Ángel tiene cincuenta y ocho años y no
> usa las gafas de leer en el sitio de trabajo." — Loreto

> "Las tabletas tienen cinco años y las baterías están gastadas. Si la
> aplicación es pesada, la tableta se apaga a las cuatro de la tarde y
> entonces no se registra nada en absoluto." — Quim

> "Media jornada la pasa con una mano en la tableta y una mano en la llave
> inglesa." — Loreto

## Qué quieren

La hoja de trabajo, en la tableta, funcionando como funciona realmente el
trabajo. El técnico debería poder hacer una jornada completa sin pensar en la
conectividad en ningún momento, y poder ver en cualquier momento qué ha
llegado a la oficina y qué no.

Son claros en que prefieren tener la lista de comprobación y la firma
funcionando correctamente antes que tenerlo todo a medio construir.

## Qué te damos

- `design/` — tres pantallas: la lista de trabajos del día, la hoja de
  trabajo y el estado de sincronización. Abre `design/index.html`. Este es un
  diseño de **alta fidelidad**: el lenguaje visual, el tamaño táctil y los
  estados ya están decididos. Síguelo.
- `backend-03-termar/` — un backend ya montado, para que te centres en el
  frontend. Arráncalo con `node server.js` (o `npm start`): no necesita
  instalar nada ni base de datos. Sirve el día de un técnico —trabajos, sitios,
  plantillas de comprobación para dos tipos de instalación, stock de la
  furgoneta y una hoja de trabajo de ejemplo ya completada— y acepta las hojas
  de trabajo que vayas guardando. Los endpoints y las notas sobre los datos
  están en su `README.md`.

El backend es deliberadamente simple: responde siempre al instante y **nunca
finge estar sin conexión**. Simular la falta de cobertura, la cola de salida y
qué pasa cuando dos personas rellenan el mismo trabajo sigue siendo trabajo
tuyo en el cliente —es justo la parte interesante de este ejercicio—, así que
necesitas poder encender y apagar "la red" a voluntad desde tu lado, y poder
enseñárnoslo cuando lo revisemos.

## Qué esperamos recibir

1. **Un documento de requisitos.** Qué decidiste que había que construir,
   funcional y no funcional, en tu propia estructura. Marca qué dejaste fuera
   deliberadamente.
2. **Un registro de supuestos.** Todo lo que el brief no resuelve. Hay mucho.
   Encontrarlo es el ejercicio.
3. **La aplicación funcionando**, con un historial de git que muestre cómo
   llegaste hasta ahí.
4. **Un README** que nos permita ejecutarla a ella y a las pruebas sin tener
   que preguntarte nada —incluido cómo la conectas con el backend que te
   damos—, y que explique cómo demostrar el comportamiento sin conexión.
5. **Cualquier pregunta que le habrías hecho al cliente.** La leemos con
   atención.

## Esfuerzo estimado

Entre seis y ocho horas. Este ejercicio es deliberadamente más grande de lo
que cabe en ese tiempo, y elegir qué recortar es parte de lo que evaluamos.
Entrega menos, bien hecho, y cuéntanos qué harías después y por qué.

## Restricciones tecnológicas

<!-- STACK PROFILE: paste one block from docs/stack-profiles.md here, or leave as-is -->

Ninguna. Usa el lenguaje, framework y almacén de datos con los que te sientas
cómodo. Tus elecciones son parte de lo que evaluamos: prepárate para
justificarlas.

---

## Notas

**Pregúntanos cosas.** Puedes enviarnos preguntas por correo y te
responderemos como lo haría el cliente. Hacer una buena pregunta puntúa
mejor que acertar adivinando.

**Sobre las herramientas.** Usa lo que normalmente uses, asistentes de IA
incluidos: así es como trabajamos nosotros también. Después repasaremos tu
código juntos y te pediremos que cambies algo en directo, así que asegúrate
de dominar lo que entregas.
