<!-- GENERADO: editar docs/seguimiento/plan.json y ejecutar node scripts/seguimiento.mjs -->
# Estado del proyecto

Snapshot: 2026-10-21 · Base: `58ebee85df3acf3b942f3ade944b40b63aa82af9` · Rama: `codex/compras-falabella`.

## Objetivo

Detectar compras reales desde Android, revisarlas sin asignación e incorporarlas solo al confirmar, conservando toda la PWA actual. Permitir repartir una compra entre varias personas con importes elegidos y suma exacta.

## Arquitectura comprobada

- PWA HTML/CSS/JS sin framework; index.html contiene UI, pagos y Firebase JS 13.1.0.
- Google Auth; users/{uid} conserva arrays y añade revisión de guardado. save usa transacción CAS y cola; getDoc valida base. Bandeja con onSnapshot por UID; el documento financiero principal conserva lectura protegida al cargar.
- cuotas-item.mjs es el adaptador común PWA/resúmenes/PDF; datos-compras preserva IDs y planes; ui-plan-cuotas ofrece configurador; SW cuotas-v21 y backup v7 compatible con v6.
- Legados conservan monto por cuota; planes explícitos y participaciones usan sus importes exactos sin duplicar contrato. El alta manual permite modalidades explícitas con previsualización.
- Android separado: Kotlin con core JVM, NotificationListenerService y Activity nativa. Primera versión diagnóstico RAM sin Internet/Firebase; Gradle 8.11.1, AGP 8.9.2, Kotlin 2.2.21, API 35/mínimo 28.
- Bandeja y confirmación publicadas: onSnapshot por UID; recibo inmutable, participaciones y resolución atómicos con CAS. Usuario confirma detección funcionando y aporta revisión real; aún faltan pruebas físicas prolongadas de reintentos y actualizaciones.
- Dos variantes Android: diagnóstico cl.controlcuotas.companion sin Internet y conectada .sync, con consentimiento independiente, Google Auth, Room por UID, WorkManager y caché Firestore en memoria. Limpia datos financieros de filas enviadas y conserva identidad mínima.

## Decisiones técnicas

- Seguimiento separado de la PWA. docs/seguimiento/plan.json es la única fuente de verdad; Markdown y HTML se regeneran.
- Los pesos suman 100 puntos de aceptación. Solo completadas y con evidencia aportan avance; no es una estimación de tiempo.
- Gantt por orden lógico de ejecución, sin fechas ni duración inventadas. Dependencias independientes permiten trabajo fuera del orden visual.
- ADR-001 selecciona app Kotlin nativa + cola Room/WorkManager + Firebase del mismo UID; pendientes en subcolección aislada, confirmación online con control de revisión de todos los escritores.
- Ampliación 2026-10-21: reparto entre varias personas con importes libres o partes iguales. Se redistribuyeron solo pesos pendientes; total sigue en 100 y se conservan los 17 puntos ya verificados.
- Dispositivo de validación: Samsung Galaxy S24, confirmado por el usuario. Paquete de la ficha oficial cl.android confirmado como app instalada; Android/One UI exactos aún no informados.
- Reanudación: conectar CAS/cola a escritores actuales, mostrar borrador recuperable ante fallo y probar aislamiento/concurrencia en emulador local antes de habilitar flujo automático.
- Roadmap reparado: servidor Node local reproducible en npm run roadmap; consulta plan.json sin caché cada 3 segundos, conserva vista válida y muestra conexión. Espera por dependencia se distingue de bloqueo explícito; no cambia pesos ni aceptación.
- El configurador exige el original de forma explícita y mantiene la entrada habitual por valor de cuota. Configurar o cancelar no escribe deuda; solo guardar aplica el plan. La edición financiera de planes existentes sigue protegida.
- Primera app Android verificable por etapas: diagnóstico local voluntario y temporal, sin permiso de Internet ni deuda; no persistir compras antes de vincular el UID. Cola/Firebase se habilitarán en sus tareas, sin confundir diagnóstico con sincronización.
- La confirmación creará un recibo inmutable en comprasConfirmadas/{compraId}, añadirá todas sus participaciones al array legado y resolverá el pendiente en la misma transacción. Las reglas getAfter exigirán las tres partes; descartar no modifica deuda. No desplegar sin autorización.
- La conectada tiene otro applicationId para mantener diagnóstico local disponible. Se registró el cliente Android y sus huellas en el proyecto existente como configuración necesaria de la integración solicitada; no se desplegaron reglas/PWA ni se modificaron documentos financieros.
- La identidad local combina UID, clave Android anonimizada, postTime y huella de datos; conserva cada ID en reintentos. No fusiona por monto/comercio y no promete deduplicación bancaria global sin referencia auténtica.
- 2026-10-21: el titular autorizó publicar web y reglas. Reglas compiladas y desplegadas antes de avanzar main sin forzar. No se consultaron ni editaron documentos financieros; no hay migración. No volver a pedir esta autorización para completar la entrega aprobada.
- Prioridad explícita del usuario: simplificar la confirmación antes de nuevas etapas. Fecha sugerida desde fecha bancaria válida o detección America/Santiago, tarjeta Papá si existe, flujo individual con importe detectado, reparto múltiple desplegable. Las correcciones manuales prevalecen y la validación usa el total final con intereses. No se modifica el aviso ni se crea deuda antes de confirmar.
- Corrección autorizada tras auditoría: no convertir saldos de texto; conservar decimales históricos numéricos y exigir enteros a nuevos aportes. Señales de envío usan APPEND_OR_REPLACE para evitar perder una captura al terminar un worker.
- Investigación 1.1 depende del plan 0.2, no de la revisión visual del Gantt 0.4; son trabajos independientes. Se reabren 0.3/0.4 sin bloquear artificialmente evidencia técnica ya ejecutada.

## Punto exacto de continuidad

Tarea actual: **6.2 — Recuperación offline y entre dispositivos**. Estado efectivo: **en_espera**.

Criterio de cierre: Reintentos, sesión revocada y concurrencia sin duplicados ni pérdida.

Última tarea terminada: **7.2 — Pruebas UI escritorio y móvil**.

Avance verificado: **63%**.

## Archivos creados o modificados en esta iniciativa

- `docs/INSPECCION_INICIAL.md`
- `docs/seguimiento/plan.json`
- `scripts/seguimiento.mjs`
- `docs/seguimiento/plantilla.html`
- `ROADMAP.md`
- `ESTADO_PROYECTO.md`
- `docs/seguimiento/roadmap.html`
- `docs/ADR-001-compras-android.md`
- `docs/VALIDACION_COMPRAS.md`
- `compras-pendientes.mjs`
- `planes-cuotas.mjs`
- `tests/compras.test.mjs`
- `docs/FORMATO_NOTIFICACION.md`
- `reparto-compras.mjs`
- `falabella-notificaciones.mjs`
- `persistencia-segura.mjs`
- `ui-guardado.mjs`
- `firestore.rules`
- `firebase.json`
- `tests/persistencia-emulador.integration.mjs`
- `package.json`
- `package-lock.json`
- `.gitignore`
- `docs/GUARDADO_SEGURO.md`
- `cuotas-item.mjs`
- `datos-compras.mjs`
- `tests/cuotas-integradas.test.mjs`
- `scripts/roadmap-servidor.mjs`
- `tests/roadmap.test.mjs`
- `docs/CUOTAS_EXACTAS.md`
- `ui-plan-cuotas.mjs`
- `tests/formulario-plan.test.mjs`
- `android/README.md`
- `android/PRUEBA_S24.md`
- `android/app/src/main/AndroidManifest.xml`
- `android/app/src/main/java/cl/controlcuotas/companion/`
- `android/core/src/main/kotlin/cl/controlcuotas/core/NotificacionesFalabella.kt`
- `android/gradle/wrapper/gradle-wrapper.properties`
- `tests/fixtures/notificaciones-falabella.json`
- `tests/corpus-falabella.test.mjs`
- `docs/AUDITORIA_REGLAS.md`
- `confirmacion-compras.mjs`
- `repositorio-pendientes.mjs`
- `ui-pendientes.mjs`
- `ui-revision-compra.mjs`
- `compras.css`
- `tests/confirmacion.test.mjs`
- `docs/BANDEJA_COMPRAS.md`
- `android/CONEXION_FIREBASE.md`
- `android/app/src/conectada/`
- `android/app/src/testConectada/`
- `android/app/schemas/`
- `android/app/src/main/java/cl/controlcuotas/companion/DestinoCompras.kt`
- `docs/PUBLICACION.md`
- `docs/GUIA_INSTALACION_Y_RECUPERACION.md`
- `tests/ui-bandeja.test.mjs`
- `tests/validacion-14-casos.test.mjs`
- `docs/CORRECCIONES_AUDITORIA.md`
- `docs/VALIDACION_CONTINUA.md`
- `scripts/verificar-dependencias.mjs`
- `.github/workflows/verificacion.yml`

## Implementaciones incompletas

- Muestras negativas auténticas de pago, devolución y publicidad; no están disponibles en el corpus.
- Red caída/restaurada y actualizaciones reales de avisos en S24. Instalación 0.2.1 y revocación/restauración ya reportadas; no volver a solicitarlas.
- Revisión visual actual del roadmap restringida; generación y VM no sustituyen esa inspección.
- Avisos transitivos de Firebase CLI aún sin solución compatible completa; seguir las versiones oficiales.

## Pruebas y resultados

- npm test: 127 aprobadas, cero fallos/omitidas; incluye diez casos del control de dependencias y coherencia CDN.
- npm run test:dependencias: versiones web/pruebas/lockfile coincidentes; cinco entradas conocidas visibles y cero desviaciones nuevas. No es auditoría sin vulnerabilidades.
- npm run test:reglas: 16 SDK/emulador demo-cuotas-local aprobadas; ninguna cuenta o dato financiero real.
- Android local: 52 ejecuciones actuales, 51 aprobadas y una omitida por SDK configurado. Ocho regresiones de WorkManager/Room; red de envío sustituida, no prueba física.
- Titular: APK 0.2.1 instalada y permiso revocado/restaurado con servicio reconectado; evidencia reportada durante esta continuación.
- Workflow .github/workflows/verificacion.yml: web/reglas y Android sin credenciales ni APK de entrega; verificar su ejecución en Actions.
- UI y PDF de corrección previa conservan su evidencia. PWA/Android funcionales no cambian; SW sigue cuotas-v21.
- Publicación corregida previa verificada: 27 archivos públicos coincidentes con 56360cf y Pages aprobada.

## Errores conocidos, riesgos y requisitos externos

- Faltan negativos auténticos anonimizados del banco y Android/One UI exactos. No fabricar evidencia ni gastar dinero para probar.
- Titular confirma APK conectado 0.2.1 instalado encima de la versión anterior y reconexión tras revocar/restaurar permiso. Faltan red caída y actualizaciones de avisos en el teléfono.
- Cinco entradas npm pendientes en Firebase CLI: tres altas por braces/chokidar y dos moderadas por PubSub/OpenTelemetry. No son dependencias servidas por la PWA; braces no tiene versión publicada corregida. No forzar cambios incompatibles.
- URL del roadmap restringida previamente. Generación/VM comprobadas; falta revisión visual. No usar rutas o puertos alternativos para eludir la restricción.
- PWA cuotas-v21, Firebase JS 13.1.0 y jsPDF 4.2.1 publicados. Pages 39700219186 aprobada; 27 archivos HTTP 200 y contenido coincidente con 5312795. Sin cambios de reglas ni datos financieros reales.

## Próximos pasos en orden de prioridad

1. 6.2 — Recuperación offline y entre dispositivos (en_espera).
2. 0.3 — Roadmap visual local (en_curso).
3. 1.3 — Verificar paquete emisor y ejemplos negativos reales (en_curso).

## Instrucciones concretas para retomar

- Leer docs/VALIDACION_CONTINUA.md y comprobar la última ejecución de Verificación de cuotas en GitHub Actions.
- Esperar evidencia natural de recuperación sin red y ejemplos negativos anonimizados; no gastar dinero ni fabricar notificaciones para cerrar criterios físicos.
- No volver a pedir instalación 0.2.1 ni revocación/restauración: el titular ya las confirmó.
- Cerrar solo criterios con evidencia nueva y dependencias aceptadas. Cinco avisos transitivos siguen abiertos.

La persistencia es el repositorio, no el chat, el almacenamiento del navegador ni una promesa de detectar créditos. Si la sesión se corta durante una edición, revisar el diff y regenerar antes de confiar en las vistas. Las operaciones Git remotas y el despliegue requieren autorización explícita.
