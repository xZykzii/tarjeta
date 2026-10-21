<!-- GENERADO: editar docs/seguimiento/plan.json y ejecutar node scripts/seguimiento.mjs -->
# Estado del proyecto

Snapshot: 2026-10-21 · Base: `58ebee85df3acf3b942f3ade944b40b63aa82af9` · Rama: `codex/compras-falabella`.

## Objetivo

Detectar compras reales desde Android, revisarlas sin asignación e incorporarlas solo al confirmar, conservando toda la PWA actual. Permitir repartir una compra entre varias personas con importes elegidos y suma exacta.

## Arquitectura comprobada

- PWA HTML/CSS/JS sin framework; index.html contiene UI, pagos y Firebase JS 10.12.0.
- Google Auth; users/{uid} conserva arrays y añade revisión de guardado. save usa transacción CAS y cola; getDoc valida base. Sin escucha en vivo todavía.
- logic.mjs contiene cálculos derivados; pdf-export.mjs produce PDF; SW cuotas-v16 con persistencia/recuperación; backup v6.
- monto es valor por cuota; total es saldo derivado. No se admiten aún cuotas desiguales.

## Decisiones técnicas

- Seguimiento separado de la PWA. docs/seguimiento/plan.json es la única fuente de verdad; Markdown y HTML se regeneran.
- Los pesos suman 100 puntos de aceptación. Solo completadas y con evidencia aportan avance; no es una estimación de tiempo.
- Gantt por orden lógico de ejecución, sin fechas ni duración inventadas. Dependencias independientes permiten trabajo fuera del orden visual.
- ADR-001 selecciona app Kotlin nativa + cola Room/WorkManager + Firebase del mismo UID; pendientes en subcolección aislada, confirmación online con control de revisión de todos los escritores.
- Ampliación 2026-10-21: reparto entre varias personas con importes libres o partes iguales. Se redistribuyeron solo pesos pendientes; total sigue en 100 y se conservan los 17 puntos ya verificados.
- Dispositivo de validación: Samsung Galaxy S24, confirmado por el usuario. Paquete de la ficha oficial cl.android confirmado como app instalada; Android/One UI exactos aún no informados.
- Reanudación: conectar CAS/cola a escritores actuales, mostrar borrador recuperable ante fallo y probar aislamiento/concurrencia en emulador local antes de habilitar flujo automático.

## Punto exacto de continuidad

Tarea actual: **4.3 — Unificar cálculo manual y automático**. Estado efectivo: **en_curso**.

Criterio de cierre: Abonos, vencimientos, pagos, deshacer, PDF y resumen usan una lógica común.

Última tarea terminada: **5.1 — Resolver concurrencia del documento legado**.

Avance verificado: **32%**.

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
- `tests/persistencia-emulador.test.mjs`
- `package.json`
- `package-lock.json`
- `.gitignore`
- `docs/GUARDADO_SEGURO.md`

## Implementaciones incompletas

- Motor de cuotas/reparto aún sin conectar a UI, pagos, PDF y backup; siguiente bloque 4.3 y 5.2 coordinados.
- Reglas locales probadas para guardado y captura mínima; pendientes update/delete denegados hasta confirmación atómica. 6.1 no completa: auditoría real y reglas finales pendientes.
- Prototipo de analizador no se ejecuta en Android; faltan extras y negativos auténticos. Galaxy S24 y ficha cl.android confirmados.
- Sin APK, permisos del teléfono, sincronización móvil ni cambios de producción.

## Pruebas y resultados

- 12/12 pruebas preexistentes aprobadas (node --test tests/*.test.mjs).
- Seguimiento generado y --check aprobado; controles de fases, búsqueda y recarga probados en navegador.
- 28/28 pruebas Node aprobadas: 12 preexistentes y 16 nuevas; fixtures bancarios positivos anonimizados, negativos sintéticos identificados como tales.
- 32/32 pruebas Node aprobadas tras añadir comparación de revisiones, cambio de escritor legado, cola serial y bloqueo tras fallo; puerto de prueba en memoria, no emulador Firestore.
- Cierre por pausa: 32/32 pruebas Node aprobadas tras las últimas modificaciones; seguimiento --check correcto. Nuevos helpers y puente de notificación aún no tienen pruebas específicas; no declarar cobertura total.
- Reanudación: 32/32 Node y 9/9 Firestore emulador aprobadas; UI ficticia verificó alta, conflicto, recarga, reconexión, pago y deshacer.
- Hallazgo corregido: denegación de reglas en carrera se reclasifica mediante lectura sin escritura; nunca se reenvía borrador contra una base nueva.

## Errores conocidos, riesgos y requisitos externos

- Captura positiva revisada. Usuario confirma Samsung Galaxy S24 y ficha oficial Banco Falabella Chile (paquete cl.android). Faltan versión Android, extras reales y muestras negativas auténticas.
- Reglas de Firestore desplegadas sin verificar; no publicar reglas ni escribir datos reales desde esta sesión.
- Guardado protegido localmente con CAS y revisión; falta auditar/desplegar reglas para bloquear clientes antiguos en producción. No publicar solo la PWA.
- Cuotas variables exigen cambios coordinados en pagos, abonos, PDF, importación y resumen.

## Próximos pasos en orden de prioridad

1. 4.3 — Unificar cálculo manual y automático (en_curso).
2. 2.1 — App complementaria y permisos explícitos (pendiente).
3. 5.2 — Origen, identificadores y backups (pendiente).
4. 6.1 — Reglas y pruebas de aislamiento (pendiente).

## Instrucciones concretas para retomar

- REANUDADO el 2026-10-21 por solicitud explícita del usuario. Continuar tareas verificables y conservar estado tras cada bloque.
- Worktree: outputs/tarjeta en la carpeta de esta conversación; rama codex/compras-falabella. Leer ROADMAP.md y ESTADO_PROYECTO.md; comprobar git status, diff y log antes de editar.
- Base vigente: 32/100 puntos, 32 pruebas Node y 9 pruebas Firestore/emulador. Ejecutar npm test, npm run test:reglas y node scripts/seguimiento.mjs --check cuando corresponda.
- Continuar en 4.3 y 5.2: unificar cálculos para cuotas variables y participaciones, preservar IDs/origen en save y backups. Guardado seguro ya conectado y probado localmente; las reglas no se desplegaron.
- Antes de integrar cuotas variables y reparto, coordinar pagos, abonos, deshacer, PDF, backups y validación de participaciones de valor cero; las funciones puras ya están implementadas.
- Datos confirmados: Samsung Galaxy S24; Banco Falabella Chile de ficha Google Play cl.android. Captura positiva transcrita de forma anonimizada en docs/FORMATO_NOTIFICACION.md. Faltan Android/One UI exactos, extras de notificación y muestras negativas auténticas.
- No hay Android SDK/Gradle/ADB encontrados en el entorno ni APK construido. No se creó todavía android/. No asumir detector móvil ni sincronización operativos.
- El prototipo falabella-notificaciones.mjs no corre en el teléfono; requiere puerto nativo y validación física. El flag de soporte físico sigue en falso a propósito.
- Registrar tarea y archivos previstos antes de un bloque extenso; actualizar JSON y regenerar vistas al cerrarlo. No subir commits, desplegar reglas ni tocar datos reales sin autorización.
- Abrir docs/seguimiento/roadmap.html directamente como archivo local: no requiere servidor. La URL 127.0.0.1:8767 era únicamente una vista temporal de esta sesión.

La persistencia es el repositorio, no el chat, el almacenamiento del navegador ni una promesa de detectar créditos. Si la sesión se corta durante una edición, revisar el diff y regenerar antes de confiar en las vistas. Las operaciones Git remotas y el despliegue requieren autorización explícita.
