<!-- GENERADO: editar docs/seguimiento/plan.json y ejecutar node scripts/seguimiento.mjs -->
# Roadmap — Compras automáticas de Banco Falabella

Actualizado: 2026-10-21. Base: `58ebee85df3acf3b942f3ade944b40b63aa82af9`.

**Avance global: 65% (65/100 puntos verificados).**

**Tarea actual: 2.4 — Vinculación Firebase y sincronización.**

[Abrir roadmap visual](docs/seguimiento/roadmap.html) · [Estado para continuar](ESTADO_PROYECTO.md)

## Cómo se mide y actualiza

Solo las tareas completadas con criterio verificado y evidencia suman su peso. En curso suma cero hasta verificarse. El porcentaje mide aceptación, no tiempo transcurrido ni restante. El Gantt muestra orden lógico, no fechas estimadas. En espera indica dependencias pendientes; bloqueada indica un impedimento registrado.

Vista en vivo: ejecutar `npm run roadmap` y abrir http://127.0.0.1:8767/docs/seguimiento/roadmap.html. Consulta plan.json cada 3 segundos y conserva filtros/selección. El HTML también contiene un snapshot para abrirlo sin servidor; ese modo requiere reabrir tras regenerar.

Editar la fuente única `docs/seguimiento/plan.json`. Registrar pruebas, archivos, decisiones y la tarea siguiente. Ejecutar `node scripts/seguimiento.mjs` y después `node scripts/seguimiento.mjs --check`. No editar las vistas generadas. Revisar el diff y hacer commits pequeños sin publicar.

## Fase 0 — Plan y continuidad · 100%

Aceptación: 8/8 puntos.

ID | Tarea | Estado efectivo | Peso | Dependencias | Criterio de finalización | Evidencia
--- | --- | --- | --- | --- | --- | ---
0.1 | Inspección inicial del repositorio | completada | 2 pt | — | Identificar stack, datos, cálculos y riesgos sin modificar la PWA. | docs/INSPECCION_INICIAL.md; base 58ebee8
0.2 | Plan verificable y documentos de recuperación | completada | 2 pt | 0.1 | JSON validado y dos Markdown generados con criterios, dependencias y siguiente tarea. | ROADMAP.md y ESTADO_PROYECTO.md generados desde plan.json; validación de pesos y dependencias aprobada.
0.3 | Roadmap visual local | completada | 2 pt | 0.2 | Gantt oscuro accesible, fases plegables, filtros y porcentajes desde el JSON. | HTML abierto en navegador local; Gantt y fases renderizados. Sin dependencias externas.
0.4 | Verificar regeneración y persistencia | completada | 2 pt | 0.3 | Abrir HTML, probar controles y comprobar que regenerar conserva el estado. | Generación + --check aprobados; navegador verificó plegado, expansión, búsqueda y progreso tras recarga. JSON persistido en disco.

## Fase 1 — Arquitectura de la integración · 83.3%

Aceptación: 10/12 puntos.

ID | Tarea | Estado efectivo | Peso | Dependencias | Criterio de finalización | Evidencia
--- | --- | --- | --- | --- | --- | ---
1.1 | Investigar Android y Firebase | completada | 3 pt | 0.4 | Documentación oficial vigente, límites y alternativas contrastadas. | docs/ADR-001-compras-android.md: fuentes oficiales Android/Firebase consultadas el 2026-10-21.
1.2 | Decidir arquitectura y modelo de datos | completada | 4 pt | 1.1 | ADR, contrato de pendientes, aislamiento por UID e idempotencia documentados. | ADR-001: listener nativo, cola Room/WorkManager, UID, pendientes aislados y confirmación transaccional; contrato v1.
1.3a | Documentar formato positivo auténtico | completada | 1 pt | 1.1 | Transcribir estructura comprobada sin publicar datos financieros y distinguir recepción de fecha bancaria. | docs/FORMATO_NOTIFICACION.md: captura positiva revisada; estructura anonimizada y campos ausentes documentados.
1.3 | Verificar paquete emisor y ejemplos negativos reales | bloqueada | 2 pt | 1.1 | packageName verificado y muestras de pago/devolución/publicidad auténticas; confirmar contenido accesible en Android. | App cl.android instalada y primera recepción/normalización real en S24 verificadas mediante capturas del banco y diagnóstico. Faltan negativos auténticos, distribución de extras y actualizaciones; tarea incompleta.
1.4 | Plan de compatibilidad y validación | completada | 2 pt | 1.2 | Cubrir arrays legados, cuotas variables, backup, caché, concurrencia y dispositivo real. | docs/VALIDACION_COMPRAS.md y ADR-001: matriz de 14 casos, compatibilidad, escritor legado y permisos.

## Fase 2 — Captura Android · 26.7%

Aceptación: 4/15 puntos.

ID | Tarea | Estado efectivo | Peso | Dependencias | Criterio de finalización | Evidencia
--- | --- | --- | --- | --- | --- | ---
2.1 | App complementaria y permisos explícitos | completada | 4 pt | 1.2 | Proyecto Android separado, listener real, filtro por paquete verificado y autorización transparente. | android/: listener nativo protegido, filtro cl.android instalado y consentimiento separado de Ajustes. APK debug compilado y firma verificada; 19 pruebas JVM + 3 Robolectric aprobadas. Sin Internet/Firebase/deuda; prueba física S24 pendiente. android/README.md y PRUEBA_S24.md.
2.2 | Analizador de notificaciones auténticas | en_espera | 4 pt | 1.3, 2.1 | Extraer solo compras verificadas; desconocidos no generan transacciones. | Puerto conservador Kotlin con corpus compartido y primera compra real reconocida en S24. No completa: depende de 1.3 y sus negativos auténticos pendientes.
2.3 | Cola persistente y deduplicación | en_espera | 4 pt | 2.2 | Persistencia mínima, reintentos y deduplicación sin fusionar compras legítimas iguales. | Room por UID, identidad local persistente, tombstones sin datos financieros tras envío y WorkManager implementados y probados. No completa: faltan negativos/actualizaciones auténticas y referencia para certificar deduplicación bancaria entre dispositivos.
2.4 | Vinculación Firebase y sincronización | en_espera | 3 pt | 2.3, 6.1 | Sesión del mismo UID; envío seguro e idempotente validado con reglas. | Variante cl.controlcuotas.companion.sync compilada, con Google Auth, consentimiento de envío y SDK configurado. App y huellas registradas en Firebase; sin reglas/PWA desplegadas ni sesión/envío físico del S24 verificados.

## Fase 3 — Compras sin asignar · 100%

Aceptación: 15/15 puntos.

ID | Tarea | Estado efectivo | Peso | Dependencias | Criterio de finalización | Evidencia
--- | --- | --- | --- | --- | --- | ---
3.1 | Contrato y validación de pendientes | completada | 3 pt | 1.2 | Estados, campos, importes y transiciones validados sin tocar saldos. | compras-pendientes.mjs: contrato mínimo, estados, validaciones e identidad estable; pruebas aprobadas.
3.2 | Bandeja web y contador en vivo | completada | 4 pt | 3.1, 6.1 | Suscripción aislada por UID, lista editable, errores visibles y cancelación al salir. | Suscripción limitada por UID, metadatos de caché, contador y errores visibles; cancelación al salir y callbacks tardíos aislados. Node y UI ficticia aprobadas. docs/BANDEJA_COMPRAS.md.
3.3 | Confirmación atómica y descarte | completada | 3 pt | 3.2, 4.3, 5.1 | Una transacción consume un pendiente exactamente una vez y conserva descartes. | resolverCompraRemota crea recibo inmutable, añade participaciones y resuelve pendiente en una transacción; descarte terminal sin deuda. 16 pruebas Firestore/emulador, incluidas concurrencia e idempotencia.
3.4 | Personas, tarjetas y revisión | completada | 2 pt | 3.2, 4.1 | Seleccionar entidades existentes y corregir datos sin afectar deuda hasta confirmar. | Revisión permite descripción, fecha explícita, personas/tarjeta existentes y modalidades; revalida catálogos dentro de transacción. Original bancario conservado, errores no generan deuda.
3.5 | Repartir una compra entre varias personas | completada | 3 pt | 3.4, 4.5, 5.2 | Importes libres por persona o reparto igual; suma exacta, edición, confirmación atómica y saldos sin duplicar la compra. | Edición del reparto completo antes de confirmar, importes libres/iguales y previsualización por persona/mes. UI ficticia 700/300 y 500/500; grupo atómico conserva suma y saldos. Edición financiera posterior a pagos protegida.

## Fase 4 — Modalidades y pesos exactos · 100%

Aceptación: 12/12 puntos.

ID | Tarea | Estado efectivo | Peso | Dependencias | Criterio de finalización | Evidencia
--- | --- | --- | --- | --- | --- | ---
4.1 | Motor de planes de cuotas | completada | 3 pt | 1.2 | Una cuota, división exacta en CLP, interés manual y cuotas individuales válidas. | planes-cuotas.mjs: modalidades, planes variables y adaptador legado sin mutación; pruebas aprobadas.
4.2 | Pruebas de redondeo y límites | completada | 2 pt | 4.1 | Suma exacta, enteros seguros, validación de importes y compatibilidad documentada. | tests/compras.test.mjs: residuos exhaustivos, abonos, límites y overflow; 28/28 pruebas globales aprobadas.
4.3 | Unificar cálculo manual y automático | completada | 3 pt | 4.2, 5.1 | Abonos, vencimientos, pagos, deshacer, PDF y resumen usan una lógica común. | cuotas-item.mjs conectado a pagos/abonos/deshacer, calendario, resúmenes y reportes. 49 pruebas Node; UI ficticia 34/33/33, reparto 700/300, pago/deshacer exacto. docs/CUOTAS_EXACTAS.md.
4.4 | Formulario de modalidades | completada | 2 pt | 4.3 | Previsualización explícita y sin tasas inferidas, incluso con cuotas diferentes. | ui-plan-cuotas.mjs y alta manual conectados. Cuatro modalidades previsualizadas en UI; alta 34/33/33, cancelación sin deuda y cuota única pagada/editada verificadas. 53 pruebas Node; caché v18.
4.5 | Motor de reparto exacto entre personas | completada | 2 pt | 4.2 | Distribución igual o por importes libres; cuotas por persona conservan totales por fila y columna incluso con redondeo e interés. | reparto-compras.mjs: importes libres/iguales y matriz exacta por persona/mes; barrido exhaustivo y enteros grandes aprobados.

## Fase 5 — Compatibilidad de la PWA · 100%

Aceptación: 12/12 puntos.

ID | Tarea | Estado efectivo | Peso | Dependencias | Criterio de finalización | Evidencia
--- | --- | --- | --- | --- | --- | ---
5.1 | Resolver concurrencia del documento legado | completada | 4 pt | 1.4 | Guardados no pierden compras confirmadas, pagos ni cambios de otro dispositivo. | save/load conectados a CAS real, cola y recuperación de borrador; 32 pruebas Node + 9 Firestore/emulador y flujo UI ficticio aprobados. docs/GUARDADO_SEGURO.md; reglas no desplegadas.
5.2 | Origen, identificadores y backups | completada | 3 pt | 5.1 | Persistir origen/ID/planes sin romper importación de backups v6 ni datos antiguos. | datos-compras.mjs conserva ID/origen/plan/grupo en save y backup v7; v6/legado probado. Backup descargado por UI y restaurado con IDs, pagos, cuotas y saldo verificados.
5.3 | Integrar registro manual, resúmenes y PDF | completada | 3 pt | 4.3, 5.2 | Mismos cálculos y resultados para registro manual y automático. | PWA y logic usan adaptador común; PDF personal/general generados en UI, texto comprobado y páginas renderizadas sin cortes. Personal solo muestra participación propia; registro histórico mantiene fórmulas.
5.4 | Caché, cierre de sesión y regresión | completada | 2 pt | 5.3, 3.3 | Bump del SW y limpieza de suscripciones; funciones previas comprobadas. | SW v19 incluye bandeja y sus dependencias. 84 Node y 16 emulador; UI ejecutó confirmación, descarte, caché/error/recuperación y logout. Suscripciones/diálogos se cancelan al cambiar sesión. Sin despliegue.

## Fase 6 — Seguridad y confiabilidad · 33.3%

Aceptación: 4/12 puntos.

ID | Tarea | Estado efectivo | Peso | Dependencias | Criterio de finalización | Evidencia
--- | --- | --- | --- | --- | --- | ---
6.1 | Reglas y pruebas de aislamiento | completada | 4 pt | 1.2 | Emulador deniega acceso cruzado/anónimo y mutaciones inválidas; reglas vigentes auditadas. | 9 pruebas SDK/emulador aprobadas en entrega previa. Reglas vigentes auditadas el 2026-10-21 mediante GET autenticado de release/ruleset, hash documentado en docs/AUDITORIA_REGLAS.md; sin leer documentos, escribir ni desplegar. Reglas finales de confirmación pendientes.
6.2 | Recuperación offline y entre dispositivos | en_espera | 3 pt | 2.4, 3.3 | Reintentos, sesión revocada y concurrencia sin duplicados ni pérdida. | Pendiente
6.3 | Minimización y ciclo de vida | en_espera | 2 pt | 2.3, 3.1 | No guardar texto bancario bruto, secretos ni números completos; desconexión y borrado seguros. | Pendiente
6.4 | Verificación de permisos en Android real | en_espera | 3 pt | 2.4 | Revocar acceso, reiniciar, reconectar y verificar restricciones del fabricante. | Pendiente

## Fase 7 — Validación de extremo a extremo · 0%

Aceptación: 0/10 puntos.

ID | Tarea | Estado efectivo | Peso | Dependencias | Criterio de finalización | Evidencia
--- | --- | --- | --- | --- | --- | ---
7.1 | Suite automática de dominio e integración | en_espera | 3 pt | 5.4, 6.2 | Los 14 casos solicitados están trazados; pasar pruebas de reglas y concurrencia. | Pendiente
7.2 | Pruebas UI escritorio y móvil | pendiente | 2 pt | 5.4 | Revisar bandeja, asignación, errores, confirmación y cálculos sin datos reales. | Pendiente
7.3 | Compra auténtica y segundo plano | en_espera | 3 pt | 1.3, 6.4, 7.1 | Dispositivo real detecta, sincroniza con web cerrada y confirma una vez. | Pendiente
7.4 | Auditar integridad y regresiones | en_espera | 2 pt | 7.2, 7.3 | Datos existentes y deudas no cambian salvo confirmación explícita; informe de pruebas. | Pendiente

## Fase 8 — Entrega y continuidad · 0%

Aceptación: 0/4 puntos.

ID | Tarea | Estado efectivo | Peso | Dependencias | Criterio de finalización | Evidencia
--- | --- | --- | --- | --- | --- | ---
8.1 | Guías de instalación y recuperación | en_espera | 2 pt | 7.1 | Configuración Android/Firebase, permisos, respaldo, reversión y límites reproducibles. | Pendiente
8.2 | Entrega verificada y roadmap final | en_espera | 2 pt | 8.1, 7.4 | Abrir/ejecutar artefactos, registrar pendientes reales y conservar seguimiento. | Pendiente

## Problemas y dependencias externas

- Captura positiva revisada. Usuario confirma Samsung Galaxy S24 y ficha oficial Banco Falabella Chile (paquete cl.android). Faltan versión Android, extras reales y muestras negativas auténticas.
- Reglas vigentes auditadas solo por lectura; el contrato nuevo de revisión y pendientes requiere despliegue coordinado posterior. No se escribió en producción.
- Guardado protegido localmente con CAS y revisión; falta desplegar coordinadamente las reglas para bloquear clientes antiguos en producción. No publicar solo la PWA.
- La revisión automática rechazó iniciar el servidor localhost sin motivo adicional; no se pudo restaurar la URL en esta sesión. Servidor probado en puerto efímero; el usuario puede iniciarlo con npm run roadmap.
- Captura del S24 aportada por el usuario: app instalada, cl.android detectado, consentimiento y acceso Android concedidos, servicio conectado. Primera compra nueva recibida y reconocida con campos coincidentes en dos capturas; falta cobertura de otros avisos y comportamiento prolongado. Lint: cero errores, una advertencia ObsoleteSdkInt por carpeta vacía; limpieza/repetición rechazadas por revisión automática sin motivo adicional.
- Bandeja/confirmación/reparto implementados y probados solo localmente. La PWA pública, sus reglas y el APK de diagnóstico siguen sin sincronización nueva. No desplegar sin autorización.
- Cliente Android y huellas ya registrados; SDK/OAuth guardados solo en configuración local ignorada por Git. Falta completar Google personalmente en S24, validar UID y envío, y autorizar publicación coordinada de web/reglas. El APK de diagnóstico sigue separado.
- Lint Android sin errores, con advertencias de dependencias/estilo y un detector heurístico de Google ID cuyo parseo se realiza en vincular(). No se declara revisión visual ni entrega real del APK conectado.

## Funcionalidades completadas

- 0.1 Inspección inicial del repositorio: docs/INSPECCION_INICIAL.md; base 58ebee8
- 0.2 Plan verificable y documentos de recuperación: ROADMAP.md y ESTADO_PROYECTO.md generados desde plan.json; validación de pesos y dependencias aprobada.
- 0.3 Roadmap visual local: HTML abierto en navegador local; Gantt y fases renderizados. Sin dependencias externas.
- 0.4 Verificar regeneración y persistencia: Generación + --check aprobados; navegador verificó plegado, expansión, búsqueda y progreso tras recarga. JSON persistido en disco.
- 1.1 Investigar Android y Firebase: docs/ADR-001-compras-android.md: fuentes oficiales Android/Firebase consultadas el 2026-10-21.
- 1.2 Decidir arquitectura y modelo de datos: ADR-001: listener nativo, cola Room/WorkManager, UID, pendientes aislados y confirmación transaccional; contrato v1.
- 1.3a Documentar formato positivo auténtico: docs/FORMATO_NOTIFICACION.md: captura positiva revisada; estructura anonimizada y campos ausentes documentados.
- 1.4 Plan de compatibilidad y validación: docs/VALIDACION_COMPRAS.md y ADR-001: matriz de 14 casos, compatibilidad, escritor legado y permisos.
- 2.1 App complementaria y permisos explícitos: android/: listener nativo protegido, filtro cl.android instalado y consentimiento separado de Ajustes. APK debug compilado y firma verificada; 19 pruebas JVM + 3 Robolectric aprobadas. Sin Internet/Firebase/deuda; prueba física S24 pendiente. android/README.md y PRUEBA_S24.md.
- 3.1 Contrato y validación de pendientes: compras-pendientes.mjs: contrato mínimo, estados, validaciones e identidad estable; pruebas aprobadas.
- 3.2 Bandeja web y contador en vivo: Suscripción limitada por UID, metadatos de caché, contador y errores visibles; cancelación al salir y callbacks tardíos aislados. Node y UI ficticia aprobadas. docs/BANDEJA_COMPRAS.md.
- 3.3 Confirmación atómica y descarte: resolverCompraRemota crea recibo inmutable, añade participaciones y resuelve pendiente en una transacción; descarte terminal sin deuda. 16 pruebas Firestore/emulador, incluidas concurrencia e idempotencia.
- 3.4 Personas, tarjetas y revisión: Revisión permite descripción, fecha explícita, personas/tarjeta existentes y modalidades; revalida catálogos dentro de transacción. Original bancario conservado, errores no generan deuda.
- 3.5 Repartir una compra entre varias personas: Edición del reparto completo antes de confirmar, importes libres/iguales y previsualización por persona/mes. UI ficticia 700/300 y 500/500; grupo atómico conserva suma y saldos. Edición financiera posterior a pagos protegida.
- 4.1 Motor de planes de cuotas: planes-cuotas.mjs: modalidades, planes variables y adaptador legado sin mutación; pruebas aprobadas.
- 4.2 Pruebas de redondeo y límites: tests/compras.test.mjs: residuos exhaustivos, abonos, límites y overflow; 28/28 pruebas globales aprobadas.
- 4.3 Unificar cálculo manual y automático: cuotas-item.mjs conectado a pagos/abonos/deshacer, calendario, resúmenes y reportes. 49 pruebas Node; UI ficticia 34/33/33, reparto 700/300, pago/deshacer exacto. docs/CUOTAS_EXACTAS.md.
- 4.4 Formulario de modalidades: ui-plan-cuotas.mjs y alta manual conectados. Cuatro modalidades previsualizadas en UI; alta 34/33/33, cancelación sin deuda y cuota única pagada/editada verificadas. 53 pruebas Node; caché v18.
- 4.5 Motor de reparto exacto entre personas: reparto-compras.mjs: importes libres/iguales y matriz exacta por persona/mes; barrido exhaustivo y enteros grandes aprobados.
- 5.1 Resolver concurrencia del documento legado: save/load conectados a CAS real, cola y recuperación de borrador; 32 pruebas Node + 9 Firestore/emulador y flujo UI ficticio aprobados. docs/GUARDADO_SEGURO.md; reglas no desplegadas.
- 5.2 Origen, identificadores y backups: datos-compras.mjs conserva ID/origen/plan/grupo en save y backup v7; v6/legado probado. Backup descargado por UI y restaurado con IDs, pagos, cuotas y saldo verificados.
- 5.3 Integrar registro manual, resúmenes y PDF: PWA y logic usan adaptador común; PDF personal/general generados en UI, texto comprobado y páginas renderizadas sin cortes. Personal solo muestra participación propia; registro histórico mantiene fórmulas.
- 5.4 Caché, cierre de sesión y regresión: SW v19 incluye bandeja y sus dependencias. 84 Node y 16 emulador; UI ejecutó confirmación, descarte, caché/error/recuperación y logout. Suscripciones/diálogos se cancelan al cambiar sesión. Sin despliegue.
- 6.1 Reglas y pruebas de aislamiento: 9 pruebas SDK/emulador aprobadas en entrega previa. Reglas vigentes auditadas el 2026-10-21 mediante GET autenticado de release/ruleset, hash documentado en docs/AUDITORIA_REGLAS.md; sin leer documentos, escribir ni desplegar. Reglas finales de confirmación pendientes.

## Funcionalidades pendientes

- 1.3 Verificar paquete emisor y ejemplos negativos reales (bloqueada)
- 2.2 Analizador de notificaciones auténticas (en_espera)
- 2.3 Cola persistente y deduplicación (en_espera)
- 2.4 Vinculación Firebase y sincronización (en_espera)
- 6.2 Recuperación offline y entre dispositivos (en_espera)
- 6.3 Minimización y ciclo de vida (en_espera)
- 6.4 Verificación de permisos en Android real (en_espera)
- 7.1 Suite automática de dominio e integración (en_espera)
- 7.2 Pruebas UI escritorio y móvil (pendiente)
- 7.3 Compra auténtica y segundo plano (en_espera)
- 7.4 Auditar integridad y regresiones (en_espera)
- 8.1 Guías de instalación y recuperación (en_espera)
- 8.2 Entrega verificada y roadmap final (en_espera)

## Esfuerzo restante

Sin estimación fiable: depende del formato auténtico, configuración de Firebase y validación física Android. Los pesos no son horas.
