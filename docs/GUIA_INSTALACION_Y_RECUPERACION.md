# Guía de Instalación, Configuración y Recuperación

Esta guía consolida la arquitectura, el despliegue, la configuración y los procedimientos de recuperación operativa para el sistema de control de cuotas y automatización de compras de Banco Falabella.

---

## 1. Arquitectura del Sistema

El sistema está compuesto por tres componentes desacoplados:

1. **PWA Web (`tarjeta`)**:
   - Aplicación HTML/CSS/JavaScript vanilla (ES Modules, sin framework).
   - Servida mediante GitHub Pages en `https://xzykzii.github.io/tarjeta/`.
   - Autenticación mediante Google Auth (Firebase JS SDK 13.1.0).
   - Persistencia optimista con control de revisión transaccional (CAS) en Firestore (`users/{uid}`).
   - Bandeja de compras sin asignar (`users/{uid}/comprasPendientes`) y recibos inmutables (`users/{uid}/comprasConfirmadas`).
   - Service Worker con estrategia de red con respaldo en caché (`cuotas-v21`).

2. **Android Diagnóstico (`cl.controlcuotas.companion`)**:
   - App Kotlin/Java nativa sin conexión a Internet ni Firebase.
   - Acceso a `NotificationListenerService` para filtrar avisos del paquete `cl.android`.
   - Resultados de diagnóstico volátiles en memoria (RAM), sin almacenamiento en disco ni deuda.

3. **Android Conectada (`cl.controlcuotas.companion.sync`)**:
   - App Kotlin/Java nativa con `applicationId` independiente.
   - Room SQLite local por UID para cola de envíos pendientes con persistencia mínima.
   - WorkManager con restricción de red y backoff exponencial para envío idempotente a Firestore.
   - Tras confirmación del servidor se vacían importe, comercio, terminación, versión del parser y recepción de la fila. Se conservan UID, eventId, hashes de clave/datos, postTime y estado para impedir reenvíos accidentales. Esto no acredita borrado físico de páginas SQLite/WAL ni protección frente a un dispositivo comprometido.
   - Cerrar sesión pausa envíos y conserva pendientes por UID; otra cuenta no los hereda. Desinstalar o borrar datos sí elimina la cola. No hacerlo como solución a un fallo de envío.

---

## 2. Configuración de Firebase y Seguridad

### 2.1. Reglas de Seguridad (`firestore.rules`)
Las reglas activas en producción exigen:
- **Titular autenticado**: `request.auth != null && request.auth.uid == uid && request.auth.token.firebase.sign_in_provider != 'anonymous'`.
- **Control de revisión en `users/{uid}`**: Cada escritura debe incrementar la revisión en exactamente 1 (`request.resource.data.revision == resource.data.revision + 1`).
- **Validación estricta de pendientes**: Los avisos en `comprasPendientes/{eventId}` deben crearse con `estado == 'sin_asignar'`, moneda `CLP`, `montoOriginal` entero positivo, sin textos brutos ni PAN completo.
- **Transacción atómica de confirmación**: La resolución a `estado == 'confirmada'` exige crear en la misma transacción el recibo inmutable en `comprasConfirmadas/{compraId}` y anexar las participaciones correspondientes al array de compras del usuario incrementando la revisión.

### 2.2. Configuración del Cliente Android (`android/sincronizacion.properties`)
Para compilar la variante conectada se requiere el archivo `android/sincronizacion.properties` (ignorado por Git):
```properties
PROJECT_ID=tu-proyecto
API_KEY=valor-del-cliente-android
APPLICATION_ID=identificador-firebase-del-cliente-android
WEB_CLIENT_ID=cliente-oauth-web.apps.googleusercontent.com
```

Son las claves exactas que consume `android/app/build.gradle.kts`; los valores
son marcadores, no una configuración utilizable. No publiques el archivo.

---

## 3. Instalación y Puesta en Marcha en Android (Samsung Galaxy S24)

### 3.1. Compilación de los APKs
Desde el directorio `android/`:
```powershell
# Ejecutar pruebas unitarias de Core y App
.\gradlew.bat :core:test :app:testDiagnosticoDebugUnitTest :app:testConectadaDebugUnitTest

# Compilar APKs debug firmados
.\gradlew.bat :app:assembleDiagnosticoDebug :app:assembleConectadaDebug
```
Los ejecutables se generan en:
- `android/app/build/outputs/apk/diagnostico/debug/app-diagnostico-debug.apk`
- `android/app/build/outputs/apk/conectada/debug/app-conectada-debug.apk`

### 3.2. Instalación en el Dispositivo
1. Copiar `app-conectada-debug.apk` al Samsung Galaxy S24 (o instalar mediante `adb install -r app-conectada-debug.apk`).
2. Abrir **Cuotas · conexión**.
3. **Conceder acceso a notificaciones**:
   - Ajustes > Aplicaciones > Menú (tres puntos) > Acceso especial > Acceso a notificaciones.
   - Activar el interruptor para **Cuotas · conexión**.
4. **Vincular cuenta Google**:
   - En la sección "Cuenta y sincronización", pulsar "Vincular mi Google".
   - Seleccionar la misma cuenta utilizada en la web PWA.
   - Activar el interruptor **"Guardar y enviar nuevos avisos a mi bandeja"**.
5. **Configuración de Batería en Samsung One UI**:
   - Ajustes > Aplicaciones > Cuotas · conexión > Batería > Seleccionar **"Sin restricciones"**.
   - Ajustes > Cuidado del dispositivo > Batería > Límites de uso en segundo plano > Comprobar que no esté en "Aplicaciones en suspensión profunda".

---

## 4. Procedimientos de Respaldo y Recuperación (Disaster Recovery)

### 4.1. Respaldo Manual y Preventivo
1. Abrir la PWA en el navegador.
2. Ir a la sección superior y pulsar **"Exportar"** > **"Descargar backup JSON"**.
3. El archivo descargado (`cuotas-backup-v7-YYYY-MM-DD.json`) contiene:
   - Versión de esquema (`version: 7`).
   - Compras con identificadores estables, orígenes (`manual` / `automatico`), planes de cuotas explícitos y cuotas asignadas.
   - Catálogos de personas y tarjetas.
   - Historial de transacciones y saldos.

### 4.2. Recuperación ante Conflicto de Guardado (`ConflictoGuardado`)
Si dos dispositivos intentan guardar simultáneamente o una sesión queda obsoleta:
1. La PWA bloquea nuevas escrituras y muestra el panel **"Hay cambios guardados en otro dispositivo"**.
2. Los cambios locales no guardados se retienen en memoria en la pestaña actual.
3. El usuario puede pulsar **"Descargar borrador"** para obtener un archivo JSON con los datos pendientes.
4. Pulsar **"Recargar"** para obtener la versión más reciente del servidor y aplicar los ajustes necesarios sobre la base actualizada.

### 4.3. Restauración desde Backup
1. Abrir la PWA e iniciar sesión.
2. En la sección de datos, pulsar **"Restaurar backup"** y seleccionar el archivo JSON.
3. El sistema valida la integridad de cada compra, plan y catálogo antes de reemplazar.
4. La restauración se ejecuta como una nueva transacción incrementando la revisión de la cuenta.

### 4.4. Reversión de Reglas de Seguridad (Rollback)
El comando de despliegue publica el archivo local actual; no selecciona una
versión anterior. Antes de recuperar reglas:

1. Conservar la fuente y el identificador del release activo fuera del repositorio.
2. Seleccionar una fuente conocida y revisada, compatible con CAS, recibos y
   confirmación atómica. No restaurar reglas permisivas ni clientes sin revisión.
3. Colocar esa fuente en `firestore.rules`, revisar el diff y ejecutar
   `npm run test:reglas` contra `demo-cuotas-local`.
4. Solo con autorización de publicación, desde la raíz del repositorio:

```powershell
.\node_modules\.bin\firebase.cmd deploy --only firestore:rules --project tarjeta-cuotas
```

Después, leer el release activo y comparar su fuente con la aprobada; el éxito
del CLI solo no demuestra que la versión prevista quedó activa. Este procedimiento
se revisó sin ejecutar un rollback en producción. El hash de las reglas auditadas es:
`57f32d40cfc72ec7921a836145430732627e8e3528c606fe18775a2aeed4c3a5`.

---

## 5. Matriz de Límites y Restricciones Técnicas

| Parámetro | Límite / Criterio | Justificación |
|---|---|---|
| Moneda | Únicamente `CLP` | Sin soporte multimoneda ni conversión cambiaria |
| Formato de dinero | Planes y aportes nuevos: enteros seguros; históricos: decimales numéricos conservados | No convertir texto ni redondear saldos legados; rechazar negativos, no finitos y desbordamientos |
| Cuotas máximas | 120 cuotas | Límite financiero seguro |
| Bandeja pendientes | 100 avisos simultáneos | Control de cuota de lectura y memoria UI |
| Identificador de evento | `[a-zA-Z0-9_-]{16,128}` | Idempotencia y deduplicación |
| Almacenamiento local | Vaciar campos financieros tras respuesta confirmada | Conserva metadatos por UID; no es borrado forense |
