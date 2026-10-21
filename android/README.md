# Cuotas · app Android complementaria

Dos variantes del proyecto: **diagnóstico local**, sin Internet ni persistencia
de compras, y **conectada**, con Google Auth, cola Room por cuenta y WorkManager.
La conectada tiene otro applicationId y consentimiento independiente; su envío
real en S24 está pendiente. Ninguna registra deuda automáticamente.
Configuración y alcance de la conectada: [CONEXION_FIREBASE.md](CONEXION_FIREBASE.md).

La instalación y concesión de acceso en el teléfono corresponden al titular.
Compilar o pasar tests no demuestra que el banco entregue sus extras al listener.

## Construir en Windows

Toolchain fijado: Gradle 8.11.1, Android Gradle Plugin 8.9.2, Kotlin 2.2.21,
compile/target API 35 y mínimo API 28. JDK 21 ejecuta Gradle; el bytecode usa 17.
No requiere Android Studio completo, servicios de Google ni credenciales.

1. Instalar las herramientas oficiales y los paquetes `platforms;android-35`,
   `build-tools;35.0.0`, `platform-tools`, aceptando previamente la licencia SDK.
2. Definir `ANDROID_HOME` solo en la terminal o escribir `sdk.dir=C:/ruta/al/sdk`
   en `android/local.properties` (ignorado por Git).
3. Desde esta carpeta:

```powershell
.\gradlew.bat :core:test :app:testDiagnosticoDebugUnitTest :app:lintDiagnosticoDebug :app:assembleDiagnosticoDebug
```

El APK queda en `app/build/outputs/apk/diagnostico/debug/app-diagnostico-debug.apk`. Es de diagnóstico,
firmado con clave debug local; no es un lanzamiento ni está publicado.
La distribución de Gradle se verifica con SHA-256 desde el wrapper.

Sin SDK, comprobar exclusivamente el núcleo Kotlin:

```powershell
.\gradlew.bat -PsoloNucleo=true :core:test
```

En este workspace las herramientas están fuera del repo, en
`work/herramientas/`; `local.properties` enlaza el SDK. No se cambió el PATH
global. No versionar SDK, cachés, APK, firmas, configuración Firebase ni logs.

## Qué hace el diagnóstico

- Inicia con diagnóstico desactivado. Exige consentimiento dentro de la app y,
  por separado, autorización del sistema en Ajustes.
- Comprueba localmente que existe el paquete `cl.android`, correspondiente a la
  ficha de Banco Falabella Chile confirmada por el usuario. No autentica el banco
  mediante su etiqueta o logo ni afirma verificar su firma de distribución.
- Filtra paquete y resúmenes antes de acceder a extras. Solo lee título, texto y
  texto ampliado de nuevos avisos permitidos. No enumera notificaciones antiguas.
- Reconoce conservadoramente la gramática de la captura anonimizada. Un texto
  distinto, ambiguo, con controles o demasiado largo se ignora. La terminación
  tiene cuatro dígitos; no se recopila un PAN completo.
- Muestra el último resultado normalizado solo en memoria. No guarda textos
  brutos, compras, hora bancaria, referencia ni cuotas. No registra texto en logs.
- Cuenta callbacks, incluyendo posibles actualizaciones; ese número no equivale
  a compras únicas. No presenta deduplicación ni sincronización como implementadas.
- Pausar limpia resultados y bloquea nuevas lecturas. El permiso Android puede
  revocarse desde Ajustes. No se concede ni se revoca mediante comandos ADB.
- Impide transferir su preferencia de consentimiento mediante backup de la app.

## Evidencia y pruebas

`core` no depende de Android. Veinticuatro casos en el corpus JSON compartido con la
PWA y cuatro pruebas de privacidad verifican gramática, límites y que el callback
de lectura no se ejecute para otras apps, resúmenes o falta de consentimiento.

Los positivos se anonimizan a partir de la captura; el reparto en extras y todos
los negativos son sintéticos. Los mismos veinticuatro casos se ejecutan en Node.
No sustituyen muestras negativas auténticas ni la prueba del S24.

Las pruebas de componentes ejecutan Activity y servicio bajo Robolectric con
datos ficticios. Comprueban inicio desactivado, apertura de Ajustes sin otorgar
acceso, filtrado/normalización y limpieza al pausar. No son callbacks entregados
por un teléfono real, ni certifican restricciones de Samsung o duración en segundo plano.

Validación de 0.1.1 del 2026-10-21: 28 pruebas del núcleo y tres de componentes
aprobadas; APK debug compilado y firma verificada. Incluye «Tu Adicional compró»
sin conservar su nombre ni asignar persona automáticamente. La primera positiva
real de 0.1.0 («Compraste») está documentada; la variante nueva requiere prueba propia.
Lint: cero errores y una advertencia `ObsoleteSdkInt` por carpeta vacía
`mipmap-anydpi-v26`; los recursos efectivos están en `mipmap-anydpi`.
La revisión automática rechazó el comando de limpieza de esa carpeta y repetición
de lint, sin detallar el motivo; no se reintentó por otra vía. No afecta al APK generado.

## Continuidad

La variante conectada ya implementa cola Room, identidad persistente, WorkManager
y sesión Firebase, conservando el corpus común. El diagnóstico continúa sin cola.
Falta comprobar el flujo conectado en S24, activar reglas/PWA coordinadamente y
validar negativos auténticos y actualizaciones. No se asignan capturas sin UID a
una futura cuenta ni se declara validación integral por la primera positiva.

La guía de comprobación física está en [PRUEBA_S24.md](PRUEBA_S24.md).
Estado completo en [ESTADO_PROYECTO.md](../ESTADO_PROYECTO.md).

## Referencias oficiales consultadas

- [Listener y ciclo de conexión](https://developer.android.com/reference/android/service/notification/NotificationListenerService).
- [Herramientas y descargas SDK](https://developer.android.com/studio) y [licencia](https://developer.android.com/studio/terms).
- [Compatibilidad AGP 8.9](https://developer.android.com/build/releases/agp-8-9-0-release-notes).
- [Compatibilidad Kotlin/Gradle/AGP](https://kotlinlang.org/docs/gradle-configure-project.html).
- [Gradle 8.11.1](https://docs.gradle.org/8.11.1/release-notes.html).
- [Robolectric 4.14.1](https://github.com/robolectric/robolectric/releases/tag/robolectric-4.14.1).
