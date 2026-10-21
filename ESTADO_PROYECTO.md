<!-- GENERADO: editar docs/seguimiento/plan.json y ejecutar node scripts/seguimiento.mjs -->
# Estado del proyecto

Snapshot: 2026-10-21 · Base: `58ebee85df3acf3b942f3ade944b40b63aa82af9` · Rama: `codex/compras-falabella`.

**PAUSADO por solicitud expresa del usuario antes de apagar el PC. No continuar hasta nueva instrucción.**

## Objetivo

Detectar compras reales desde Android, revisarlas sin asignación e incorporarlas solo al confirmar, conservando toda la PWA actual. Permitir repartir una compra entre varias personas con importes elegidos y suma exacta.

## Arquitectura comprobada

- PWA HTML/CSS/JS sin framework; index.html contiene UI, pagos y Firebase JS 10.12.0.
- Google Auth; users/{uid} contiene arrays items/tarjetas/personas, saldos e historial; getDoc/setDoc merge sin escucha en vivo.
- logic.mjs contiene cálculos derivados; pdf-export.mjs produce PDF; SW cuotas-v15; backup v6.
- monto es valor por cuota; total es saldo derivado. No se admiten aún cuotas desiguales.

## Decisiones técnicas

- Seguimiento separado de la PWA. docs/seguimiento/plan.json es la única fuente de verdad; Markdown y HTML se regeneran.
- Los pesos suman 100 puntos de aceptación. Solo completadas y con evidencia aportan avance; no es una estimación de tiempo.
- Gantt por orden lógico de ejecución, sin fechas ni duración inventadas. Dependencias independientes permiten trabajo fuera del orden visual.
- ADR-001 selecciona app Kotlin nativa + cola Room/WorkManager + Firebase del mismo UID; pendientes en subcolección aislada, confirmación online con control de revisión de todos los escritores.
- Ampliación 2026-10-21: reparto entre varias personas con importes libres o partes iguales. Se redistribuyeron solo pesos pendientes; total sigue en 100 y se conservan los 17 puntos ya verificados.
- Dispositivo de validación: Samsung Galaxy S24, confirmado por el usuario. Paquete de la ficha oficial cl.android confirmado como app instalada; Android/One UI exactos aún no informados.

## Punto exacto de continuidad

Tarea actual: **5.1 — Resolver concurrencia del documento legado**. Estado efectivo: **en_curso**.

Criterio de cierre: Guardados no pierden compras confirmadas, pagos ni cambios de otro dispositivo.

Última tarea terminada: **4.5 — Motor de reparto exacto entre personas**.

Avance verificado: **28%**.

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

## Implementaciones incompletas

- Motor de cuotas y reparto implementados y probados, todavía sin conectar a UI, PDF ni persistencia. No hay reparto operativo en la PWA aún.
- Prototipo de analizador solo para formato positivo observado; no es definitivo ni se ejecuta en Android. Falta paquete y corpus negativo auténticos.
- 5.1: persistencia-segura.mjs implementa control de revisión y cola; pruebas del contrato aprobadas. Falta conectar a todos los escritores de la PWA, preservar borrador en errores y probar reglas/emulador antes de marcar completo.
- Sin APK, permiso de teléfono, sincronización móvil ni cambios de datos de producción.
- Trabajo detenido por el usuario. Sin cambios funcionales en index.html, logic.mjs, pdf-export.mjs, sw.js ni datos Firebase. No se comenzó integración de UI.

## Pruebas y resultados

- 12/12 pruebas preexistentes aprobadas (node --test tests/*.test.mjs).
- Seguimiento generado y --check aprobado; controles de fases, búsqueda y recarga probados en navegador.
- 28/28 pruebas Node aprobadas: 12 preexistentes y 16 nuevas; fixtures bancarios positivos anonimizados, negativos sintéticos identificados como tales.
- 32/32 pruebas Node aprobadas tras añadir comparación de revisiones, cambio de escritor legado, cola serial y bloqueo tras fallo; puerto de prueba en memoria, no emulador Firestore.
- Cierre por pausa: 32/32 pruebas Node aprobadas tras las últimas modificaciones; seguimiento --check correcto. Nuevos helpers y puente de notificación aún no tienen pruebas específicas; no declarar cobertura total.

## Errores conocidos, riesgos y requisitos externos

- Captura positiva revisada. Usuario confirma Samsung Galaxy S24 y ficha oficial Banco Falabella Chile (paquete cl.android). Faltan versión Android, extras reales y muestras negativas auténticas.
- Reglas de Firestore desplegadas sin verificar; no publicar reglas ni escribir datos reales desde esta sesión.
- save() sobrescribe arrays completos: riesgo de pérdida entre dispositivos y confirmaciones; requiere resolver concurrencia.
- Cuotas variables exigen cambios coordinados en pagos, abonos, PDF, importación y resumen.

## Próximos pasos en orden de prioridad

1. 5.1 — Resolver concurrencia del documento legado (en_curso).
2. 2.1 — App complementaria y permisos explícitos (pendiente).
3. 6.1 — Reglas y pruebas de aislamiento (pendiente).

## Instrucciones concretas para retomar

- PAUSADO el 2026-10-21 por solicitud expresa del usuario, que apagará el PC. Reanudar únicamente cuando el usuario lo solicite.
- Worktree: outputs/tarjeta en la carpeta de esta conversación; rama codex/compras-falabella. Leer ROADMAP.md y ESTADO_PROYECTO.md; comprobar git status, diff y log antes de editar.
- Ejecutar node scripts/seguimiento.mjs --check y node --test tests/*.test.mjs. Estado de cierre: 28 puntos verificados de 100; 32/32 pruebas aprobadas.
- Continuar exactamente en 5.1: conectar persistencia-segura.mjs a save/load y todos los escritores. Actualmente NO está importado por index.html; resolver conflictos visibles y conservación de borradores, probar con emuladores y revisar reglas. No marcar 5.1 completa por sus pruebas en memoria.
- Antes de integrar cuotas variables y reparto, coordinar pagos, abonos, deshacer, PDF, backups y validación de participaciones de valor cero; las funciones puras ya están implementadas.
- Datos confirmados: Samsung Galaxy S24; Banco Falabella Chile de ficha Google Play cl.android. Captura positiva transcrita de forma anonimizada en docs/FORMATO_NOTIFICACION.md. Faltan Android/One UI exactos, extras de notificación y muestras negativas auténticas.
- No hay Android SDK/Gradle/ADB encontrados en el entorno ni APK construido. No se creó todavía android/. No asumir detector móvil ni sincronización operativos.
- El prototipo falabella-notificaciones.mjs no corre en el teléfono; requiere puerto nativo y validación física. El flag de soporte físico sigue en falso a propósito.
- Registrar tarea y archivos previstos antes de un bloque extenso; actualizar JSON y regenerar vistas al cerrarlo. No subir commits, desplegar reglas ni tocar datos reales sin autorización.
- Abrir docs/seguimiento/roadmap.html directamente como archivo local: no requiere servidor. La URL 127.0.0.1:8767 era únicamente una vista temporal de esta sesión.

La persistencia es el repositorio, no el chat, el almacenamiento del navegador ni una promesa de detectar créditos. Si la sesión se corta durante una edición, revisar el diff y regenerar antes de confiar en las vistas. Las operaciones Git remotas y el despliegue requieren autorización explícita.
