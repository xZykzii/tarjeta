# ADR-001: Captura nativa y revisión separada de la deuda

**Estado:** aceptada para desarrollo local; integración y despliegue pendientes de validación.
**Fecha:** 2026-10-21.
**Responsable:** agente de desarrollo; configuración de cuenta, acceso Android y pruebas físicas corresponden al usuario.

## Contexto

La PWA actual no dispone de la API nativa para observar otras aplicaciones Android. La notificación es un aviso informativo, no una fuente que pruebe la liquidación bancaria. La captura positiva permite documentar una gramática provisional. El usuario confirmó Galaxy S24 y la app de la ficha oficial `cl.android`; faltan observar el emisor y los extras en el teléfono y obtener negativos auténticos. No hay acceso a credenciales bancarias ni se necesita.

## Decisión

App complementaria Kotlin independiente en `android/`, con `NotificationListenerService`, consentimiento en Ajustes y filtro estricto por `StatusBarNotification.packageName` verificado. Primero filtrar el paquete; después leer exclusivamente los campos necesarios. No abrir enlaces ni ejecutar acciones de la notificación. Ignorar resúmenes de grupos para no duplicar eventos. No intentar recuperar secretos ni eludir redacciones del sistema.

El servicio solo captura. Un analizador conservador, basado en ejemplos auténticos, produce un registro tipado o rechaza el aviso. Formatos desconocidos, publicidad, pagos, abonos y devoluciones no se convierten en compras. Datos incompletos de una compra reconocida pueden quedar en revisión, sin inventar monto, comercio, tarjeta, fecha bancaria o cuotas.

Tras autenticar al mismo usuario de Firebase, una cola Room guarda únicamente campos mínimos normalizados y una identidad persistente. WorkManager reintenta el envío con red disponible. Android escribe exclusivamente en `users/{uid}/comprasPendientes/{eventId}` con el mismo ID en cada intento. La PWA escucha esa subcolección mediante `onSnapshot`; nunca suma pendientes a `items`, saldos, resúmenes o PDF.

La confirmación será una transacción online: leer pendiente y documento de usuario, validar revisión y entidades, crear una compra mediante el mismo motor que el registro manual, incorporar un identificador estable y marcar el pendiente como confirmado con ese identificador. Repetir la petición devuelve la compra existente. Descartar cambia el estado y conserva una marca para impedir que un reintento lo recree. No borrar pendientes resueltos sin una política de retención de identidades de deduplicación.

**Por qué:** separar captura, revisión y deuda impide que un aviso incompleto modifique obligaciones financieras y permite reintentar sin crear compras nuevas.

## Opciones consideradas

| Opción | Complejidad | Coste adicional | Mantenimiento | Evaluación |
| --- | --- | --- | --- | --- |
| Solo PWA | Baja | Ninguno | Bajo | No accede al servicio Android requerido. |
| Automatizador de terceros | Media | Depende de proveedor | Dependencia externa y exposición adicional | No elegido: añade intermediarios para datos financieros y dificulta reproducir pruebas. |
| App Kotlin + Firebase existente | Media | Lecturas/escrituras del proyecto actual | API Android oficial y un único backend | Elegida para desarrollo. |
| Backend nuevo con funciones administrativas | Alta | Despliegue y operación adicional | Más infraestructura y privilegios | No necesario para la captura inicial; reconsiderar si las reglas no pueden imponer el contrato. |

## Contrato propuesto de pendientes v1

Ruta: `users/{uid}/comprasPendientes/{eventId}`. `uid` deriva de la sesión y de la ruta, nunca de un campo confiado del mensaje.

| Campo | Tipo / regla |
| --- | --- |
| `schemaVersion` | entero `1` |
| `estado` | `sin_asignar`, `confirmada`, `descartada` |
| `origen` | `automatico` |
| `moneda` | `CLP`; otras monedas se rechazan hasta definir conversión explícita |
| `montoOriginal` | entero CLP positivo o `null` si una compra reconocida no lo trae |
| `comercio` | texto limitado o `null` |
| `fechaCompra`, `horaCompra` | `YYYY-MM-DD`, `HH:mm[:ss]` o `null`; no sustituir fecha bancaria por fecha de recepción |
| `tarjetaUltimos4` | cuatro dígitos o `null`; nunca PAN completo |
| `referenciaHash` | hash de referencia cuando exista, no texto bancario completo |
| `recibidaEn` | timestamp real de recepción; separado del momento de compra |
| `creadaEn`, `resueltaEn` | timestamps de servidor; resolución solo al confirmar o descartar |
| `parserVersion` | versión del analizador basado en evidencia |
| `compraId` | ID estable solo cuando se confirma |

Ni persona ni tarjeta de la PWA se asignan por inferencia. La revisión valida que existan en los catálogos actuales. Los datos de origen se mantienen separados de las correcciones de revisión.

## Identidad y duplicados

Preferir referencia bancaria estable si se confirma que identifica una transacción; usar un hash acotado al UID. En ausencia de ella, persistir la identidad de la instancia de notificación en Room y reutilizar `eventId` para todas sus actualizaciones y reintentos. No deduplicar solo por monto/comercio/minuto: dos compras legítimas pueden coincidir.

La reutilización de IDs Android y las agrupaciones dependen del comportamiento real del emisor. Probarlas antes de declarar deduplicación completa. Una captura de pantalla verifica texto visible, pero no revela por sí sola `packageName`, `key`, `id`, `tag`, `when` ni cómo se actualiza una notificación.

## Seguridad y cuenta

Credential Manager + Firebase Google Auth en el mismo proyecto. Registrar el applicationId Android y huellas SHA correspondientes; comparar UID entre web y móvil. No copiar tokens ni service accounts al repositorio. Configuración específica y archivos de firma quedan fuera de Git; las claves de cliente Firebase no sustituyen reglas.

Reglas deben exigir autenticación y UID de la ruta, validar campos/tipos/tamaños/estados, impedir que la captura modifique estados resueltos y controlar la atomicidad de confirmación. Ningún secreto incrustado diferencia un cliente Android legítimo de otro cliente del mismo usuario. El listener limita el paquete en el dispositivo; Firestore no puede certificar que un payload procede del banco. Por eso confirmar siempre exige revisión del titular.

## Compatibilidad y concurrencia obligatorias

1. El escritor legado `save()` reemplaza arrays completos. Una transacción solo en confirmar **no** elimina el riesgo de que otro cliente sobrescriba la compra después.
2. Añadir control de revisión y transacciones a todos los escritores. Rechazar una base obsoleta con un conflicto visible y conservar el borrador; nunca sobrescribir silenciosamente ni reintentar una lista vieja contra una revisión nueva.
3. Versionar y probar reglas para rechazar escritores antiguos antes de habilitar el flujo nuevo. La PWA debe renovar su caché, pero no basta con suponer que todas las pestañas antiguas ya se cerraron.
4. Mantener respaldo y lectura de datos v6. Ninguna migración destructiva ni escritura de producción forma parte de esta entrega.
5. `monto` histórico es cuota fija. Introducir un plan explícito de enteros y un adaptador para registros legados. Cambiar de manera coordinada pagos, abonos, deshacer, resúmenes, PDF y backups; no conectar parcialmente el motor.

## Restricciones y consecuencias

El listener necesita autorización del usuario y conexión del servicio; no promete entrega si el banco no notifica, Android oculta texto, se revoca el permiso o el fabricante detiene procesos. Algunas notificaciones con OTP pueden llegar redactadas. La cola persistente favorece recuperación, pero no garantiza inmediatez bajo restricciones del sistema.

La captura continúa sin la web abierta. La **confirmación** requiere conexión para leer y escribir atómicamente. Un envío pendiente se muestra como tal, nunca como sincronizado antes de confirmación del servidor. Cerrar sesión invalida el envío y evita que una cola del usuario anterior se asigne al nuevo UID.

Pendientes externos: negativos auténticos, extras y emisor observados en el S24, versión Android/One UI, registro de app/huellas en Firebase y validación física. La auditoría de reglas actuales se completó por lectura del release y su fuente; no se leyeron documentos ni se modificó producción. Ver `AUDITORIA_REGLAS.md`.

### Primera etapa implementada

`android/` contiene la app Kotlin, listener protegido, consentimiento separado del permiso Android y núcleo JVM con corpus compartido con JS. El diagnóstico inicial es voluntario y solo mantiene el último resultado normalizado en RAM. No dispone de permiso de Internet, Firebase, Room, WorkManager ni cola persistente. Se evita persistir compras sin UID para que no se atribuyan después a otra cuenta.

El titular aceptó la licencia SDK e instalación local de herramientas. SDK API 35, Build Tools 35.0.0 y Platform Tools están fuera del repositorio; no se cambió el PATH global. Gradle 8.11.1/AGP 8.9.2/Kotlin 2.2.21 generan un APK debug firmado. Pasaron 19 pruebas JVM y tres de componentes bajo Robolectric, además de 68 Node. Lint no tiene errores y conserva una advertencia de carpeta vacía con calificador redundante. Ninguna de estas pruebas demuestra entrega real de notificaciones o comportamiento de Samsung. Guía física: `android/PRUEBA_S24.md`.

## Fuentes oficiales consultadas — 2026-10-21

- [NotificationListenerService](https://developer.android.com/reference/android/service/notification/NotificationListenerService): contrato, permiso de enlace, paquete emisor y ciclo de conexión.
- [Trabajo persistente Android](https://developer.android.com/develop/background-work/background-tasks/persistent?hl=en): programación y restricciones de trabajo diferible.
- [Cambios de Android 15](https://developer.android.com/about/versions/15/behavior-changes-all): redacción de contenido OTP para listeners no confiables.
- [Firestore sin conexión](https://firebase.google.com/docs/firestore/manage-data/enable-offline): persistencia móvil y comportamiento ante escrituras sobre un mismo documento.
- [Transacciones Firestore](https://firebase.google.com/docs/firestore/manage-data/transactions): reintentos, atomicidad y restricciones offline.
- [Reglas por usuario](https://firebase.google.com/docs/firestore/security/rules-conditions): autenticación y comparación del UID.
- [Google Auth Android](https://firebase.google.com/docs/auth/android/google-signin): Credential Manager, configuración y huellas.

## Acciones trazadas

Ver tareas `1.3`, `2.*`, `3.*`, `4.3`, `5.1` y `6.1` en el roadmap. Ninguna decisión de diseño equivale a una prueba de implementación.
