<!-- GENERADO: editar docs/seguimiento/plan.json y ejecutar node scripts/seguimiento.mjs -->
# Estado del proyecto

Snapshot: 2026-10-21 · Base: `58ebee85df3acf3b942f3ade944b40b63aa82af9` · Rama: `codex/compras-falabella`.

## Objetivo

Detectar compras reales desde Android, revisarlas sin asignación e incorporarlas solo al confirmar, conservando toda la PWA actual. Permitir repartir una compra entre varias personas con importes elegidos y suma exacta.

## Arquitectura comprobada

- PWA HTML/CSS/JS sin framework; index.html contiene UI, pagos y Firebase JS 10.12.0.
- Google Auth; users/{uid} conserva arrays y añade revisión de guardado. save usa transacción CAS y cola; getDoc valida base. Bandeja con onSnapshot por UID; el documento financiero principal conserva lectura protegida al cargar.
- cuotas-item.mjs es el adaptador común PWA/resúmenes/PDF; datos-compras preserva IDs y planes; ui-plan-cuotas ofrece configurador; SW cuotas-v20 y backup v7 compatible con v6.
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

## Punto exacto de continuidad

Tarea actual: **8.2 — Entrega verificada y roadmap final**. Estado efectivo: **completada**.

Criterio de cierre: Abrir/ejecutar artefactos, registrar pendientes reales y conservar seguimiento.

Última tarea terminada: **8.2 — Entrega verificada y roadmap final**.

Avance verificado: **100%**.

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

## Implementaciones incompletas

- 1.3/2.2: puerto Kotlin provisional con corpus compartido; primera recepción y normalización positiva verificadas en S24 mediante capturas. Faltan distribución exacta de extras, negativos auténticos, actualizaciones y validación física más amplia.
- 6.1 auditada y reglas publicadas con autorización. Usuario confirma detección con aviso visible en la PWA; faltan pruebas físicas de fallos, actualización, reinicio y reintentos.
- 2.3/2.4 implementadas, publicadas y con positiva declarada por el titular y pantalla de revisión. Faltan deduplicación de actualizaciones, pruebas de reintento/reinicio y cobertura negativa auténtica; no cerrar por una positiva.
- Permanece bloqueada 1.3 por negativos auténticos del banco. V2 añade compra adicional; solo el formato titular tiene positiva física verificada. Los avisos similares o de dos teléfonos pueden necesitar descarte manual hasta validar identidad bancaria.
- Publicación inicial completada en 86d0061; ajuste UI verificado con 88 Node y escenarios ficticios. No se avanzan otras funcionalidades del roadmap en esta entrega ni se alteran puntos de aceptación.

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
- Android final: 44 ejecuciones, 43 aprobadas y un caso sin configuración omitido porque el SDK ya está configurado (probado previamente sin configuración). Room real/Robolectric verifica persistencia, UID, callbacks repetidos, compras iguales distintas, limpieza, límites, colisión y estados terminales. Ambos APK compilan; lint sin errores.
- APK conectado 0.2.0-preparacion firmado e inspeccionado: paquete .sync, listener protegido e Internet. Diagnóstico continúa sin Internet. OAuth Android/web y certificado del SDK coinciden con paquete y firma; sin prueba de Google/envío real en teléfono.
- Última revisión UI: aviso sin modalidad ni cantidad predeterminadas; el titular elige y aplica el plan. 84 Node y 16 SDK/emulador mantienen aprobación.
- Publicación autorizada: Firebase CLI compiló y desplegó reglas; lectura del release coincide con fuente local normalizada. main avanzó sin forzar a 8596ee9. GitHub Pages run 39667206844 exitoso; 20 recursos estáticos HTTP 200 coinciden con el commit y módulos con MIME JavaScript. Sin lectura ni escritura de documentos financieros.
- Ajuste de confirmación: 88/88 Node y UI ficticia aprobados. Fecha de detección Chile/prioridad bancaria, Papá o selector vacío, importe editable sin sobrescritura, individual automático, reparto cerrado/abierto, partes libres/iguales, cuatro modalidades, suma final con intereses, borrador al alternar y cancelación sin deuda. Confirmación individual/múltiple ejecutadas solo en datos ficticios. Ver docs/BANDEJA_COMPRAS.md.
- UI bandeja automatizada: 5/5 pruebas Node en tests/ui-bandeja.test.mjs aprobadas (total suite 93/93 Node). Panel, contador, renderizado de tarjetas, acciones de revisión y descarte con diálogo de confirmación, y aislamiento sin conexión probados.
- Suite de validación de 14 casos: 14/14 pruebas aprobadas en tests/validacion-14-casos.test.mjs (total suite 107/107 Node). Trazabilidad completa de la matriz de docs/VALIDACION_COMPRAS.md cubriendo parsing bancario, rechazo de no compras, deduplicación, cuotas exactas, redondeo CLP, aislamiento Firebase, transacciones CAS y compatibilidad de backups.

## Errores conocidos, riesgos y requisitos externos

- Captura positiva revisada. Usuario confirma Samsung Galaxy S24 y ficha oficial Banco Falabella Chile (paquete cl.android). Faltan versión Android, extras reales y muestras negativas auténticas.
- Reglas nuevas desplegadas y verificadas por lectura del release activo. La auditoría anterior queda como evidencia histórica; la entrega no leyó ni escribió documentos financieros.
- CAS y revisión activos en producción con SW cuotas-v20. Un cliente antiguo debe recargar antes de guardar; no restaurar reglas permisivas para admitir escrituras sin revisión.
- La revisión automática rechazó iniciar el servidor localhost sin motivo adicional; no se pudo restaurar la URL en esta sesión. Servidor probado en puerto efímero; el usuario puede iniciarlo con npm run roadmap.
- Captura del S24 aportada por el usuario: app instalada, cl.android detectado, consentimiento y acceso Android concedidos, servicio conectado. Primera compra nueva recibida y reconocida con campos coincidentes en dos capturas; falta cobertura de otros avisos y comportamiento prolongado. Lint: cero errores, una advertencia ObsoleteSdkInt por carpeta vacía; limpieza/repetición rechazadas por revisión automática sin motivo adicional.
- Usuario confirma captura automática funcionando y aporta pantalla real de confirmación. Ajustes solicitados verificados en UI ficticia; falta probar esta nueva UI en su navegador móvil. Se conservan pendientes de negativos auténticos, reinicio y comportamiento prolongado.
- Google vinculado y envío autorizado mostrados físicamente en S24; posteriormente el usuario confirma detección funcionando y muestra aviso en revisión web. No volver a pedir login ni instalación. Diagnóstico separado; no se certifica identidad bancaria global por esta positiva.
- Lint Android sin errores, con advertencias de dependencias/estilo y un detector heurístico de Google ID cuyo parseo se realiza en vincular(). No se declara revisión visual ni entrega real del APK conectado.

## Próximos pasos en orden de prioridad


## Instrucciones concretas para retomar

- PRIORIDAD 2026-10-21: completar y verificar ajustes de confirmación solicitados antes de continuar otras funcionalidades. Bloque ejecutado y verificado; conservar el resto del roadmap y sus límites, sin adelantar etapas.
- REANUDADO el 2026-10-21 por solicitud explícita del usuario. Continuar tareas verificables y conservar estado tras cada bloque.
- Worktree: outputs/tarjeta en la carpeta de esta conversación; rama codex/compras-falabella. Leer ROADMAP.md y ESTADO_PROYECTO.md; comprobar git status, diff y log antes de editar.
- Base vigente: 65/100 puntos, 88 Node; 16 SDK/emulador y 43 Android aprobadas en la entrega anterior. El ajuste UI no cambia reglas ni APK. Leer evidencia y límites antes de declarar soporte integral.
- Google y consentimiento físico ya confirmados; el usuario declara detección funcionando y aporta revisión web. No pedir otra vez el mismo login o compra. Esta entrega se limita a simplificar confirmación; esperar su revisión de la interfaz antes de retomar otras funcionalidades.
- Recargar PWA para cuotas-v20: fecha e importe precargados editables, tarjeta Papá si existe, una persona por defecto y reparto múltiple desplegable. Cuotas/modalidad siguen explícitas; total con intereses y reparto exacto obligatorios. No reinstalar APK por este cambio.
- Datos confirmados: Samsung Galaxy S24; Banco Falabella Chile de ficha Google Play cl.android. Captura positiva transcrita de forma anonimizada en docs/FORMATO_NOTIFICACION.md. Faltan Android/One UI exactos, extras de notificación y muestras negativas auténticas.
- SDK API 35, Build Tools 35.0.0, Platform Tools y Gradle instalados fuera del repo en work/herramientas con aceptación explícita del titular; sin PATH global. APK debug en outputs/apk; guía android/PRUEBA_S24.md. No hay teléfono conectado por ADB. La captura del usuario verifica instalación, autorización y conexión mostradas en S24; dos capturas posteriores verifican recepción y reconocimiento de una compra nueva con campos coincidentes.
- JS y Kotlin comparten corpus v2 de 24 casos. Diagnóstico conserva resultados en RAM; conectada solo persiste/envía con cuenta y consentimiento separado. Validación integral y formato adicional físicos pendientes; no confundir la primera positiva diagnóstica con envío conectado.
- Registrar tarea y archivos previstos antes de un bloque extenso; actualizar JSON y regenerar vistas al cerrarlo. No subir commits, desplegar reglas ni tocar datos reales sin autorización.
- Ejecutar npm run roadmap y abrir http://127.0.0.1:8767/docs/seguimiento/roadmap.html para seguimiento en vivo; Ctrl+C cierra el servidor. También abre como archivo local con snapshot, que requiere reabrir tras regenerar.
- Firebase CLI quedó autenticada mediante acceso completado por el titular. La sesión no autoriza despliegues ni cambios financieros. La auditoría de reglas terminó; no volver a pedir login salvo que caduque o falten permisos.

La persistencia es el repositorio, no el chat, el almacenamiento del navegador ni una promesa de detectar créditos. Si la sesión se corta durante una edición, revisar el diff y regenerar antes de confiar en las vistas. Las operaciones Git remotas y el despliegue requieren autorización explícita.
