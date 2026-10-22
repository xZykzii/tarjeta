# Recuperación y concurrencia · 2026-10-22

La tarea 6.2 incorpora cinco pruebas de integración adicionales. Ejecutan las
funciones reales de persistencia, confirmación y suscripción de la PWA con
Firebase JS 13.1.0 en Node contra Firestore Emulator. No cambian la detección,
el APK, las reglas publicadas ni las compras del titular.

## Casos ejecutados

| Caso | Interrupción | Resultado exigido |
| --- | --- | --- |
| Bandeja desconectada | `disableNetwork` del SDK | Mantiene el aviso en caché, pierde confirmación de conexión y recibe los nuevos al reconectar, sin crear deuda |
| Confirmación durante el corte | Red SDK desactivada y transporte TCP cerrado | Rechaza la transacción, conserva pendiente y documento, y tras reconectar crea un único recibo y grupo de participaciones |
| Otro dispositivo confirma | Receptor desconectado mientras otro cliente sigue online | La bandeja elimina el pendiente al reconectar y repetir la confirmación no añade deuda |
| Borrador con base antigua | Transporte cerrado, otro cliente confirma y después se reconecta | Conserva el borrador sin mutarlo, rechaza sobrescribir con base obsoleta y permite guardar tras recargar la base actual |
| Cambio de cuenta | Suscripción detenida durante la desconexión | Recuperar la conexión del cliente anterior no vuelve a mostrar sus avisos en la cuenta activa |

Los casos de confirmación y borrador usan un intermediario TCP exclusivo del
cliente interrumpido, enlazado únicamente a `127.0.0.1` y al puerto local del
emulador. Se cierran sus conexiones durante el fallo y se restauran después;
el cliente del otro dispositivo permanece conectado directamente al emulador.
Los intermediarios y los contextos SDK se cierran al terminar cada prueba.

Esto evita confundir una bandera del SDK con una conexión de transporte
interrumpida. En la primera ejecución, `disableNetwork` por sí solo marcó las
suscripciones como caché, pero las transacciones aún llegaron al emulador.
Por eso las dos pruebas de transacciones también cortan TCP. Al restaurar se
espera una instantánea confirmada por servidor, sin pausas de duración fija.

En el intento durante el corte se limita el SDK real a un intento para evitar
esperar el backoff completo; los reintentos de confirmación conectados conservan
el método habitual. No se sustituye la transacción por una función ficticia.

## Ejecución y aislamiento

```powershell
npm test
npm run test:reglas
npm run seguimiento -- --check
```

`test:reglas` ejecuta ambas suites de integración en serie porque comparten el
proyecto de demostración y limpian sus datos entre casos. Las pruebas nuevas
rechazan arrancar sin `FIRESTORE_EMULATOR_HOST` en loopback. Solo utilizan
cuentas y compras ficticias de `demo-cuotas-local`; no requieren sesión real.

Resultado local: 127 pruebas Node y 21 pruebas SDK/emulador aprobadas. Los
cinco casos nuevos también se ejecutan en el trabajo web/reglas de Actions.

## Límites de la evidencia

Esta ejecución usa el transporte del SDK en Node; no acredita la red del
navegador ni el ciclo de vida de Android/Samsung. Los ocho casos existentes
Room/WorkManager siguen usando un envío sustituido y tampoco acreditan la
recuperación física de Firestore en el S24.

Por tanto, 6.2 continúa abierta hasta disponer de evidencia natural de red
caída/restaurada en el teléfono. También faltan negativos auténticos del banco
y actualizaciones reales de un mismo aviso. No hacer compras para probar.

El titular pidió continuar el roadmap tras reportar una nueva detección normal.
La incidencia previa de un aviso reconocido que no apareció en la web queda
sin causa confirmada. Cero pendientes no demuestra que ese aviso concreto se
haya enviado: puede pertenecer a otro UID o no haber ingresado a la cola.
No se declara corregida ni se reconstruye una deuda automáticamente.

Consultar también [validación continua](VALIDACION_CONTINUA.md) y la
[guía de recuperación](GUIA_INSTALACION_Y_RECUPERACION.md).
