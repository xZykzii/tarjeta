# Auditoría de reglas · 2026-10-21

Se consultó el release activo de Firestore y su fuente mediante la API de reglas,
usando la sesión que el titular inició y autorizó personalmente con Firebase CLI.
La consulta fue de solo lectura: no leyó documentos financieros, no desplegó reglas
ni escribió datos. No se versionan cuenta, credenciales ni copia de la configuración
operativa. El registro de procedencia y la fuente quedan en el workspace privado.

## Evidencia

SHA-256 del archivo de reglas consultado:
`34f4387d89169d2c454e523d21697201e00b6af70165fb4d85926e51b43adeb2`.

La revisión estática confirmó aislamiento del documento principal por UID.
Las condiciones vigentes aún no aplican el contrato de revisión y pendientes
que exige el flujo nuevo. Por eso la auditoría no habilita su publicación.
No se probaron escrituras en producción ni se presupone que las reglas locales
estén desplegadas.

La propuesta `firestore.rules` conserva el acceso del titular, agrega revisión
monótona y valida el contrato mínimo de pendientes. Nueve pruebas previas con
SDK Firestore y emulador reales aprobaron aislamiento cruzado/anónimo,
concurrencia, rechazo de escritores antiguos, datos legados y captura mínima.
Se ejecutan con `npm run test:reglas`, exclusivamente contra `demo-cuotas-local`.

## Condiciones antes de publicar

- Coordinar las reglas de revisión con la PWA nueva y su renovación de caché.
- La propuesta local ya implementa transiciones atómicas con recibo inmutable,
  probadas en emulador. Revisar `BANDEJA_COMPRAS.md` y coordinar su activación.
- Verificar configuración, identidad y permisos del cliente Android antes de
  habilitar sincronización. El APK de diagnóstico no tiene Internet ni Firebase.
- Repetir las pruebas del emulador cuando cambien las reglas o persistencia.
- Obtener autorización expresa para el despliegue; esta auditoría no lo incluye.

La tarea 6.1 cubre inspección y aislamiento local. La propuesta de resolución
está probada localmente; despliegue y validación entre dispositivos siguen pendientes.

## Despliegue autorizado · 2026-10-21

El titular autorizó expresamente publicar la web y desplegar las reglas. Firebase
CLI compiló y activó `firestore.rules`; una lectura posterior del release activo
comprobó igualdad con la fuente local, normalizando únicamente CRLF/LF.

SHA-256 normalizado de las reglas activas:
`57f32d40cfc72ec7921a836145430732627e8e3528c606fe18775a2aeed4c3a5`.

Este despliegue supera el estado de propuesta local descrito en la auditoría
anterior. No leyó ni escribió documentos financieros. La prueba de Google y envío
desde el S24 continúa pendiente. Ver `PUBLICACION.md` para alcance y recuperación.
