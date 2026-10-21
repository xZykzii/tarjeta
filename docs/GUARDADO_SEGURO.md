# Guardado seguro del documento legado

Estado de esta entrega: implementación local, sin despliegue ni acceso a datos reales.

Todos los escritores existentes siguen pasando por `save()`. Ahora usan una cola por sesión y `guardarConRevision()` dentro de una transacción real Firebase. La lectura inicial conserva la base antes de normalizar registros; cada escritura compara contenido y revisión. Una base obsoleta se rechaza, nunca se vuelve a aplicar sobre datos nuevos.

La comparación de contenido detecta también cambios de un escritor anterior que no incrementaba revisión. Para impedir que ese escritor sobrescriba **después**, las reglas exigen `revision == revisionAnterior + 1`. Ambas partes deben desplegarse coordinadamente; renovar el service worker por sí solo no constituye esa protección.

## Recuperación visible

- Un fallo conserva una copia validada en memoria y bloquea nuevas modificaciones para no acumular operaciones sobre una base incierta.
- «Descargar borrador» genera JSON v7 con `esBorrador: true` y los datos pendientes, conservando IDs, origen y planes. No se guarda automáticamente información financiera en disco ni localStorage.
- Un fallo temporal permite reintentar contra la **misma base**. Si cambió el servidor, el reintento se convierte en conflicto y no sobrescribe.
- Un conflicto exige revisar/exportar y recargar lo guardado. La recarga solicita confirmación antes de descartar; el borrador se conserva si la lectura falla.
- Al reintentar con éxito se actualizan la lista, los saldos y el formulario. Las acciones que fallaron no siguen mostrando mensajes de éxito.
- Cambiar de cuenta invalida la cola y no muestra el borrador a otro UID. La copia permanece en memoria hasta resolverla o cerrar la pestaña; no sobrevive a apagar el equipo sin descargarla.

`loadData()` valida el contenedor antes de usarlo. La caché PWA pasa a `cuotas-v18` e incluye persistencia, recuperación, cálculo de planes exactos y su configurador.

## Evidencia de pruebas

- Suite Node existente y de dominio: 68 pruebas aprobadas, incluidas cinco de seguimiento y quince del corpus bancario anonimizado.
- Emulador Firestore con SDK 10.12.0 real: 9 pruebas aprobadas. Incluyen migración no destructiva de revisión, dos clientes concurrentes, escritor antiguo, creación inválida, acceso cruzado/anónimo, campos legados y contrato mínimo de pendientes.
- Hallazgo comprobado: las reglas pueden devolver `permission-denied` antes del reintento automático de una transacción concurrente. Una segunda lectura transaccional sin escrituras distingue base cambiada de denegación real. No se repite la escritura.
- Navegador con datos ficticios y puerto de almacenamiento explícitamente identificado como prueba: alta manual, conflicto, bloqueo del reintento conflictivo, cancelación/confirmación de recarga, recuperación del cambio remoto, fallo de red y reintento único, pago y deshacer con restitución de saldo.
- El botón de descarga se accionó; no se ha inspeccionado el archivo descargado por el navegador. El contrato JSON de borrador utiliza la copia validada, no referencias mutables a la UI.

## Repetir pruebas locales

Requiere Node y Java 21. Dependencias **solo de desarrollo** fijadas en `package-lock.json`; la PWA continúa sin build ni dependencias npm en ejecución.

```powershell
npm ci --ignore-scripts
npm test
npm run test:reglas
node scripts/seguimiento.mjs --check
```

Las pruebas del emulador utilizan exclusivamente `demo-cuotas-local`, con puerto Firestore `127.0.0.1:8087`. El script de integración rechaza ejecutarse fuera de un emulador local. No existe `.firebaserc` con un proyecto de producción.

## Límites y puerta de publicación

Las reglas desplegadas se auditaron el 2026-10-21 mediante lectura autenticada del release y ruleset, sin acceder a documentos ni escribir. Mantienen aislamiento por UID; la protección de revisión y el contrato nuevo todavía requieren las reglas propuestas. Evidencia y límites en `AUDITORIA_REGLAS.md`. Antes de publicar, coordinar el bloqueo de clientes antiguos con la PWA nueva. No se han desplegado las reglas propuestas.

Las reglas de pendientes permiten creación mínima y lectura por el titular; la resolución está denegada hasta implementar y probar la confirmación atómica. Por tanto, esta versión **no activa** la bandeja ni la captura Android.

Las reglas validan el contenedor histórico, sin reescribir cada compra antigua. El servicio de confirmación deberá añadir validación de planes, asignaciones y transiciones al implementar las tareas posteriores. El archivo actual no es una certificación de toda la integración futura.
