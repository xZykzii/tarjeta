# Validación continua y pendientes del S24 · 2026-10-22

La corrección 0.2.1 ya está instalada en el S24, según confirmó el titular.
También confirmó que, tras desactivar y volver a activar el acceso a
notificaciones, la app volvió a mostrar acceso concedido y servicio conectado.
Se registra como evidencia física reportada; no como ejecución del agente.

Esta continuación añade pruebas y verificaciones de entrega. No cambia la PWA,
el APK, la gramática de detección, los permisos ni las reglas de producción.
No requiere otra instalación. No se usaron compras reales para probar.

## Verificación automática en GitHub

Workflow: `.github/workflows/verificacion.yml`, ejecutado con cada push a main
o ramas codex, cada pull request y mediante ejecución manual.

[Consultar las ejecuciones](https://github.com/xZykzii/tarjeta/actions/workflows/verificacion.yml).

| Trabajo | Qué comprueba | Qué no acredita |
| --- | --- | --- |
| Web y reglas | Node, cálculos, HTML inerte, backups/PDF, seguimiento, dependencias y 21 casos SDK/emulador | No inicia sesión en producción ni prueba el teléfono |
| Android | Core, componentes, Room/WorkManager, lint y compilación debug de ambas variantes | No instala APK ni demuestra continuidad física Samsung |

El workflow usa Node 24 y Java 21. Las acciones están fijadas por SHA; los
permisos son solo `contents: read` y no se conservan credenciales del checkout.
No usa secretos, cuentas de servicio ni configuración Firebase del titular.
Solo sube informes de prueba/lint, con retención de siete días. No sube APK,
configuración local, colas ni datos financieros.

El APK de CI se compila sin configuración de cuenta para comprobar el caso
de conexión no habilitada. Esos binarios no son los APK de entrega del S24.
No se deben distribuir ni sustituir por la versión firmada/configurada preparada.

## Dependencias: avisos visibles y límite explícito

```powershell
npm run test:dependencias
```

El control compara las versiones CDN de Firebase/jsPDF con las versiones
fijadas usadas por las pruebas. Comprueba el lockfile y consulta `npm audit`.
Una respuesta inválida, fallo de red, aviso nuevo, gravedad aumentada o traslado
de deuda conocida a una dependencia de producción bloquea la comprobación.

Persisten dos avisos que generan cinco entradas transitivas de herramientas:

| Aviso | Paquetes revisados | Límite |
| --- | --- | --- |
| [GHSA-vfj7-8cjw-p6xm](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm) | braces, chokidar, firebase-tools | Alta |
| [GHSA-8988-4f7v-96qf](https://github.com/advisories/GHSA-8988-4f7v-96qf) | OpenTelemetry, PubSub, firebase-tools | Moderada en el aviso; CLI puede acumular ambos |

Las excepciones son por URL exacta, paquete, gravedad y alcance de desarrollo;
no autorizan todos los avisos futuros de esos paquetes. Cada ejecución imprime
los avisos pendientes. Su éxito significa «sin desviaciones nuevas respecto
del riesgo revisado», nunca «sin vulnerabilidades». No se descartaron avisos
con `audit-level=critical`, exclusiones globales ni cambios forzados de versión.

Cuando exista una solución compatible, actualizar la dependencia, volver a
ejecutar reglas/SDK, retirar la excepción resuelta y registrar el resultado.

## Recuperación sin conexión: evidencia local

Ocho pruebas de programación usan Room y WorkManager reales con envío sustituido:

- Captura justo después del conteo final: queda un sucesor durable.
- Dos señales se serializan sin cancelar el trabajo anterior.
- Reintento tras fallo permanente no depende de una cadena ya fallida.
- Pausa conserva la cola y una señal posterior puede reanudarla.
- Cada UID conserva su propia cadena y sus capturas.
- Consentimiento revocado antes del envío conserva el importe pendiente.
- Restricción de red incumplida: no ejecuta ni limpia la captura; al satisfacerla envía.
- Fallo transitorio: conserva el mismo ID y mantiene bloqueado el sucesor hasta reintentar.

Estas pruebas no sustituyen la recuperación real en el S24. No se presentan los
controles de una sonda como prueba de red de Firestore; el SDK y las reglas se
comprueban en el emulador separado.

La continuación del 2026-10-22 añade cinco casos con SDK real de la PWA contra
el emulador: bandeja caché/servidor, confirmación sin red y reintento, resolución
desde otro dispositivo, borrador obsoleto y aislamiento al cambiar cuenta.
Los dos casos de transacciones cierran además el transporte TCP del cliente
afectado. Las suites se ejecutan en serie para evitar que sus limpiezas se
interfieran. Resultado: 21 SDK/emulador aprobadas y 127 Node aprobadas.
Ver [método, resultados y límites](RECUPERACION_SIN_RED.md).

El titular reportó una nueva compra detectada normalmente y pidió continuar.
El aviso anterior ausente de la web conserva causa desconocida; cero pendientes
en el teléfono no acredita envío de una captura concreta. No se cierra esa
incidencia ni se cambian datos reales para intentar reproducirla.

## Qué falta del teléfono y del banco

1. **Red caída/restaurada en S24:** cuando ocurra una compra habitual con el
   teléfono sin conexión, comprobar que quede pendiente y llegue una sola vez
   al recuperar conexión. No realizar un gasto para probar ni reinstalar/borrar
   datos para forzar el caso. Revisar el aviso antes de confirmarlo.
2. **Negativos auténticos:** conservar únicamente un ejemplo anonimizado de
   pago, devolución y publicidad emitidos por el banco cuando aparezcan. Avisos
   de falabella.com u otras apps no acreditan el comportamiento de `cl.android`.
   No compartir códigos, nombres completos ni números de tarjeta.
3. **Actualización de un mismo aviso:** falta contrastar identidad/extras reales;
   las pruebas actuales de deduplicación usan fixtures y Room.
4. **Roadmap visual:** controles y generación probados mediante VM. La inspección
   de la URL local fue restringida; no se usaron rutas alternativas para eludirla.

El roadmap conserva abiertos los criterios dependientes de esa evidencia. Se
mantienen las positivas anteriores de reinicio, pantalla apagada y confirmación;
no se vuelve a pedir repetirlas sin un cambio o riesgo concreto.
