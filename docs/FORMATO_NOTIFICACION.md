# Evidencia de formato y alcance del analizador

El 2026-10-21 el usuario aportó una captura real de una notificación de compra, con etiqueta visible Banco Falabella. No se publica la captura ni su importe, comercio o terminación real en este repositorio.

Transcripción **anonimizada** que conserva la estructura y puntuación visibles:

```text
Compraste $1.000 en COMERCIO DE EJEMPLO   CHL
Con tu CMR Mastercard Elite terminada en 0000. Si no la realizaste tú, revisa los movimientos de tus adicionales en tu app.
```

Confirmado por la imagen: verbo de compra, monto total con separador de miles, comercio y terminación de cuatro dígitos. El texto se muestra en varias líneas por el ancho de pantalla. La fecha/hora de la interfaz es recepción/presentación y no prueba el momento bancario exacto. No aparecen cuotas, intereses, referencia ni una fecha de transacción dentro del texto.

Todavía **no** confirmado: packageName, qué texto corresponde a `EXTRA_TITLE`, `EXTRA_TEXT`, `EXTRA_BIG_TEXT` o líneas de grupo; identidad y actualizaciones del aviso; formatos de pago, abono, reversa, devolución o publicidad.

`falabella-notificaciones.mjs` será un analizador conservador de este único formato documentado. Los tests usan importes, comercio y terminaciones ficticios; no equivalen a captura física de notificaciones. No se activa captura sin comprobar el paquete en el dispositivo. Un formato desconocido se rechaza sin generar compra. No se presenta como analizador definitivo.

Para verificar el paquete sin adivinarlo: abrir información de la app desde la notificación y comprobar su ficha de instalación o, con ADB autorizado por el titular, inspeccionar el paquete instalado. Luego capturar los extras pertinentes en un diagnóstico local y voluntario; nunca subir un volcado completo de notificaciones ni contenidos de otras aplicaciones al repositorio.

Nueva condición del usuario: repartir compras entre personas con importes libres, no solamente iguales. Ejemplo ficticio: $1.000 → Persona A $700, Persona B $300. Un reparto afecta el plan completo; si tiene intereses, los importes asignados corresponden al total final mostrado explícitamente. No se duplica la transacción bancaria: se enlazan participaciones a una sola compra y una sola confirmación.
