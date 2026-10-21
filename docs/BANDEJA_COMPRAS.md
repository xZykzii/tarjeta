# Bandeja, revisión y reparto de compras

Implementación local. No se publicó la PWA ni se desplegaron reglas. El APK de
diagnóstico continúa separado: no envía compras a esta bandeja.

## Comportamiento

La sesión suscribe solo `users/{uid}/comprasPendientes` en estado `sin_asignar`.
Se muestran hasta 100 avisos; el indicador `100+` advierte que hay que resolver
parte del lote para cargar los siguientes. No representa un conteo global exacto.
Una respuesta desde caché se identifica y no habilita resolver compras.
Los errores se muestran expresamente; no se presentan como bandeja vacía.

Salir o cambiar de cuenta cierra la revisión y cancela la suscripción. Una
generación descarta callbacks tardíos de otra cuenta. Los borradores de revisión
permanecen solo en memoria mientras el diálogo siga abierto. Cancelar no escribe.
Los datos bancarios y de catálogos se insertan con `textContent` y controles DOM.

Revisar permite corregir descripción, fecha, tarjeta, plan y personas existentes.
La fecha se propone desde una fecha válida del aviso o, en su ausencia, desde el
día de detección en `America/Santiago`. Es una sugerencia editable; no agrega una
fecha bancaria al aviso original. Si existe la tarjeta llamada «Papá», se
preselecciona; si no existe, queda la selección manual. La persona se elige
explícitamente, sin inferirla del titular bancario. El aviso original no se modifica.

En una revisión nueva, modalidad y número de cuotas empiezan sin elegir. El
monto original puede precargarse del aviso; el plan requiere una elección y
aplicación explícitas. El configurador manual conserva su comportamiento previo.

El flujo inicial asigna el total a una sola persona, con importe precargado del
aviso. Valida y previsualiza automáticamente cuando existe un plan válido. El
reparto múltiple está cerrado en «Repartir entre varias personas»; abrirlo muestra
añadir/quitar personas, importes, partes iguales y verificación explícita. Cerrarlo
recupera la asignación individual y conserva el borrador múltiple mientras siga
abierta la revisión. Ninguno de estos cambios escribe deuda.

Al aplicar otro plan, los importes sugeridos de una sola persona siguen el total
final, incluidos los intereses. Los importes editados a mano se conservan, incluso
si quedan incompletos; la validación impide confirmar hasta que la suma coincida.
Los repartos con varias filas nunca se reajustan silenciosamente. Partes iguales
es una acción explícita calculada contra el total final del plan vigente.

El reparto acepta importes libres o iguales. La previsualización muestra total
original, total final, diferencia por financiamiento y cuotas de cada persona.
La suma por persona y por mes conserva el contrato completo, incluidos residuos
de un peso y meses con participación cero. Cambiar un campo invalida la revisión
previa. Confirmar exige verificar de nuevo todos los datos.

## Verificación del ajuste de confirmación · 2026-10-21

El usuario confirmó detección funcionando y aportó la pantalla real de revisión.
La entrega se limitó a los valores iniciales y al flujo de revisión. No cambió el
parser, el APK, el contrato de notificaciones ni las reglas desplegadas.

Aprobaron 88 pruebas Node. Cuatro nuevas comprueban el cambio de día Chile/UTC,
prioridad de fecha bancaria, tarjeta ausente, asignación individual sin mutar el
aviso y preservación de correcciones ante intereses. La UI ficticia ejecutó
cuota única, tres cuotas sin interés, interés manual, cuotas personalizadas,
reparto libre/igual, cambio de modo sin perder borrador, tarjeta ausente,
correcciones de fecha/tarjeta/importe y cancelación sin deuda. La confirmación
individual guardó una participación; la múltiple, dos participaciones con sus cuotas exactas.

Capturas del workspace, fuera de Git: `outputs/confirmacion-simple.png` y
`outputs/confirmacion-reparto.png`. No se usaron documentos financieros reales
en estas pruebas. El resto de etapas del roadmap no avanzó en este bloque.

## Transacción y concurrencia

Confirmar lee pendiente, documento del usuario y recibo antes de escribir:

1. Compara la revisión y la huella del documento con la base cargada. Rechaza
   cambios de otro dispositivo; no rebasa un borrador viejo.
2. Revalida personas, tarjeta, fecha, plan y reparto con el catálogo actual.
3. Añade todas las participaciones al array, manteniendo intactos los registros
   anteriores. Cada participación tiene ID estable, grupo y evento de origen.
4. Crea `comprasConfirmadas/auto_{eventId}` con el contrato y reparto originales.
5. Marca el pendiente confirmado con el mismo grupo y timestamp de servidor.

Las tres escrituras se confirman juntas. Reintentar un evento confirmado devuelve
su resolución sin añadir filas ni incrementar otra vez la revisión. Dos clientes
concurrentes solo pueden crear un recibo. La cola del navegador serializa esta
operación con los demás guardados y adopta la base resultante antes del siguiente.

El recibo es inmutable y conserva la revisión original. Los pagos posteriores
viven en los registros de la PWA. No se habilita editar financieramente una sola
participación ni se incorpora una herramienta para redistribuir un grupo ya pagado.
La edición del reparto documentada aquí ocurre durante la revisión, antes de confirmar.

Descartar es terminal e idempotente, conserva el aviso y no escribe deuda ni saldo.
No hay borrado de pendientes resueltos en este flujo. Un respaldo/restauración de
la PWA conserva IDs y participaciones, pero no vuelve a abrir avisos ya resueltos.

## Alcance de las reglas propuestas

`getAfter` exige resolución, recibo nuevo y anexado exacto al array en una operación
atómica. Se deniegan recibos aislados, confirmaciones sin participaciones, cambios
del aviso original, reapertura, edición/borrado del recibo y acceso de otro UID.

Las reglas validan contenedores, identidad, transiciones y vínculo atómico; no
recorren arbitrariamente cada cuota de listas financieras. La validación completa
de importes se ejecuta en el dominio del cliente. El titular ya puede modificar
sus propios datos; ningún secreto diferencia Android de la web del mismo usuario.
El servidor no certifica que un aviso haya sido emitido por el banco.

El 2026-10-21 el titular autorizó la publicación coordinada de la PWA y las reglas.
Las reglas ya fueron compiladas, desplegadas y verificadas por lectura del release
activo. Se publican con el SW `cuotas-v19`; clientes antiguos deben recargar la web.
El inicio de sesión en Firebase CLI por sí solo nunca autoriza un despliegue.

## Evidencia del 2026-10-21

- 84 pruebas Node aprobadas, incluidas siete de confirmación/suscripción/cola y
  24 del corpus JS/Kotlin de notificaciones anonimizadas.
- 16 pruebas SDK Firestore/emulador aprobadas: nueve anteriores y siete del
  flujo nuevo, con confirmación concurrente, reintento, descarte, base obsoleta,
  persona eliminada, recibo inmutable, escrituras incompletas denegadas,
  conservación exacta de registros legados y carrera confirmar/descartar.
- UI ejecutada en servidor de pruebas rotulado y con datos ficticios en RAM:
  previsualización y confirmación de $1.000 como $700/$300 en tres cuotas,
  cálculo de partes iguales $500/$500, cancelación de revisión, descarte sin
  alterar deuda, caché sin confirmación, error visible, recuperación y cierre de sesión.
- Capturas fuera de Git: `outputs/revision-reparto.png` y
  `outputs/bandeja-confirmada.png` en el workspace de esta conversación.
- No se ha probado esta bandeja en un navegador móvil real ni con sincronización
  Android. Las pruebas del servidor UI no sustituyen las del emulador real.

Comandos: `npm test`, `npm run test:reglas` y
`node scripts/seguimiento.mjs --check`. El emulador usa solo `demo-cuotas-local`.

Referencias: [transacciones y getAfter](https://firebase.google.com/docs/firestore/manage-data/transactions),
[suscripciones y metadatos](https://firebase.google.com/docs/firestore/query-data/listen).
