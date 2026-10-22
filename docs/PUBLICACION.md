# Publicación y recuperación · 2026-10-21

**Corrección posterior a la auditoría:** la versión publicada usa
`cuotas-v21`, Firebase JS 13.1.0 y jsPDF 4.2.1. Incluye historial protegido,
validación de saldos y APK conectado 0.2.1 con programación corregida. Esta
corrección fue publicada en `5312795`: Pages `39700219186` aprobada y 27
archivos públicos coincidentes, HTTP 200/MIME válido. El titular ya confirmó
0.2.1 instalada y reconexión de permiso; continúa pendiente recuperación sin red. Los resultados siguientes describen las entregas públicas
anteriores. Estado actual: `CORRECCIONES_AUDITORIA.md`.

El titular autorizó expresamente subir los commits, publicar GitHub Pages y
desplegar reglas de Firestore. El alcance excluye migrar, consultar o editar sus
documentos financieros para verificar la entrega.

## Entrega

- Aplicación: <https://xzykzii.github.io/tarjeta/>.
- GitHub Pages publica `main` desde la raíz del repositorio.
- Publicación funcional inicial: commit `8596ee9`, sobre la base `58ebee8`.
- Caché de aquella entrega: `cuotas-v20`, con el ajuste de confirmación.
- GitHub Pages completó correctamente la entrega funcional:
  <https://github.com/xZykzii/tarjeta/actions/runs/39667206844>.
- Se descargaron 20 archivos de la aplicación, incluidos todos los recursos del
  precaché y `sw.js`: HTTP 200, contenido igual al commit publicado, normalizando
  únicamente CRLF/LF en texto. Los módulos se sirven con MIME JavaScript válido.
- Reglas: compilación y despliegue mediante Firebase CLI, seguidos de lectura del
  release activo para comparar con la fuente local. Hash en `AUDITORIA_REGLAS.md`.
- Se conservó fuera de Git un respaldo de las reglas anteriores y la evidencia
  de la entrega. No se versionan credenciales, configuración local ni datos reales.

Se activaron primero las reglas para impedir guardados sin control de revisión,
y después se avanzó `main` sin forzar ni sobrescribir cambios remotos. Un cliente
anterior puede recibir rechazo de guardado hasta recargar la aplicación.

## Verificación y límites

Antes de la publicación inicial aprobaron 84 pruebas Node, 16 de SDK Firestore con emulador y
43 ejecuciones Android; un caso sin configuración se omitió después de configurar
el SDK, habiéndose probado previamente sin configuración. Ambos APK compilan y
tienen firma válida. Las pruebas de reglas usan únicamente `demo-cuotas-local`.

El ajuste posterior de confirmación aprobó 88 pruebas Node y pruebas UI con datos
ficticios: fecha e importe sugeridos, tarjeta preferida editable, asignación individual,
reparto desplegable, cuotas con/sin intereses y personalizadas, preservación de
correcciones, tarjeta ausente y cancelación sin deuda. No cambia APK, parser ni
reglas. Recargar la web entrega el ajuste; no requiere reinstalar la app Android.

La entrega pública se comprueba mediante estado de GitHub Pages y descarga de
los archivos estáticos contra el contenido versionado. No requiere abrir la
cuenta real de la PWA ni escribir una compra ficticia en producción.

La interfaz se ejecutó con datos ficticios: confirmación, descarte, reparto
700/300 y 500/500, cuotas exactas, cancelación, errores, caché y cierre de sesión.
No sustituye la prueba física de Google y sincronización en el S24. No se da por
terminada la integración por publicar código o registrar el cliente Android.

## Instalar y probar en el S24

1. Recargar la web para recibir la nueva versión y acceder con el Google habitual.
2. Instalar **Cuotas · conexión** (`cl.controlcuotas.companion.sync`), que es una
   app separada del diagnóstico anterior. No es necesario desinstalar diagnóstico.
3. Conceder personalmente su acceso Android y seguir `android/CONEXION_FIREBASE.md`:
   misma cuenta Google, después autorización separada para guardar y enviar avisos.
4. Esperar un aviso nuevo de una compra habitual. No realizar un gasto de prueba.
5. Revisar **Compras sin asignar** en la web. Elegir fecha, tarjeta, cuotas y reparto;
   solo confirmar incorpora la deuda. Descartar un duplicado no registra deuda.

La variante adicional «Tu Adicional compró» está corregida en ambos APK, pero
continúa pendiente de comprobación física. No se recuperan avisos antiguos.

## Recuperación

- Ante conflicto, conservar el borrador o descargarlo y actualizar antes de decidir
  qué aplicar. Nunca reintentar automáticamente un borrador sobre otra revisión.
- Ante fallo del envío Android, conservar la app y sus datos. Verificar cuenta,
  red y consentimiento; usar reintento. No reinstalar ni borrar la cola para probar.
- Ante fallo grave, pausar sincronización y conservar pendientes y recibos. Preparar
  una corrección compatible con CAS y las reglas actuales, verificarla localmente
  y publicarla sin escrituras de prueba en los datos del titular.
- No restaurar la interfaz anterior sin CAS ni reglas permisivas como solución a
  un fallo de guardado: reabriría la posibilidad de sobrescrituras silenciosas.
- Los recibos originales son inmutables. No borrar eventos o identidades locales
  para ocultar errores; estudiar la evidencia anonimizada antes de corregirlos.

Señales para detener la prueba: cuenta distinta, deuda que cambia antes de
confirmar, duplicación al reintentar o pérdida de pendientes. Estos casos requieren
diagnóstico; publicar archivos estáticos no acredita que hayan ocurrido ni que
los flujos físicos ya estén validados.
