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
- Android separado: Kotlin con core JVM, NotificationListenerService y Activity nativa. Primera versión diagnóstico RAM sin Internet/Firebase; Gradle 8.11.1, AGP 8.9.2, Kotlin 2.2.21, API 35/mínimo 28.
- Bandeja y confirmación locales implementadas: onSnapshot por UID; recibo inmutable comprasConfirmadas/auto_{eventId}, participaciones + resolución atómicas y control CAS compartido. SW v19.

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

## Punto exacto de continuidad

Tarea actual: **2.3 — Cola persistente y deduplicación**. Estado efectivo: **en_espera**.

Criterio de cierre: Persistencia mínima, reintentos y deduplicación sin fusionar compras legítimas iguales.

Última tarea terminada: **5.4 — Caché, cierre de sesión y regresión**.

Avance verificado: **65%**.

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

## Implementaciones incompletas

- 1.3/2.2: puerto Kotlin provisional con corpus compartido; primera recepción y normalización positiva verificadas en S24 mediante capturas. Faltan distribución exacta de extras, negativos auténticos, actualizaciones y validación física más amplia.
- 2.3/2.4: no hay cola persistente, deduplicación, cuenta Firebase ni sincronización Android. No convertir diagnóstico en deuda.
- 6.1 auditada con propuesta local probada. Faltan reglas finales de resolución, despliegue coordinado y validación entre dispositivos. No se modificó producción.
- En preparación Android: variante conectada separada de diagnóstico, Room por UID, identidad persistente, WorkManager y Google Auth. Antes de modificar: android/app/build.gradle.kts, source sets conectada/diagnostico, DestinoCompras.kt y documentos de configuración. No activar envío sin consentimiento y cuenta.

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
- Android: 19 JVM y 3 Robolectric aprobadas. APK debug compilado, firma válida, applicationId cl.controlcuotas.companion y ningún uses-permission. Lint sin errores y una advertencia de carpeta vacía. No validación física ni sincronización.
- Node: 68/68 aprobadas, incluidos 15 casos compartidos con Kotlin. Positivos anonimizados; negativos y distribución de extras sintéticos.
- Auditoría remota de reglas completada por lectura autenticada del release/ruleset; fuente y procedencia privadas, SHA-256 documentado. No se leyeron documentos financieros ni se cambió producción.
- S24, evidencia parcial del usuario: captura de la pantalla real con paquete instalado, consentimiento, acceso concedido y servicio conectado. Cero avisos/reconocimientos; no acredita recepción, parser ni sincronización. No suma puntos de aceptación.
- Primera compra real en S24: usuario confirmó detección y aportó notificación bancaria y resultado de Cuotas. Un aviso recibido y uno reconocido; monto, comercio y terminación coinciden. Sin datos financieros publicados. No prueba negativos, deduplicación, persistencia ni sincronización.
- Bloque bandeja: 84/84 Node y 14/14 Firestore emulador aprobadas. UI ficticia verificó reparto 700/300 con total 1000, partes iguales 500/500, descarte, offline, error visible/recuperación y logout. Ver docs/BANDEJA_COMPRAS.md.
- Corrección adicional: gramática auténtica «Tu Adicional compró» soportada por JS/Kotlin v2, corpus 24 casos, 31 Android aprobadas y APK 0.1.1 firmado. No se conserva nombre ni se asigna persona. Prueba física nueva pendiente.
- Firebase CLI consultó apps Android por lectura: ninguna registrada para este proyecto. No se creó app ni configuración remota.
- Cierre de bandeja: 16/16 SDK/emulador, incluyendo conservación byte a byte de objetos legados sin ID y carrera confirmar/descartar con una sola resolución coherente. 84 Node. UI final revisada tras evitar caché del servidor de pruebas.

## Errores conocidos, riesgos y requisitos externos

- Captura positiva revisada. Usuario confirma Samsung Galaxy S24 y ficha oficial Banco Falabella Chile (paquete cl.android). Faltan versión Android, extras reales y muestras negativas auténticas.
- Reglas vigentes auditadas solo por lectura; el contrato nuevo de revisión y pendientes requiere despliegue coordinado posterior. No se escribió en producción.
- Guardado protegido localmente con CAS y revisión; falta desplegar coordinadamente las reglas para bloquear clientes antiguos en producción. No publicar solo la PWA.
- La revisión automática rechazó iniciar el servidor localhost sin motivo adicional; no se pudo restaurar la URL en esta sesión. Servidor probado en puerto efímero; el usuario puede iniciarlo con npm run roadmap.
- Captura del S24 aportada por el usuario: app instalada, cl.android detectado, consentimiento y acceso Android concedidos, servicio conectado. Primera compra nueva recibida y reconocida con campos coincidentes en dos capturas; falta cobertura de otros avisos y comportamiento prolongado. Lint: cero errores, una advertencia ObsoleteSdkInt por carpeta vacía; limpieza/repetición rechazadas por revisión automática sin motivo adicional.
- Bandeja/confirmación/reparto implementados y probados solo localmente. La PWA pública, sus reglas y el APK de diagnóstico siguen sin sincronización nueva. No desplegar sin autorización.
- No hay app Android registrada en Firebase. Preparar variante conectada, cola por UID y reintentos; configuración OAuth/registro y activación remota requieren revisión concreta.

## Próximos pasos en orden de prioridad

1. 2.3 — Cola persistente y deduplicación (en_espera).
2. 7.2 — Pruebas UI escritorio y móvil (pendiente).

## Instrucciones concretas para retomar

- REANUDADO el 2026-10-21 por solicitud explícita del usuario. Continuar tareas verificables y conservar estado tras cada bloque.
- Worktree: outputs/tarjeta en la carpeta de esta conversación; rama codex/compras-falabella. Leer ROADMAP.md y ESTADO_PROYECTO.md; comprobar git status, diff y log antes de editar.
- Base vigente: 65/100 puntos, 84 Node, 31 Android y 16 Firestore/emulador aprobadas. Nuevas pruebas solo cuando cambien los módulos o exista preocupación pendiente.
- Continuar Android 2.3/2.4: cola mínima por UID, WorkManager y conexión Google configurada. Mantener diagnóstico sin Internet disponible por separado. No declarar deduplicación bancaria ni soporte físico general con una sola positiva.
- La bandeja ya edita y confirma el grupo completo con importes por persona/mes. Aún no se publica ni recibe datos del APK. La redistribución financiera de grupos ya pagados no está habilitada.
- Datos confirmados: Samsung Galaxy S24; Banco Falabella Chile de ficha Google Play cl.android. Captura positiva transcrita de forma anonimizada en docs/FORMATO_NOTIFICACION.md. Faltan Android/One UI exactos, extras de notificación y muestras negativas auténticas.
- SDK API 35, Build Tools 35.0.0, Platform Tools y Gradle instalados fuera del repo en work/herramientas con aceptación explícita del titular; sin PATH global. APK debug en outputs/apk; guía android/PRUEBA_S24.md. No hay teléfono conectado por ADB. La captura del usuario verifica instalación, autorización y conexión mostradas en S24; dos capturas posteriores verifican recepción y reconocimiento de una compra nueva con campos coincidentes.
- El prototipo JS tiene puerto Kotlin y corpus compartido; el flag conservador del prototipo JS sigue en falso hasta su validación integral; la primera positiva física del puerto Kotlin ya está documentada. La app solo mantiene resultados en RAM. No activar persistencia o sincronización antes de vincular y verificar UID.
- Registrar tarea y archivos previstos antes de un bloque extenso; actualizar JSON y regenerar vistas al cerrarlo. No subir commits, desplegar reglas ni tocar datos reales sin autorización.
- Ejecutar npm run roadmap y abrir http://127.0.0.1:8767/docs/seguimiento/roadmap.html para seguimiento en vivo; Ctrl+C cierra el servidor. También abre como archivo local con snapshot, que requiere reabrir tras regenerar.
- Firebase CLI quedó autenticada mediante acceso completado por el titular. La sesión no autoriza despliegues ni cambios financieros. La auditoría de reglas terminó; no volver a pedir login salvo que caduque o falten permisos.

La persistencia es el repositorio, no el chat, el almacenamiento del navegador ni una promesa de detectar créditos. Si la sesión se corta durante una edición, revisar el diff y regenerar antes de confiar en las vistas. Las operaciones Git remotas y el despliegue requieren autorización explícita.
