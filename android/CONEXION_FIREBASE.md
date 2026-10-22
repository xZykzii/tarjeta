# Variante conectada · preparación y validación

La variante `conectada` compila como `cl.controlcuotas.companion.sync` y se instala
separadamente de **Cuotas · diagnóstico** (`cl.controlcuotas.companion`). Cada una
requiere su propio consentimiento y acceso Android. El diagnóstico conserva su
funcionamiento local sin Internet.

## Estado del 2026-10-21

- Registro Android y huellas SHA-1/SHA-256 debug creados en el proyecto Firebase
  existente. Se obtuvo su configuración SDK y cliente OAuth web.
- Configuración validada por proyecto, paquete e ID; solo cuatro identificadores
  públicos SDK se escribieron en `android/sincronizacion.properties`, ignorado por Git.
  No contiene service accounts, contraseñas bancarias ni claves privadas.
- El titular autorizó publicar la PWA y desplegar reglas el 2026-10-21. Las reglas
  ya están activas y verificadas; entrega web documentada en `docs/PUBLICACION.md`.
  No se modificaron documentos financieros. Firebase CLI no inicia sesión en el teléfono.
- El titular confirmó Google, detección y envío, persistencia tras reinicio y
  funcionamiento con pantalla apagada en su S24. Son comprobaciones reportadas,
  no ejecuciones físicas del agente. El titular confirmó 0.2.1 instalada y reconexión
  tras revocar/restaurar el permiso. Quedan negativos auténticos y recuperación
  sin red; detalles de la continuación en `docs/VALIDACION_CONTINUA.md`.

## Autorizar en el teléfono cuando se active la entrega

1. Instalar el APK conectado, que se identifica como **Cuotas · conexión**.
2. Leer la explicación, activar el diagnóstico y conceder acceso a notificaciones
   en Ajustes. No concederlo mediante ADB ni eludir advertencias del sistema.
3. Abrir **Cuenta y sincronización**. Seleccionar personalmente el mismo Google
   que en la PWA y revisar el consentimiento oficial de Google. No compartir
   contraseñas, códigos ni tokens con el agente.
4. Verificar la cuenta mostrada. Activar por separado **Guardar y enviar nuevos
   avisos a mi bandeja**. Sin cuenta y autorización no se persisten nuevas compras.
5. Una compra nueva reconocida queda en la cola de esa cuenta. **Actualizar estado**
   muestra cuántos avisos siguen pendientes. Cero pendientes de envío no significa
   deuda registrada: en la web aún hay que revisar y confirmar cada aviso.
6. Pausar o salir impide nuevos envíos y cancela el trabajo de la cuenta. Una
   solicitud ya en curso podría completarse. La cola existente sigue asociada
   al UID original y no se reasigna al iniciar otra cuenta.

Las reglas nuevas ya permiten la subcolección del mismo UID. Si un aviso quedó
en cola por el rechazo de las reglas anteriores, puede solicitarse reintento;
no hay que repetir la compra ni introducirla otra vez para provocar un envío.
Si persiste un error de acceso, comprobar la cuenta y comunicar el estado visible
sin borrar datos de la app ni compartir credenciales.

## Persistencia e identidad

Room guarda solo ID de evento, UID, identidad de notificación anonimizada,
metadatos temporales separados, monto, comercio, terminación y versión del parser.
No guarda nombre del adicional, textos brutos, enlaces, OTP ni información de
otras apps. El filtro por paquete y consentimiento ocurre antes de leer extras.
No se enumeran avisos antiguos; la cola rechaza notificaciones con publicación
anterior a la autorización de sincronización de la cuenta.

Una transacción local conserva el ID del primer callback de la misma combinación
de UID, clave anonimizada, `postTime` y datos normalizados. Un reintento usa ese
ID. Dos avisos con igual monto/comercio y distinta identidad siguen siendo dos
compras posibles; no se fusionan por similitud. Un cambio de contenido también
se conserva separadamente para revisión.

Esto deduplica entregas de una identidad Android, **no prueba una identidad
bancaria global**. Si el emisor renueva clave o publicación, una actualización
podría producir otro pendiente. Dos teléfonos pueden recibir avisos de la misma
compra con identidades diferentes. Falta observar esos casos y referencias
auténticas antes de certificar deduplicación entre dispositivos.

WorkManager exige red disponible y cuenta/consentimiento vigentes. Usa lotes
pequeños, continuación tras éxito y backoff exponencial ante fallos temporales.
Un rechazo de acceso conserva la cola y exige revisión/reintento. El servidor se
consulta antes de crear: una captura existente, incluso resuelta, no se reabre.

Tras confirmarse la recepción se limpian importe, comercio, terminación y versión
del registro local; queda una marca mínima de identidad para impedir reenviarlo.
No se purgan automáticamente identidades ni pendientes sin una política validada.
Cerrar sesión conserva esos pendientes por UID; no garantiza borrado físico de
SQLite/WAL ni protección frente a un dispositivo comprometido.
La cola tiene un límite local explícito; alcanzarlo genera un estado de error,
nunca elimina compras para hacer espacio. Un conflicto de ID también se informa.

Backup y transferencia del sistema excluyen bases y preferencias. La app no
recupera la cola tras desinstalar o borrar sus datos. Tampoco promete entrega
inmediata si Android/Samsung detiene el proceso, revoca acceso o no hay red.

## Compilar y comprobar

Desde `android/`:

```powershell
.\gradlew.bat :core:test :app:testDiagnosticoDebugUnitTest :app:testConectadaDebugUnitTest
.\gradlew.bat :app:lintDiagnosticoDebug :app:lintConectadaDebug
.\gradlew.bat :app:assembleDiagnosticoDebug :app:assembleConectadaDebug
```

Los APK quedan en `app/build/outputs/apk/{diagnostico,conectada}/debug/`.
Son debug firmados con la clave local de desarrollo, no lanzamientos en Play.
La configuración local no se exporta a backups ni se versiona. Al cambiar la
clave de firma hay que registrar sus nuevas huellas antes de probar Google.

Dependencias fijadas para el entorno API 35: Firebase BoM 34.4.0, Room 2.7.2,
WorkManager 2.10.1, Credentials 1.5.0 y Google ID 1.1.1. Room usa procesador Java
porque entidades/DAO están en Java; no requiere KSP ni kapt para este proyecto.

Pruebas: corpus JVM, privacidad, componentes Activity/servicio y Room real bajo
Robolectric. La cola verifica identidad estable, separación de UID, persistencia
al reabrir SQLite, limpieza tras envío, límite y colisión de ID. El contrato de
envío comprueba reintentos contra estados terminales. El caso de pantalla sin
configuración se omite cuando ya hay configuración local; se probó previamente
en la compilación sin configuración. Ningún test usa una cuenta real del titular.

En 0.2.1, cada señal y continuación usa `APPEND_OR_REPLACE`: deja un trabajo
sucesor aunque el anterior haya contado cero pendientes y aún no haya terminado.
`KEEP` podía descartar esa señal. Seis pruebas con Room/WorkManager reales
cubren esa ventana, serialización, recuperación tras fallo, pausa y separación
de cuentas. El envío de red se sustituye en esas seis pruebas; no equivalen a
comprobar la nueva versión en el S24. Referencia de política:
<https://developer.android.com/reference/androidx/work/ExistingWorkPolicy>.

## Fuentes oficiales

- [Firebase y Google Auth Android](https://firebase.google.com/docs/auth/android/google-signin).
- [Credential Manager](https://developer.android.com/identity/sign-in/credential-manager-siwg).
- [Room y versiones](https://developer.android.com/jetpack/androidx/releases/room).
- [WorkManager y versiones](https://developer.android.com/jetpack/androidx/releases/work).
- [Firebase Android SDK](https://firebase.google.com/support/release-notes/android).
