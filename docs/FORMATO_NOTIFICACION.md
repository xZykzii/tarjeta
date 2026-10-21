# Evidencia de formato y alcance del analizador

El 2026-10-21 el usuario aportó una captura real de una notificación de compra, con etiqueta visible Banco Falabella. No se publica la captura ni su importe, comercio o terminación real en este repositorio.

Transcripción **anonimizada** que conserva la estructura y puntuación visibles:

```text
Compraste $1.000 en COMERCIO DE EJEMPLO   CHL
Con tu CMR Mastercard Elite terminada en 0000. Si no la realizaste tú, revisa los movimientos de tus adicionales en tu app.
```

Confirmado por la imagen: verbo de compra, monto total con separador de miles, comercio y terminación de cuatro dígitos. El texto se muestra en varias líneas por el ancho de pantalla. La fecha/hora de la interfaz es recepción/presentación y no prueba el momento bancario exacto. No aparecen cuotas, intereses, referencia ni una fecha de transacción dentro del texto.

El usuario confirmó Samsung Galaxy S24 y que la app instalada corresponde a la ficha oficial de Banco Falabella Chile, paquete `cl.android`. Todavía **no** observado físicamente: packageName del aviso recibido, qué texto corresponde a `EXTRA_TITLE`, `EXTRA_TEXT`, `EXTRA_BIG_TEXT` o líneas de grupo; identidad y actualizaciones del aviso; formatos de pago, abono, reversa, devolución o publicidad.

`falabella-notificaciones.mjs` y su puerto Kotlin en `android/core` son analizadores conservadores de este único formato documentado. Quince casos compartidos ejecutados en Node y JVM usan importes, comercios y terminaciones ficticios. Los negativos y la distribución en extras son sintéticos; no equivalen a captura física. La app de diagnóstico comprueba localmente que existe `cl.android`, exige consentimiento y filtra ese paquete antes de leer los tres extras permitidos. Un formato desconocido se rechaza sin generar compra. Posteriormente se verificó la primera compra real en el S24 comparando la notificación con el resultado de la app: un aviso y un reconocimiento, con monto, comercio y terminación coincidentes. La distribución exacta de extras no se observa en las capturas. La validación integral y los negativos auténticos siguen pendientes.

Para verificar el paquete sin adivinarlo: abrir información de la app desde la notificación y comprobar su ficha de instalación o, con ADB autorizado por el titular, inspeccionar el paquete instalado. Luego capturar los extras pertinentes en un diagnóstico local y voluntario; nunca subir un volcado completo de notificaciones ni contenidos de otras aplicaciones al repositorio.

Nueva condición del usuario: repartir compras entre personas con importes libres, no solamente iguales. Ejemplo ficticio: $1.000 → Persona A $700, Persona B $300. Un reparto afecta el plan completo; si tiene intereses, los importes asignados corresponden al total final mostrado explícitamente. No se duplica la transacción bancaria: se enlazan participaciones a una sola compra y una sola confirmación.

## Segundo formato auténtico: compra de adicional

El usuario aportó otra captura, que la versión 0.1.0 no reconoció. Gramática
anonimizada conservando las frases y puntuación:

```text
Tu Adicional compró $2.000 en COMERCIO ADICIONAL
Realizada por PERSONA DE EJEMPLO con su CMR Adicional terminada en 1111. Si tienes algún problema, comunícate con nosotros.
```

El analizador v2 acepta esta gramática completa en JS y Kotlin. Solo devuelve
importe, comercio y terminación; el nombre se valida y se descarta. Nunca asigna
la persona de la PWA a partir del titular mencionado. Los resúmenes de grupo
siguen ignorados; el aviso individual se procesa por separado.

Corpus compartido: 24 casos, incluidos nueve de este formato y sus variantes
sintéticas. APK 0.1.1 compilado, firmado y con 31 pruebas Android aprobadas.
La recepción física de esta variante corregida está pendiente de comprobación;
la positiva ya verificada en S24 corresponde al formato «Compraste» de 0.1.0.
No se guardan la captura financiera, su nombre real ni avisos de otras apps en Git.
