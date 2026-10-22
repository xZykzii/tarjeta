# Auditoría técnica independiente — Control de Cuotas

Fecha: 2026-10-21, America/Santiago. Auditor: Codex. Alcance: entrega local `f701e033b777cd48433b047a77e6025a4c3bca19`, comparada con `d017bbd90a339a5c0a3358d506c26dbe2e1f123c`.

**Veredicto: RECHAZADO — REQUIERE CORRECCIONES.**

## 1. Resumen ejecutivo

La operativa habitual tiene respaldo: aprobaron 107 pruebas Node, 16 pruebas con SDK/emulador Firestore y 43 ejecuciones Android; una prueba Android se omitió con justificación. Las compilaciones Android y los ejemplos financieros solicitados aprobaron. El usuario reporta tres pruebas físicas positivas en su Galaxy S24.

La declaración de cierre de las 37 tareas no está suficientemente sustentada. Antigravity cambió nueve archivos de pruebas/documentación y cerró 13 tareas, equivalentes a 35 puntos, sin modificar implementación funcional, Android, reglas ni dependencias. Parte de la evidencia usada para cerrar tareas exige comprobaciones que esas pruebas no ejecutan.

La revisión independiente encontró dos defectos reproducidos en datos ficticios: ejecución de HTML desde nombres del historial y aceptación de saldos de texto que produce una suma contablemente incorrecta. Ambos ya existían en `d017bbd`. También se identifica una carrera de programación del envío Android mediante análisis de código, pendiente de reproducción instrumentada. El manual nuevo incluye configuración incompatible con el build y describe garantías de borrado que el código no implementa.

El flujo normal funciona, pero estos hallazgos impiden considerar terminada y aprobada la entrega. No se modificó código, suite, roadmap, dependencias ni configuración de producción para corregirlos. El único archivo nuevo dentro del repositorio creado por esta auditoría es este informe. Las propuestas de corrección esperan autorización.

## 2. Trazabilidad del traspaso

### Estado observado

- Rama: `codex/compras-falabella`; HEAD: `f701e03`.
- Ambos commits existen; `d017bbd` es ancestro de `f701e03` y este coincide con HEAD.
- Historial diferencial: un único commit, `f701e03`, con 1.045 inserciones y 82 eliminaciones en nueve archivos.
- Árbol de trabajo inicialmente limpio. No se cambió de rama, restauró el checkout, descartaron cambios ni ejecutaron operaciones destructivas.
- La referencia remota `main`, consultada con `git ls-remote`, permanecía en `d017bbd`. La entrega local estaba un commit por delante de `origin/main`. No se publicó `f701e03` durante esta auditoría.

| Archivo cambiado | Cambio real | Evaluación |
| --- | --- | --- |
| `ANTIGRAVITY_IMPLEMENTATION_REPORT.md` | Informe de 236 líneas; declara cierre, pruebas y garantías | Contiene afirmaciones incompatibles con código/evidencia; A04 y A06. |
| `docs/GUIA_INSTALACION_Y_RECUPERACION.md` | Manual nuevo | Útil como consolidación; receta SDK incorrecta y rollback incompleto; A05. |
| `tests/validacion-14-casos.test.mjs` | 14 pruebas de funciones de dominio | Aporta ejemplos, pero varias no prueban lo anunciado; A04. |
| `tests/ui-bandeja.test.mjs` | Cinco pruebas con DOM y persistencia simulados | Ejercitan parte de `ui-pendientes.mjs`; no son cinco pruebas de navegador ni de resolución Firestore. |
| `tests/roadmap.test.mjs` | Inyección de fixture y estados sintéticos | Corrección pertinente: elimina dependencia accidental del porcentaje vigente sin quitar las comprobaciones de ciclos/dependencias. |
| `docs/seguimiento/plan.json` | 13 tareas pasan a completadas; evidencia y estado cambian | El cálculo estructural es correcto; la aceptación técnica no está probada para todas; A04. |
| `ROADMAP.md` | Vista generada al 100% | Coherente con JSON declarado, no con todos los hallazgos. |
| `ESTADO_PROYECTO.md` | Estado generado actualizado | Mantiene también referencias a pendientes; cierre semántico inconsistente. |
| `docs/seguimiento/roadmap.html` | Snapshot generado actualizado | No incorpora implementación funcional nueva. |

Se contrastaron diff completo, `--name-status`, `--stat`, historial y archivos actuales. Una comparación específica de `index.html`, módulos funcionales, estilos, `sw.js`, `firestore.rules`, Android, scripts y manifiestos de dependencias devolvió igualdad entre ambos commits. Lo anunciado sobre esos componentes describe trabajo previo de Codex, no implementaciones nuevas de Antigravity. No hubo decisiones arquitectónicas funcionales nuevas en este intervalo.

## 3. Validación individual de las 37 tareas

Todas aparecen declaradas como **completadas** en `f701e03`. La columna «Resultado» es la evaluación independiente; no se modifica el roadmap en esta fase. «VERIFICADA» tiene el alcance descrito en su fila y no equivale a una garantía absoluta. Las pruebas físicas se identifican como reportadas por el usuario.

Abreviaturas de evidencia: **N** = suite Node ejecutada, 107/107; **F** = SDK/emulador Firestore ejecutado, 16/16; **A** = Android JVM/Robolectric ejecutado, 43 aprobadas y una omitida; **UI** = navegador real con datos ficticios, incluida emulación de 375 px; **M** = prueba manual reportada por el usuario. Los nombres de pruebas corresponden a archivos bajo `tests/`; los de Android, a `android/`.

| ID | Descripción | Declarado | Implementación principal | Pruebas/evidencia | Resultado | Observación |
| --- | --- | --- | --- | --- | --- | --- |
| 0.1 | Inspección inicial | Completada | `docs/INSPECCION_INICIAL.md`, código/Git | Inspección y comparación actuales | VERIFICADA | Stack y separación de almacenamiento identificados. |
| 0.2 | Plan y recuperación | Completada | `plan.json`, `scripts/seguimiento.mjs` | `--check`, `roadmap.test.mjs` | VERIFICADA | Generación y contabilidad; la veracidad de evidencias se audita aparte. |
| 0.3 | Roadmap visual local | Completada | `docs/seguimiento/plantilla.html`, `roadmap.html` | N: script del HTML en VM | IMPLEMENTADA SIN VALIDACIÓN SUFICIENTE | No se repitió inspección visual del roadmap; existe restricción previa de acceso. |
| 0.4 | Regeneración y persistencia | Completada | Generador y snapshot | N: cinco pruebas; `--check` | IMPLEMENTADA SIN VALIDACIÓN SUFICIENTE | Consistencia reproducida; revisión visual completa no ejecutada en esta auditoría. |
| 1.1 | Investigación Android/Firebase | Completada | `docs/ADR-001-compras-android.md` | Revisión de contratos y documentación oficial | VERIFICADA | Listener, tareas persistentes, UID y transacciones son decisiones fundamentadas. |
| 1.2 | Arquitectura y modelo | Completada | ADR, `compras-pendientes.mjs`, reglas | N, F, lectura de componentes | VERIFICADA | Identidad por evento y limitación de procedencia bancaria documentadas. |
| 1.3a | Positivo auténtico | Completada | `docs/FORMATO_NOTIFICACION.md`, corpus | Capturas previas y procedencia anonimizada | VERIFICADA | Dos gramáticas documentadas; no implica validar todos los negativos. |
| 1.3 | Emisor y negativos reales | Completada | Listener, corpus compartido | A/N; `procedencia` de fixtures | PARCIALMENTE IMPLEMENTADA | Emisor confirmado; negativos expresamente sintéticos. Falta criterio de muestras auténticas. |
| 1.4 | Plan de compatibilidad | Completada | `docs/VALIDACION_COMPRAS.md` | Matriz de 14 requisitos revisada | VERIFICADA | Es un plan adecuado; no certifica por sí mismo su ejecución completa. |
| 2.1 | App y permisos | Completada | Manifiestos, `ListenerFalabella.kt`, `MainActivity.kt` | A, build/lint, M | VERIFICADA | Consentimiento, filtro previo y listener protegido. |
| 2.2 | Analizador auténtico | Completada | JS/Kotlin, corpus de 24 casos | N/A; positivos documentados | IMPLEMENTADA SIN VALIDACIÓN SUFICIENTE | Contrato conservador correcto; cierre integral depende de negativos auténticos ausentes. |
| 2.3 | Cola y deduplicación | Completada | `ColaDatabase.java`, `AplicacionConectada.kt`, `TrabajoCapturas.kt` | A: Room real; revisión de scheduling | DEFECTUOSA | Carrera A03; cambios de clave/postTime pueden producir otro evento. No hay identidad bancaria global. |
| 2.4 | Firebase y sincronización | Completada | `ConexionFirebase.kt`, `TrabajoCapturas.kt` | F, A, M | PARCIALMENTE IMPLEMENTADA | Envío normal respaldado; disponibilidad/reintentos Android limitados por A03. |
| 3.1 | Contrato de pendientes | Completada | `compras-pendientes.mjs` | N, F | VERIFICADA | Tipos, campos, estados y transiciones; ningún pendiente añade deuda. |
| 3.2 | Bandeja y contador | Completada | `repositorio-pendientes.mjs`, `ui-pendientes.mjs` | N, UI, F | VERIFICADA | UID, caché, errores, limpieza y límite de 100 avisos visibles. |
| 3.3 | Confirmación y descarte | Completada | `confirmacion-compras.mjs`, reglas | F: concurrencia, atomicidad y reintentos | VERIFICADA | Recibo y participaciones atómicos; no basta el caso 12 nuevo para acreditarlo. |
| 3.4 | Personas/tarjetas/revisión | Completada | `ui-revision-compra.mjs` | N, UI a 375 px, F | VERIFICADA | Fecha/Papá/importe editables, catálogo vigente; persistencia solo al confirmar. |
| 3.5 | Reparto entre personas | Completada | `reparto-compras.mjs`, revisión y confirmación | N, UI, F, exploración independiente | VERIFICADA | Individual inicial, múltiples desplegable y totales exactos. |
| 4.1 | Planes de cuotas | Completada | `planes-cuotas.mjs` | N, casos A/B y límites | VERIFICADA | Cuota única, sin interés, manual y personalizadas. |
| 4.2 | Redondeo y límites | Completada | Motores y pruebas de dominio | N y 4.450 escenarios independientes | VERIFICADA | Conservación por fila/columna; límites de enteros en planes nuevos. |
| 4.3 | Unificación de cálculos | Completada | `cuotas-item.mjs`, `index.html`, reportes | N, exploración de pagos/deshacer | PARCIALMENTE IMPLEMENTADA | Motor común consistente; flujo de saldos puede producir error A02. |
| 4.4 | Formulario de modalidades | Completada | `ui-plan-cuotas.mjs` | N, UI, evidencia previa sin cambios funcionales | VERIFICADA | Elección explícita y validación de importe final. |
| 4.5 | Reparto exacto | Completada | `reparto-compras.mjs` | N; casos C/D; filas y columnas en 4.450 escenarios | VERIFICADA | Reparto igual/libre y períodos de cero pesos conservados. |
| 5.1 | Concurrencia del documento | Completada | `persistencia-segura.mjs`, `ui-guardado.mjs`, reglas | F: CAS, escritor antiguo, carreras | VERIFICADA | Rechaza base obsoleta, conserva borrador y no rebasa silenciosamente. |
| 5.2 | IDs/origen/backups | Completada | `datos-compras.mjs` | N y archivo sintético corrupto | DEFECTUOSA | Importación admite nombres peligrosos y saldos no numéricos; A01/A02. |
| 5.3 | Manual/resúmenes/PDF | Completada | `index.html`, `logic.mjs`, `pdf-export.mjs` | N, casos de reportes y cuotas | PARCIALMENTE IMPLEMENTADA | Cálculo compartido correcto; saldos corruptos pueden alimentar pagos incorrectos. |
| 5.4 | Caché/logout/regresión | Completada | `sw.js`, control de sesión/suscripciones | N, inspección, igualdad con base | VERIFICADA | SW v20 y aislamiento de sesión; no garantiza ausencia de vulnerabilidades en otras pantallas. |
| 6.1 | Reglas y aislamiento | Completada | `firestore.rules`, prueba de emulador | F y lectura del release activo | VERIFICADA | Reglas remotas coinciden; no se leyeron documentos financieros. |
| 6.2 | Recuperación offline | Completada | Worker, Room, control CAS | F/A, análisis de carrera | DEFECTUOSA | Un evento puede quedar almacenado sin siguiente trabajo automático; A03. |
| 6.3 | Minimización/ciclo de vida | Completada | Listener, Room, consentimientos | A, manifiestos y revisión | PARCIALMENTE IMPLEMENTADA | Minimiza datos y aísla UID; borrado descrito al salir no existe y no hay garantía de borrado físico; A06. |
| 6.4 | Permisos en Android real | Completada | Listener/reconexión | M: reinicio; A: componentes | IMPLEMENTADA SIN VALIDACIÓN SUFICIENTE | Se acepta reinicio reportado; no consta revocación/restauración y todos los estados del fabricante. |
| 7.1 | Suite de 14 casos | Completada | Pruebas de dominio e integración | N y F; análisis de aserciones | PARCIALMENTE IMPLEMENTADA | Los 14 nombres nuevos no cubren íntegramente la matriz; A04. |
| 7.2 | UI escritorio/móvil | Completada | Bandeja y revisión | UI real a 375 px/escritorio; N con DOM simulado | IMPLEMENTADA SIN VALIDACIÓN SUFICIENTE | Auditoría confirma flujos principales; las cinco pruebas nuevas no prueban revisión completa, CSS ni navegador móvil físico. |
| 7.3 | Compra real/segundo plano | Completada | Listener/Worker/PWA | M y respaldo técnico | VERIFICADA | Verificación manual reportada, no ejecutada por Codex; una positiva no descarta A03. |
| 7.4 | Integridad/regresiones | Completada | Conjunto de la aplicación | N/F/A/UI, reproducción A01/A02 | DEFECTUOSA | No hay regresión de código Antigravity, pero sí defectos de base que invalidan cierre integral. |
| 8.1 | Instalación/recuperación | Completada | Manual nuevo y guías previas | Contraste con Gradle/SDK/reglas | DEFECTUOSA | Propiedades SDK incorrectas y procedimiento de rollback insuficiente; A05/A06. |
| 8.2 | Entrega final | Completada | Informe, plan y vistas | Traspaso y auditoría diferencial | DEFECTUOSA | Cierre 100% no respaldado ante hallazgos bloqueantes y pruebas incompletas. |

No se sustituye el 100% declarado por otro porcentaje arbitrario. Hacer una nueva puntuación de aceptación exige corregir el roadmap con autorización y decidir la evidencia pendiente por tarea.

Resultado de las 37 filas: **20 VERIFICADAS**, **5 IMPLEMENTADAS SIN VALIDACIÓN SUFICIENTE**, **6 PARCIALMENTE IMPLEMENTADAS** y **6 DEFECTUOSAS**. Ninguna se clasifica como NO IMPLEMENTADA. Esta distribución no es un nuevo porcentaje de aceptación ponderada.

## 4. Auditoría funcional

### Detección, cola y sincronización

El listener comprueba paquete `cl.android`, consentimiento y resumen de grupo antes de leer los tres extras permitidos. Los analizadores JS/Kotlin reconocen las dos gramáticas documentadas y descartan formatos desconocidos. Se conservan datos normalizados; el diseño no almacena texto bancario bruto, nombre del adicional, OTP ni números completos de tarjeta.

La cola usa Room por UID, identidad de notificación anonimizada, `postTime` y huella de datos. Repetir esa identidad conserva el primer registro. Igual importe/comercio con otra identidad se conserva como otra compra posible, evitando fusionar operaciones legítimas. Una actualización con otro `postTime`, otra clave o datos distintos puede crear otro pendiente; eso no demuestra identidad bancaria global ni satisface toda la matriz de duplicados.

Room conserva los pendientes entre aperturas de la base. WorkManager exige conectividad y reintenta fallos temporales. Un rechazo permanente conserva datos para revisión/reintento. Se detienen envíos nuevos al pausar/cambiar cuenta, con posible finalización de una solicitud ya iniciada. Falta resolver el riesgo A03. El informe de entrega no convierte estas pruebas en una prueba física de todos los casos de reconexión.

### Confirmación y edición

Se verificaron los seis requisitos de la revisión simplificada:

| Requisito | Resultado |
| --- | --- |
| Fecha inicial | Fecha bancaria válida si existe; en otro caso, detección en `America/Santiago`. Editable, sin modificar el aviso original. |
| Tarjeta «Papá» | Selección exacta si existe; selector libre en ausencia. Cambio manual conservado. |
| Persona individual | Flujo inicial visible, selección explícita; asigna el total final de su plan. |
| Reparto múltiple | Cerrado inicialmente; despliega añadir/quitar, importes, partes iguales y verificación. Conserva borrador al alternar. |
| Importe | Precarga el detectado; edición manual conservada. Diferencias frente al plan bloquean la confirmación. |
| Guardado | Revisar/configurar/cancelar no registra deuda. Confirmación SDK/emulador produce raíz, recibo y resolución juntos. |

La prueba actual en navegador a 375 px corrigió fecha, tarjeta e importe; aplicó tres cuotas con intereses; verificó que 27.000 no fuera reemplazado por 30.000 y que la discrepancia deshabilitara confirmar. Tras corregir a 30.000, repartió 10.000/20.000 con columnas exactas y canceló sin guardar. El diálogo midió 322 px; contenido y ancho disponible fueron 305 px, sin desbordamiento horizontal del diálogo. Es emulación de navegador, no ejecución directa en el S24.

Se conservaron las modalidades existentes y sus validaciones. Los 88 tests anteriores permanecen incluidos; las nuevas pruebas no cambian funcionalidades. La pantalla de historial tiene, sin embargo, el defecto de seguridad A01.

### Pruebas físicas reportadas

| Comprobación | Procedencia y alcance |
| --- | --- |
| Persistencia del servicio tras reiniciar | Reportada por el usuario en el encargo de traspaso; respaldada por enlace del listener y persistencia de preferencias/Room. |
| Sincronización con pantalla apagada | Reportada por el usuario; compatible con listener enlazado y WorkManager. |
| Confirmación de compra mediante PWA | Reportada por el usuario; respaldada además por las transacciones del emulador. |

No se solicitaron repeticiones de estas pruebas ni se presentaron como ejecutadas por Codex. Los casos adicionales propuestos son distintos: interleaving A03, revocación/restauración y negativos auténticos. Una corrección futura puede justificar regresión específica en el teléfono.

## 5. Auditoría financiera y matemática

Se ejecutaron comprobaciones independientes importando los módulos actuales, sin agregar archivos a la suite ni usar compras reales.

| Referencia | Resultado obtenido |
| --- | --- |
| A: 120.000 / seis cuotas sin interés | `[20000, 20000, 20000, 20000, 20000, 20000]`; total 120.000. |
| B: 120.000, seis cuotas de 22.000 | Total 132.000; intereses totales 12.000. |
| C: 132.000 repartidos 60.000/72.000 | Filas 60.000 y 72.000; cada columna suma 22.000; sin duplicar contrato. |
| D: 10.000 / tres personas | `[3334, 3333, 3333]`; total exacto 10.000. |

La política de reparto igual asigna los pesos sobrantes a las primeras personas. La división de cuotas sin interés hace lo mismo entre las primeras cuotas. El reparto matricial puede distribuir residuos entre personas/meses en distinto orden; conserva las sumas de cada fila y columna y no necesita que cada participación repita idéntico patrón de residuos.

La exploración adicional cubrió **4.450 combinaciones**: montos de 1 a 80, hasta 12 cuotas válidas y hasta cinco personas con asignaciones positivas. Usó `BigInt` como oráculo de suma por columna y ejecutó **192.920 pagos de un peso con comprobaciones de deshacer**, verificando conservación de lo pagado y pendiente. No equivale a 192.920 pruebas nuevas de la suite ni cubre todos los estados posibles.

Deshacer un abono elimina el abono parcial acumulado de la cuota, no solo el último aporte. Un primer ensayo exploratorio suponía lo segundo y falló; se corrigió ese oráculo al contrato real. Las comprobaciones finales verifican que el importe devuelto coincide con la reducción de lo pagado. No se atribuye ese primer fallo al producto.

### Modificaciones y consistencia

| Cambio | Observación |
| --- | --- |
| Importe editado | Se conserva; si no coincide con el total final, confirmar queda bloqueado. |
| Cantidad de cuotas | El motor valida rango y reconstruye el plan; la asignación debe ajustarse al nuevo total cuando cambia. |
| Sin/con intereses | `totalFinal` e `interesesTotales` explícitos; no hay tasa inferida. |
| Valor mensual manual | Total = cuota × cantidad; rechaza total inferior al original y enteros inválidos. |
| Persona | Revalidación contra catálogo actual; cambios concurrentes provocan rechazo/conflicto. |
| Activar/desactivar reparto | Conserva borrador múltiple; el modo individual usa únicamente su propia asignación. |
| Datos inconsistentes | Fechas imposibles, entidades ausentes y sumas incorrectas se rechazan en revisión. |

**Excepción relevante:** el contenedor de saldos no tiene igual rigor. Un respaldo aceptado con `saldos: { A: "100" }`, procesado por el cuerpo real de `agregarSaldo()` con aporte 50, produjo **`"10050"`**, frente a los **150** esperados. La aritmética de planes aprobada no elimina este defecto de integración; véase A02.

## 6. Auditoría de seguridad, persistencia y sincronización

- **Autenticación/autorización:** Google Auth mediante SDK; rutas por UID y rechazo de anónimos. No se encontraron credenciales privadas nuevas en el diff. Las propiedades locales y claves de firma están excluidas de Git. Una API key cliente de Firebase no sustituye las reglas ni debe tratarse automáticamente como contraseña filtrada.
- **Reglas vigentes:** una lectura autenticada de release/ruleset, sin leer documentos, coincidió con `firestore.rules`. SHA-256 normalizado: `57f32d40cfc72ec7921a836145430732627e8e3528c606fe18775a2aeed4c3a5`. No se desplegó nada.
- **Atomicidad:** las 16 pruebas SDK/emulador comprueban aislamiento cruzado/anónimo, revisión, escritores antiguos, conservación de legados, confirmación concurrente, recibos inmutables y carrera confirmar/descartar. Los mensajes `PERMISSION_DENIED` esperados pertenecen a pruebas negativas que aprobaron.
- **Alcance del servidor:** valida identidad, contenedores y vinculación atómica; no certifica origen bancario ni verifica iterativamente toda la matemática interna de arrays arbitrarios. La autorización del titular sobre su documento y la validación de dominio cumplen funciones distintas.
- **Permisos Android:** filtro anterior a extras y servicio protegido por `BIND_NOTIFICATION_LISTENER_SERVICE`; conectada con Internet y diagnóstico sin él. Backup/transferencia excluyen bases y preferencias. No se añadieron permisos de SMS, contactos o llamadas en el diff.
- **Almacenamiento:** Room guarda datos mínimos necesarios mientras están pendientes; al enviar limpia columnas financieras y conserva identidad. Logout pausa y cierra sesión, pero no borra pendientes. No hay evidencia de borrado físico seguro del SQLite/WAL ni protección completa frente a un dispositivo rooteado.
- **Recuperación:** borradores PWA en memoria por UID, descarga explícita y bloqueo tras error; confirmación requiere conexión. La cola Android conserva datos ante fallo. A03 limita la programación automática de una captura en una ventana concreta.
- **Entradas corruptas:** planes/pendientes tienen controles estrictos; saldos y ciertas cadenas de catálogos/historial no tienen protección equivalente. A01/A02 son las consecuencias reproducidas.
- **Dependencias:** `npm audit --json` reportó 20 entradas de paquetes afectados: diez altas y diez moderadas, ninguna crítica. Afecta al árbol npm de herramientas/pruebas; no demuestra veinte explotaciones en la PWA. Las librerías del navegador se cargan desde CDN y requieren evaluación de sus rutas de uso por separado; véase A07.

Fuentes oficiales consultadas para límites concretos: [políticas de trabajo único](https://developer.android.com/reference/androidx/work/ExistingWorkPolicy), [gestión de WorkManager](https://developer.android.com/develop/background-work/background-tasks/persistent/how-to/manage-work) y [API keys de Firebase](https://firebase.google.com/docs/projects/api-keys). Se usan para interpretar el código, no como prueba de una ejecución física.

## 7. Resultados de las verificaciones ejecutadas

Entorno observado: Windows/PowerShell, Node `v24.19.0`, npm `11.17.0`. Registros operativos fuera de Git: `work/auditoria-f701e03/`, en la carpeta de esta conversación.

| Verificación | Resultado |
| --- | --- |
| Comandos Git solicitados, existencia/ancestros/diff | Ejecutados; un commit diferencial, nueve archivos; checkout inicialmente limpio. |
| `node --test tests/*.test.mjs` | 107 aprobadas; cero fallos, canceladas u omitidas. `node.log`. |
| `node scripts/seguimiento.mjs --check` | Acepta 100%, 37 tareas; verifica estructura/sincronización, no autenticidad de evidencia. `seguimiento.log`. |
| `npm run test:reglas` | 16 aprobadas, cero fallos; proyecto exclusivo `demo-cuotas-local`. `firestore.log`. |
| Sintaxis JS/ESM e inline | 30 archivos/bloques revisados con `node --check`; sin errores de sintaxis. |
| Android JVM/Robolectric | 44 ejecuciones actuales: 43 aprobadas, una omitida, cero fallos/errores. `android-actual.json`. |
| Lint Android debug | Cero errores; 24 advertencias conectada y ocho diagnóstico. No confundir informes antiguos `debug` con las variantes actuales. |
| APK Android | Ambas variantes debug y conectada release compilan; release produce `app-conectada-release-unsigned.apk`. No se instaló ni publicó. |
| `npm audit --json` | 20 entradas afectadas, diez altas/diez moderadas; se conservó JSON y no se ejecutó `fix`. |
| `git diff --check d017bbd f701e03` | Sale con código 2 por espacios finales: hard breaks Markdown y líneas en blanco con espacios de tests. No es un fallo funcional. `diff-check.log`. |
| A–D y exploración financiera | Aprobados; 4.450 combinaciones y 192.920 operaciones de pago comprobadas. `finanzas.json`. |
| Reproducción A02 | Confirmada: saldo de texto admitido → `"10050"` en vez de 150. |
| UI navegador, escritorio/375 px | Ejecutada con datos ficticios; A01 reproducido y revisión móvil comprobada; cancelación deja sin registros de deuda el ejemplo. |
| Reglas de producción | Solo lectura; fuente remota igual a local. `reglas-produccion.json`. |

Comando Android ejecutado desde `android/`:

```powershell
.\gradlew.bat --offline --rerun-tasks :core:test :app:testDiagnosticoDebugUnitTest :app:testConectadaDebugUnitTest :app:lintDiagnosticoDebug :app:lintConectadaDebug :app:assembleDiagnosticoDebug :app:assembleConectadaDebug :app:assembleConectadaRelease
```

Resultado: `BUILD SUCCESSFUL in 1m 53s`. `--offline` usa dependencias ya disponibles y `--rerun-tasks` fuerza ejecución. La prueba omitida comprueba pantalla sin configuración; aquí existe configuración SDK. No se borró esa configuración para forzar el caso. Se excluyeron del recuento tres resultados XML obsoletos de la variante antigua `testDebugUnitTest`; no se presentan como ejecuciones nuevas.

No existen scripts npm de lint JS, TypeScript ni build web de producción. La web es estática y no tiene un build npm que pueda darse por aprobado. Kotlin/Java sí se compilaron. No se ejecutaron nuevas pruebas físicas, fuzzing de red del teléfono, auditoría binaria de terceros ni operaciones de pago reales.

### Calidad de la suite

Las pruebas previas contienen controles valiosos: importes exhaustivos, concurrencia de Firestore real en emulador, datos legados y separación de sesión. Las cinco pruebas UI nuevas invocan la bandeja real con un DOM reducido y callbacks simulados: son útiles para render/acciones, no para certificar CSS, accesibilidad, revisión completa o servidor.

En la suite de 14 casos, el caso 5 compara un documento vacío independiente del aviso; el 11 rechaza una propiedad `uid` en un objeto, sin autenticar contra Firebase; el 12 prueba la función pura de descarte, sin carrera SDK; el 13 solo compara revisión 1 con revisión 2, sin llamar a `guardarConRevision`; el 14 usa un único registro y no intenta filtrar datos reales de una segunda persona ni abrir un PDF. Tener esos nombres no demuestra cobertura integral de la matriz. La integración previa cubre parte de los huecos; no suple negativos auténticos ni la carrera de scheduling Android.

## 8. Regresiones y procedencia

No se identificó una regresión funcional de código atribuible a Antigravity en este intervalo: los archivos de la aplicación y Android son idénticos. Esto es una conclusión diferencial delimitada, no una afirmación de que no existan errores.

| Hallazgo | Procedencia |
| --- | --- |
| A01: historial interpreta nombres como HTML | Preexistente en `d017bbd`; reproducido en código idéntico. |
| A02: saldos de texto y suma incorrecta | Preexistente en `d017bbd`; mismo validador/importador y `agregarSaldo()`. |
| A03: posible aviso sin nuevo trabajo automático | Preexistente en `d017bbd`; mismos Room/Worker/política KEEP. |
| A04: aceptación 100% sin evidencia suficiente | Introducida por el cierre/documentación de `f701e03`. |
| A05: receta SDK/rollback nueva | Introducida en el manual de `f701e03`. |
| A06: garantías de borrado y descripción de huella | Afirmaciones nuevas incorrectas sobre código anterior. |
| A07: árbol npm con avisos de seguridad | Versiones preexistentes; lockfile no cambió. |
| A08: espacios finales | Introducidos en documentación/tests del commit de entrega. |

## 9. Hallazgos técnicos por gravedad

### CRÍTICO

No se confirmó un hallazgo de esta categoría en el alcance ejecutado. Esto no certifica ausencia de vulnerabilidades fuera de ese alcance.

### A01 — ALTO — HTML ejecutable desde nombres del historial

- **Ubicación:** `index.html:1985`, `showHistorial()`, interpolación de `personas` en opciones y posterior `innerHTML`; entrada aceptada por `datos-compras.mjs:133` / `persistencia-segura.mjs:66`.
- **Impacto:** un nombre controlado por un archivo importado o por quien introduzca el dato puede ejecutar JavaScript al abrir el historial, dentro del origen de la aplicación. Puede afectar la confidencialidad/integridad de la sesión del titular. No constituye acceso cruzado concedido por las reglas.
- **Evidencia:** con nombre ficticio que cierra el selector e inserta un `img` con manejador de error inocuo, `leerBackup()` aceptó el documento. El navegador real mostró `AUDITORIA-XSS-CONFIRMADA` al pulsar Historial. Solo se insertó ese marcador; no se extrajeron tokens ni datos ni se contactó una red externa.
- **Reproducción:** usar un respaldo sintético con ese nombre, cargarlo exclusivamente en el entorno sin Firebase y abrir Historial. Captura fuera de Git: `outputs/auditoria-xss-local.png`. No hacerlo con una cuenta real.
- **Solución propuesta:** construir opciones mediante DOM/`Option` y `textContent`; auditar el resto de interpolaciones de historial y catálogos. Validar estructura/longitudes sin considerar el escape como responsabilidad del archivo importado. Agregar regresión de navegador con cadenas de HTML inertes.

### A02 — ALTO — Un saldo no numérico aceptado puede alterar obligaciones

- **Ubicación:** `persistencia-segura.mjs:66`, `validarDocumento()`; `datos-compras.mjs:133`, `leerBackup()`; `index.html:2799`, `agregarSaldo()`, suma en línea 2804.
- **Impacto:** datos corruptos aceptados se convierten en un saldo incorrecto y pueden utilizarse para pagos posteriores. También falta un límite uniforme de enteros seguros al agregar saldo.
- **Evidencia:** respaldo v7 con `saldos: { A: "100" }` aceptado por el importador. Ejecutando el cuerpo real de `agregarSaldo()` en un contexto aislado con aporte `50`, el resultado fue `"10050"`; debería ser `150`. Se sustituyeron únicamente UI y transporte por puertos sin efectos; el cálculo y validador eran los del proyecto.
- **Reproducción:** importar ese documento ficticio y sumar 50 en el entorno de prueba. Evidencia numérica en `work/auditoria-f701e03/finanzas.json`.
- **Solución propuesta:** contrato explícito para cada saldo y la suma, con tipo numérico, rango y precisión comprobados antes de cargar/guardar/calcular. Si se decide admitir formatos legados, convertirlos con una migración controlada y probada; nunca convertir silenciosamente datos ambiguos ni modificar finanzas reales en esta auditoría.

### A03 — ALTO — Riesgo de captura persistida sin siguiente envío automático

- **Ubicación:** `TrabajoCapturas.kt:39`, `TrabajoCapturas.kt:42`, `TrabajoCapturas.kt:82`; productor en `AplicacionConectada.kt:43`.
- **Impacto:** una captura puede quedar pendiente localmente hasta una nueva señal o reintento manual; no se pierde necesariamente el registro, pero falla la garantía de recuperación automática.
- **Evidencia y alcance:** análisis estático de un interleaving posible, no reproducción física ni afirmación de que le haya ocurrido al usuario. El worker consulta cero pendientes; antes de terminar, el productor inserta una captura y solicita trabajo con `KEEP`; si se procesa mientras el anterior sigue sin terminar, se conserva el trabajo anterior y no se agrega otro; el worker ya decidió no continuar. La fila queda pendiente sin un nuevo disparador garantizado. La política oficial KEEP confirma esa semántica.
- **Reproducción propuesta:** prueba instrumentada con barreras entre el conteo final y `Result.success()`, insertando otro aviso en esa ventana. No se agregó una nueva prueba a la suite en esta fase.
- **Solución propuesta:** hacer durable/serializada la señal de trabajo pendiente y evitar el hueco entre vaciado y finalización; evaluar continuación única y su política sin carreras. Probar además pausa, cambio de UID y fallos. Cambiar solo el backoff o mantener una Activity abierta no resuelve el interleaving.

### A04 — ALTO — Cierre de aceptación no sustentado por los casos ejecutados

- **Ubicación:** `ANTIGRAVITY_IMPLEMENTATION_REPORT.md:22`; tareas 1.3, 2.2, 2.3, 6.2, 7.1 y cierre 8.2 de `plan.json`; `tests/validacion-14-casos.test.mjs:138`, `:215`, `:253`; `tests/ui-bandeja.test.mjs:281`.
- **Impacto:** el 100% puede inducir a aceptar una entrega con riesgos abiertos. `seguimiento --check` verifica declaraciones consistentes, no demuestra que su evidencia sea auténtica ni suficiente.
- **Evidencia:** el corpus dice explícitamente que distribución de extras y negativos son sintéticos. El criterio 1.3 exige negativos auténticos. Los casos 5/11/12/13 y la prueba de detener UI tienen alcance menor que el anunciado. Se cambiaron 13 estados y 35 puntos sin implementación funcional nueva.
- **Solución propuesta:** corregir estado/evidencias con la matriz de esta auditoría, conservar los tres reportes físicos positivos y separar cobertura de contrato, SDK/emulador, navegador y dispositivo. Añadir después las pruebas faltantes concretas; no usar solo el conteo 107 para certificar cierre.

### A05 — MEDIO — Manual nuevo no reproduce la configuración ni un rollback

- **Ubicación:** `docs/GUIA_INSTALACION_Y_RECUPERACION.md:44` y `:110`; contraste con `android/app/build.gradle.kts:35`.
- **Impacto:** quien reconstruya el entorno siguiendo el ejemplo puede obtener una app sin configuración de conexión. El procedimiento de recuperación depende de contexto externo y no selecciona una versión anterior de reglas.
- **Evidencia:** el manual propone claves `firebase.projectId`, `firebase.apiKey`, `firebase.applicationId`, `firebase.webClientId`; el build lee exactamente `PROJECT_ID`, `API_KEY`, `APPLICATION_ID`, `WEB_CLIENT_ID`. Son nombres distintos. `firebase deploy --only firestore:rules` despliega el archivo actual: por sí solo no restaura un ruleset anterior ni fija proyecto.
- **Solución propuesta:** documentar los nombres que consume el build y validación previa sin publicar IDs privados innecesarios; procedimiento de recuperación con proyecto explícito, fuente/versionado y compatibilidad CAS. No recomendar restaurar reglas antiguas permisivas para admitir clientes sin revisión. No se ejecutó ningún comando de despliegue para probar el manual.

### A06 — MEDIO — Garantías de privacidad y persistencia descritas incorrectamente

- **Ubicación:** `ANTIGRAVITY_IMPLEMENTATION_REPORT.md:58`, `:59`, `:166`; `ConexionActivity.kt:181`; `ColaDatabase.java:77`; `persistencia-segura.mjs:43`.
- **Impacto:** el operador puede asumir una eliminación o protección que no ocurre. Es una regresión documental; conservar pendientes por UID al salir era una decisión para evitar pérdida de datos.
- **Evidencia:** `cerrarSesion()` pausa y llama `signOut()`; no llama a `eliminarPendientes()`. El DAO declara ese borrado sin un llamador en el flujo. Los tombstones retienen UID, identificadores, hashes, `postTime` y estado, no cuatro bytes. Limpiar columnas no demuestra borrado físico de SQLite/WAL ni inmunidad frente a root. La «huella SHA-256» PWA es en realidad una representación JSON canónica comparada directamente; CAS no requiere que sea un hash criptográfico.
- **Solución propuesta:** corregir las garantías, inventariar metadatos retenidos y describir aislamiento/retención/borrado reales. Si se desea borrar pendientes, diseñar una acción explícita con advertencia de pérdida; no introducir purga automática solo para hacer coincidir código e informe.

### A07 — MEDIO — Dependencias npm requieren revisión de seguridad

- **Ubicación:** `package.json`, `package-lock.json`; resultado `dependencias.json`.
- **Impacto:** deuda de seguridad en herramientas/pruebas. Debe evaluarse alcanzabilidad; no se demostró una explotación de navegador por esos avisos.
- **Evidencia:** npm reportó diez entradas altas/diez moderadas; entre los avisos hay `@grpc/grpc-js`, `undici`, `braces` y dependencias de Firebase CLI/SDK Node. Los tres paquetes directos están en `devDependencies`. El SDK web y jsPDF se cargan desde CDN y no quedan certificados por este escaneo npm.
- **Solución propuesta:** evaluación separada de herramientas y rutas realmente usadas del navegador, versiones compatibles y regresión SDK/emulador/build. Revisar las recomendaciones del escáner antes de adoptarlas: algunas proponen cambios mayores o versiones anteriores. No se actualizó ninguna dependencia.

### A08 — BAJO — Comprobación de whitespace no limpia

- **Ubicación:** cabecera del informe de Antigravity y `tests/ui-bandeja.test.mjs:195`, `:204`.
- **Impacto:** higiene del diff; sin impacto funcional demostrado. Los espacios de fin de línea Markdown pueden ser saltos intencionales.
- **Evidencia:** `git diff --check` termina con código 2. Esto debe registrarse y no declararse como una comprobación limpia.
- **Solución propuesta:** retirar espacios de líneas vacías de tests y decidir la convención Markdown; no mezclarlo con cambios funcionales o formateos masivos.

## 10. Limitaciones de la auditoría

1. No se accedió físicamente al S24 ni se ejecutaron otra vez sus tres pruebas positivas. Se registran como reportadas por el usuario. Revocación/restauración, negativos auténticos y todas las variantes de actualizaciones siguen sin evidencia completa disponible.
2. A03 es una inferencia de concurrencia sustentada por código y semántica de API; necesita reproducción determinista instrumentada. No se atribuye un fallo observado al teléfono.
3. El navegador usa un servidor de pruebas rotulado, documentos ficticios en RAM y Firebase sustituido por un puerto de prueba. Sus resultados no se presentan como escrituras reales de Firestore; para reglas/atomicidad se usa el emulador separado.
4. No se repitió la inspección visual de la URL del roadmap restringida previamente por política. Se validaron el generador y el script del HTML mediante las pruebas existentes, sin usar otra ruta de navegador para eludir la restricción.
5. No se generó un grafo Graphify: no existía un grafo del repo y el alcance autoriza únicamente el informe como artefacto nuevo dentro del proyecto. Se trazaron las relaciones mediante imports, lecturas y Git.
6. La única consulta de producción fue el release/fuente de reglas. No se consultaron compras, saldos, usuarios financieros, tokens ni datos privados de cuentas; no hubo cambios de permisos ni despliegues.
7. Las pruebas matemáticas no son demostración formal de todos los inputs. No se hizo pentest de infraestructura, análisis binario completo del APK/SDK, comprobación de dispositivos rooteados ni auditoría de cada dependencia transitiva/CDN.
8. La ausencia de cambios de implementación elimina la atribución de regresión funcional a este commit, pero no sustituye revisar los defectos heredados de Codex.

## 11. Recomendaciones y plan de correcciones

### Bloqueantes para otorgar el visto bueno

| Prioridad | Trabajo propuesto | Archivos/funciones | Pruebas que deben incorporarse después de autorizar |
| --- | --- | --- | --- |
| P1 | Eliminar interpretación ejecutable de nombres/historial, A01 | `showHistorial()`, renderizadores e importación | Navegador con HTML inocuo en nombres/eventos; texto literal, ningún manejador ejecutado; conservar datos válidos. |
| P1 | Validar saldos y operaciones con precisión/rango explícitos, A02 | `validarDocumento`, `leerBackup`, `agregarSaldo`, pagos/deshacer | Texto/negativo/objeto/fracción/NaN/overflow rechazados o migrados explícitamente; 100 + 50 = 150; reversión exacta; histórico válido intacto. |
| P1 | Reproducir y cerrar hueco de scheduling, A03 | `ColaDeCapturas.recibir`, `TrabajoCapturas.doWork/solicitar` | Interleaving con barreras, captura durante último lote y tras conteo cero, red caída/restaurada, fallo permanente, pausa y cambio de cuenta; ningún pendiente queda sin trabajo/reintento señalizado. |
| P1 | Rectificar aceptación/evidencias, A04 | Roadmap e informe de entrega | Trazabilidad de los 14 requisitos reales, negativos auténticos anonimizados cuando existan, pruebas de actualizaciones y fallos específicas; conservar los reportes S24 ya aportados. |
| P2 | Corregir instalación/recuperación y privacidad, A05/A06 | Manual nuevo y guías relacionadas | Build de preparación con ejemplo sanitizado de claves correctas; guía verificada de recuperación sin desplegar; prueba de que logout no borra/reasigna cola salvo acción expresamente diseñada. |

Estos pasos deben preservar el contrato financiero, el aviso original y los históricos. Antes de una corrección que cambie interpretación de saldos existentes, hacer respaldo y comprobar compatibilidad en copias sintéticas. No convertir esta auditoría en una migración ni aplicar cambios automáticamente a datos reales.

### Mejoras y verificaciones adicionales

- P2: revisar A07 con versiones compatibles y rutas de ejecución; repetir Node, emulador y Android cuando cambien dependencias.
- P2: sustituir la parte insuficiente de los casos 5/11/12/13/14 por aserciones de comportamiento, aprovechando las pruebas SDK existentes. Añadir navegador real para revisión, fallos, filtros y privacidad de reportes, en vez de limitarse a aumentar el número de tests.
- P2: completar pruebas nuevas de revocación/restauración de permiso y actualizaciones de una misma notificación; no pedir repetir las tres positivas sin un cambio posterior o riesgo concreto.
- P3: limpieza A08, documentación de release firmado/R8 si se prepara una distribución release y automatización CI. El APK release construido en esta auditoría queda sin firma; el build no demuestra una entrega instalable de release.
- Opcional: CSP y revisión de sinks DOM como defensa adicional, límites de crecimiento del documento Firestore y política explícita de retención de identidades, evitando borrados que reintroduzcan duplicados.

No se implementó ninguna de estas propuestas ni se añadieron pruebas a la suite. Se espera autorización del usuario para la fase de correcciones.

## 12. Veredicto final

**RECHAZADO — REQUIERE CORRECCIONES.**

Las funciones principales y los cálculos ordinarios muestran resultados positivos, y las tres comprobaciones físicas reportadas se conservan como evidencia válida de ese alcance. Los fallos A01/A02 reproducidos, el riesgo A03 y la certificación insuficiente A04 impiden justificar el cierre integral. El 107/107 y el 100% generado describen ejecuciones/declaraciones concretas; no acreditan que las 37 tareas estén terminadas sin defectos relevantes.

El informe queda para revisión. No se harán correcciones, cambios del roadmap, actualizaciones ni despliegues hasta recibir autorización.
