<!-- GENERADO: editar docs/seguimiento/plan.json y ejecutar node scripts/seguimiento.mjs -->
# Estado del proyecto

Snapshot: 2026-10-21 · Base: `58ebee85df3acf3b942f3ade944b40b63aa82af9` · Rama: `codex/compras-falabella`.

## Objetivo

Detectar compras reales desde Android, revisarlas sin asignación e incorporarlas solo al confirmar, conservando toda la PWA actual. Permitir repartir una compra entre varias personas con importes elegidos y suma exacta.

## Arquitectura comprobada

- PWA HTML/CSS/JS sin framework; index.html contiene UI, pagos y Firebase JS 10.12.0.
- Google Auth; users/{uid} conserva arrays y añade revisión de guardado. save usa transacción CAS y cola; getDoc valida base. Sin escucha en vivo todavía.
- cuotas-item.mjs es el adaptador común PWA/resúmenes/PDF; datos-compras preserva IDs y planes; ui-plan-cuotas ofrece configurador; SW cuotas-v18 y backup v7 compatible con v6.
- Legados conservan monto por cuota; planes explícitos y participaciones usan sus importes exactos sin duplicar contrato. El alta manual permite modalidades explícitas con previsualización.

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

## Punto exacto de continuidad

Tarea actual: **2.1 — App complementaria y permisos explícitos**. Estado efectivo: **pendiente**.

Criterio de cierre: Proyecto Android separado, listener real, filtro por paquete verificado y autorización transparente.

Última tarea terminada: **4.4 — Formulario de modalidades**.

Avance verificado: **43%**.

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
- `cuotas-item.mjs`
- `datos-compras.mjs`
- `tests/cuotas-integradas.test.mjs`
- `scripts/roadmap-servidor.mjs`
- `tests/roadmap.test.mjs`
- `docs/CUOTAS_EXACTAS.md`
- `ui-plan-cuotas.mjs`
- `tests/formulario-plan.test.mjs`

## Implementaciones incompletas

- Siguiente 2.1: proyecto Android separado y permisos transparentes. Aún no hay SDK/ADB/Gradle encontrados, APK, listener nativo ni configuración Android de Firebase. Preparar y compilar antes de dar instrucciones de instalación.
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
- Roadmap: 4/4 pruebas aprobadas de actualización, filtros/selección, marcador actual, dependencias y servidor limitado al seguimiento. Inspección visual de la pestaña rechazada por política de acceso del navegador; no se intentó eludir.
- Bloque 4.3/5.2/5.3: 49/49 Node, sintaxis app/SW, UI ficticia pago 34, pago 33, deshacer 33, edición sin alterar pagos; backup v7 realmente exportado y restaurado. PDF personal/general generados y renderizados; aislamiento personal verificado.
- Cierre formulario: 53/53 Node y sintaxis app/SW aprobadas. UI escritorio comprobó cuatro modalidades, aplicación sin escritura, alta manual, cancelación sin deuda y cuota única pagada/editada sin perder pago; cero errores de consola. No probada físicamente en móvil.

## Errores conocidos, riesgos y requisitos externos

- Captura positiva revisada. Usuario confirma Samsung Galaxy S24 y ficha oficial Banco Falabella Chile (paquete cl.android). Faltan versión Android, extras reales y muestras negativas auténticas.
- Reglas de Firestore desplegadas sin verificar; no publicar reglas ni escribir datos reales desde esta sesión.
- Guardado protegido localmente con CAS y revisión; falta auditar/desplegar reglas para bloquear clientes antiguos en producción. No publicar solo la PWA.
- Captura automática y reparto todavía no tienen interfaz de revisión/confirmación. La edición de planes existentes conserva importes y pagos para evitar cambios financieros accidentales.
- La revisión automática rechazó iniciar el servidor localhost sin motivo adicional; no se pudo restaurar la URL en esta sesión. Servidor probado en puerto efímero; el usuario puede iniciarlo con npm run roadmap.

## Próximos pasos en orden de prioridad

1. 2.1 — App complementaria y permisos explícitos (pendiente).
2. 6.1 — Reglas y pruebas de aislamiento (pendiente).

## Instrucciones concretas para retomar

- REANUDADO el 2026-10-21 por solicitud explícita del usuario. Continuar tareas verificables y conservar estado tras cada bloque.
- Worktree: outputs/tarjeta en la carpeta de esta conversación; rama codex/compras-falabella. Leer ROADMAP.md y ESTADO_PROYECTO.md; comprobar git status, diff y log antes de editar.
- Base vigente: 43/100 puntos, 53 pruebas Node y 9 pruebas Firestore/emulador. Ejecutar npm test y seguimiento --check; repetir emulador cuando cambie persistencia o reglas.
- Continuar 2.1: preparar proyecto Android y listener, usando la captura anonimizada y paquete cl.android confirmado. Verificar SDK/configuración y compilar; no inventar extras ni afirmar detección antes de prueba física.
- La UI de reparto debe editar/confirmar el grupo completo y conservar importes por persona y por mes. Todavía no está implementada; no confundir fixtures importados con captura operativa.
- Datos confirmados: Samsung Galaxy S24; Banco Falabella Chile de ficha Google Play cl.android. Captura positiva transcrita de forma anonimizada en docs/FORMATO_NOTIFICACION.md. Faltan Android/One UI exactos, extras de notificación y muestras negativas auténticas.
- No hay Android SDK/Gradle/ADB encontrados en el entorno ni APK construido. No se creó todavía android/. No asumir detector móvil ni sincronización operativos.
- El prototipo falabella-notificaciones.mjs no corre en el teléfono; requiere puerto nativo y validación física. El flag de soporte físico sigue en falso a propósito.
- Registrar tarea y archivos previstos antes de un bloque extenso; actualizar JSON y regenerar vistas al cerrarlo. No subir commits, desplegar reglas ni tocar datos reales sin autorización.
- Ejecutar npm run roadmap y abrir http://127.0.0.1:8767/docs/seguimiento/roadmap.html para seguimiento en vivo; Ctrl+C cierra el servidor. También abre como archivo local con snapshot, que requiere reabrir tras regenerar.

La persistencia es el repositorio, no el chat, el almacenamiento del navegador ni una promesa de detectar créditos. Si la sesión se corta durante una edición, revisar el diff y regenerar antes de confiar en las vistas. Las operaciones Git remotas y el despliegue requieren autorización explícita.
