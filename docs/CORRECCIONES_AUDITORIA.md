# Correcciones posteriores a la auditoría · 2026-10-21

El usuario autorizó corregir los hallazgos y conservar los flujos existentes.
La corrección web está publicada y verificada; el APK 0.2.1 está preparado,
pero todavía no se instaló en el S24. Se utilizó la autorización de publicación
que el titular ya había otorgado para esta aplicación.
El informe original `CODEX_FINAL_AUDIT.md` se conserva como evidencia histórica,
sin reescribir su veredicto para aparentar una nueva aprobación independiente.

## Resultado por hallazgo

| Hallazgo | Resultado | Evidencia |
| --- | --- | --- |
| A01 · HTML ejecutable | Corregido | Opciones del historial mediante `Option`; escape de datos importados en sus filas, incluidos campos numéricos. Pruebas de regresión y navegador real: marcado mostrado literalmente. |
| A02 · Saldos de texto | Corregido | Validación al cargar, importar y guardar; lectura propia del mapa, sumas con límites y sin coerción. El manejador real suma 100 + 50 = 150; entradas inválidas no mutan datos ni guardan. |
| A03 · Señal final de envío | Corregido y probado localmente | `APPEND_OR_REPLACE` en todas las señales. Seis pruebas de Room/WorkManager reales; envío sustituido y captura después del último conteo, antes del éxito del worker. |
| A04 · Cierre sin evidencia suficiente | Rectificado | Roadmap reabierto: 63 puntos de aceptación, 23/37 tareas completadas. Las positivas físicas reportadas se conservan; no se inventan negativos ni validaciones de dispositivo. |
| A05 · Instalación/recuperación | Corregido | Nombres exactos de properties contrastados con build; recuperación selecciona fuente y proyecto, exige CAS y pruebas. No se ejecuta rollback real. |
| A06 · Garantías de privacidad | Corregido | JSON canónico sin SHA; logout conserva pendientes por UID. Inventario real de metadatos y límites de borrado SQLite/WAL, sin prometer protección frente a root. |
| A07 · Dependencias | Reducido, pendiente parcial | 20 → 5 entradas npm. SDK y PDF actualizados y probados; quedan avisos transitivos de herramientas sin solución compatible completa. |
| A08 · Whitespace | Corregido | Espacios finales retirados de los archivos afectados; `git diff --check` limpio. |

## Compatibilidad financiera y privacidad

- Los aportes nuevos y planes explícitos exigen pesos enteros seguros. No se
  convierten cadenas como `"100"` en saldos ni se truncan entradas fraccionarias.
- Los saldos numéricos decimales históricos se conservan, porque las compras
  antiguas admitían decimales. Pagar/deshacer no redondea ni migra esos contratos.
  Se rechazan negativos, objetos, no finitos y valores fuera del límite seguro.
- Deshacer verifica el saldo resultante antes de modificar compra o historial;
  un desbordamiento deja el estado intacto.
- El aviso original, planes con/sin interés, repartos y confirmación atómica
  conservan su contrato. No se registra deuda antes de confirmar.
- No se accedió a compras reales ni se modificaron reglas, permisos de cuentas
  o documentos financieros para implementar o probar esta entrega.

## Pruebas ejecutadas

| Comprobación | Resultado y alcance |
| --- | --- |
| `npm test` | 117 aprobadas, cero fallos/omitidas. Incluye nuevos casos de historial, saldo, deshacer histórico y PDF real. |
| `npm run test:reglas` | 16 aprobadas en `demo-cuotas-local`; SDK Firebase 13.1.0, CAS, aislamiento y confirmación/descarte concurrentes. |
| Android JVM/Robolectric | 50 ejecuciones actuales: 49 aprobadas y una omitida por configuración presente. Se excluyen XML obsoletos de otras variantes. |
| Android lint/debug APK | Sin errores; variantes diagnóstico y conectada compiladas. No es una ejecución física del APK nuevo. |
| UI real aislada | Escritorio y 375 px: HTML inerte en historial, fecha automática editable, Papá seleccionada, importe detectado y edición preservada, reparto cerrado por defecto, interés manual y reparto 10.000/20.000. Cancelar deja cero compras/recibos ficticios. |
| SDK web real | Navegador importó las 17 funciones utilizadas de Firebase/jsPDF desde sus CDN y creó un PDF; sin sesión ni consultas a Firebase. |
| PDF real | Personal/general con 30 compras y una de tercero; tres páginas cada uno renderizadas e inspeccionadas sin cortes. Texto personal sin tarjeta ni tercero; general conserva ambos. |
| Seguimiento | Generación y `--check` coherentes: 63/100, 37 tareas. Tests de controles usan VM; no se declara nueva inspección visual del Gantt. |

Los casos 11 y 12 de `validacion-14-casos.test.mjs` ahora nombran su alcance
real de esquema y resolución pura. El caso 13 ejecuta `guardarConRevision()` y
comprueba que una revisión obsoleta no escribe. La atomicidad y el aislamiento
se sustentan en `persistencia-emulador.integration.mjs`, no en esos nombres.

La matriz completa de casos y niveles de evidencia está en
`VALIDACION_COMPRAS.md`. Los fixtures negativos siguen siendo sintéticos.

Comando Android usado desde `android/`:

```powershell
.\gradlew.bat --offline :core:test :app:testDiagnosticoDebugUnitTest :app:testConectadaDebugUnitTest :app:lintDiagnosticoDebug :app:lintConectadaDebug :app:assembleDiagnosticoDebug :app:assembleConectadaDebug
```

## Dependencias y límites pendientes

Versiones fijadas: Firebase JS 13.1.0 en herramientas/web,
`@firebase/rules-unit-testing` 6.0.0, Firebase CLI 15.34.1 y jsPDF 4.2.1.
Overrides limitados a gRPC 1.14.6 y uuid 11.1.1 bajo gaxios; pruebas del SDK y CLI
emulador ejecutadas después. No se aplicó `npm audit fix --force`.

Quedan cinco entradas de `npm audit`: tres altas por braces → chokidar →
firebase-tools y dos moderadas por OpenTelemetry → PubSub. Todas pertenecen
a herramientas de desarrollo; no son los recursos servidos por la PWA.
Braces no tiene publicada una versión corregida para el aviso actual. La cadena
PubSub instalada usa OpenTelemetry 1.x; imponer 2.x globalmente sería un cambio
incompatible sin validación. No se ocultan avisos ni se declaran resueltos.
Hasta corregir el árbol oficial, usar estas herramientas solo con este proyecto
confiable y revisar versiones posteriores. Esto no certifica invulnerabilidad
del navegador ni constituye una explotación demostrada de la aplicación.

Fuentes contrastadas:

- [Política oficial WorkManager](https://developer.android.com/reference/androidx/work/ExistingWorkPolicy).
- [Pruebas de integración WorkManager](https://developer.android.com/develop/background-work/background-tasks/testing/persistent/integration-testing).
- [Notas Firebase JS](https://firebase.google.com/support/release-notes/js).
- [Notas jsPDF](https://github.com/parallax/jsPDF/releases/tag/v4.2.1).

## APK y siguiente paso

- Conectada **0.2.1**, `versionCode=4`, paquete
  `cl.controlcuotas.companion.sync`. APK debug con firma v2 verificada.
- SHA-256 del APK preparado:
  `51a7afaeebb4d35e2e03594dde716c94e036d371d92520690e2a8b074edf5ca5`.
- Instalar encima de Cuotas · conexión, conservando datos y cuenta. No
  desinstalar para resolver un conflicto de firma; revisar la clave primero.
- No requiere reinstalar diagnóstico. No cambió la gramática del detector.
- Tras actualizar, queda comprobar recuperación sin red y revocación/restauración
  de acceso en el S24. No se requieren gastos de prueba ni repetir las tres
  positivas ya reportadas sin un motivo nuevo.
- La web usa `cuotas-v21` y está publicada sin migración ni cambios de reglas.
  Pages [39700219186](https://github.com/xZykzii/tarjeta/actions/runs/39700219186)
  aprobó el commit funcional/documental `5312795`. Se descargaron y compararon
  27 archivos: HTTP 200, MIME JavaScript correcto y contenido coincidente.
  La actualización posterior de documentación no cambia el código de la app.

El roadmap no equivale al porcentaje de código existente: mide criterios de
aceptación con dependencias. Se reabrieron las tareas con evidencia pendiente;
1.1 depende del plan 0.2, porque investigar tecnología no requiere aprobar la
revisión visual del Gantt. No se usó ese cambio para cerrar tareas incompletas.
