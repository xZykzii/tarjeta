# Inspección inicial — 2026-10-21

Base local comprobada: `58ebee8`, idéntica a `origin/main` tras `git fetch`. Inspección deliberadamente limitada a planificar. El worktree de esta entrega usa la rama `codex/compras-falabella`. No se modificó ni consultó información financiera de producción.

| Área | Evidencia | Implicación |
| --- | --- | --- |
| Tecnología | `index.html`, `manifest.json`, `sw.js` | PWA sin framework ni build obligatorio. |
| Arquitectura | `index.html`, `logic.mjs`, `pdf-export.mjs`, `tests/`, `docs/specs/` | Conservar módulos puros, UI monolítica y herramientas Node existentes. No existe grafo Graphify en este checkout. |
| Autenticación | imports Firebase JS 10.12.0; `signInWithPopup`, GoogleAuthProvider, `onAuthStateChanged` | Android debe iniciar sesión en el mismo proyecto y obtener el mismo UID; no pedir credenciales bancarias. |
| Firestore | `save()` y `loadData()` | Un documento `users/{uid}` con arrays de compras, personas, tarjetas, saldos e historial. `getDoc`/`setDoc({merge:true})`; sin suscripción. |
| Compras | `agregarItem()`, `recalcItem()` | `monto` significa cuota, `totales` cantidad, `pagadas` y `abonado` representan pagos. `total` se deriva y no se persiste en `save()`. |
| Cálculos | `estadoPago()`, `pagadoDe()`, `logic.mjs` | Todas las cuotas tienen el mismo valor; introducir un total dividido con redondeo rompería el contrato. Auditar pagos, deshacer y PDF juntos. |
| Calendario | `DIA_FACTURACION`, `DIA_PAGO`, `vencimientoCuota()` | Cierre día 10 y vencimiento día 25; preservar la regla y las fechas históricas. |
| Persistencia | `save()` selecciona explícitamente campos | Añadir origen o identificadores solo a los objetos en memoria los perdería al guardar. |
| Concurrencia | arrays completos en `setDoc`, sin versión | Una confirmación transaccional aislada no basta: un guardado antiguo podría sobrescribirla. Resolver el escritor legado antes de habilitar confirmaciones. |
| Backups y PDF | JSON v6; reportes individuales y generales | Mantener importación antigua; incluir planes y origen nuevos sin filtrar información de terceros en PDF individual. |
| PWA | caché `cuotas-v15` | Cambiar versión junto con cualquier recurso funcional de la PWA. El seguimiento queda fuera del SW y de la navegación de la app. |
| Seguridad | no hay reglas de Firestore versionadas | No se conocen las reglas desplegadas; validar en emulador y auditar antes de cualquier despliegue. |

Funciones que conservar: personas y tarjetas, altas manuales, pagos completos y parciales, deshacer, saldos, historial, agenda, filtros, temas, PDF, backups, sesión y sincronización.

Restricciones por investigar tras crear el roadmap: una web no tiene permiso Android para escuchar otras apps; un listener nativo requiere consentimiento en Ajustes, paquete emisor auténtico, tratamiento de repeticiones/agrupaciones y pruebas físicas. No se conoce el texto real ni se presupone el número de cuotas en la notificación.

El plan y sus criterios están en `docs/seguimiento/plan.json`. Esta inspección no certifica integridad de producción ni funcionamiento Android.
