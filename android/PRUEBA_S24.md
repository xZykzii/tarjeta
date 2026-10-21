# Prueba física pendiente · Galaxy S24

Esta guía corresponde al APK de diagnóstico 0.1.0. La pantalla y la captura
real todavía deben probarse en el teléfono. No hay sincronización con la web.

## Instalación y autorización

1. Copiar el APK compilado al teléfono e instalarlo si el titular decide hacerlo.
   Esta versión se llama **Cuotas · diagnóstico**; su paquete es
   `cl.controlcuotas.companion`, distinto de `cl.android` del banco.
2. Abrirla. Debe empezar pausada, con cero callbacks y ningún resultado local.
   Debe reconocer que Banco Falabella Chile está instalado.
3. Leer la explicación de acceso. Activar «Autorizar diagnóstico local» solo si
   se acepta ese uso y pulsar «Abrir acceso a notificaciones».
4. Android muestra su propia advertencia: el titular concede o rechaza el acceso.
   Si el sistema bloquea el permiso para apps instaladas manualmente, detenerse
   y revisar esa advertencia; no eludirla ni usar ADB para conceder acceso.
5. Volver a Cuotas y comprobar «Servicio conectado». Si el permiso está concedido
   pero no se enlaza, el botón de reconexión solo solicita que Android lo reintente.

## Comprobar cuando llegue un nuevo aviso

- Una nueva notificación de compra del banco debe aumentar el contador de
  avisos individuales. Los avisos de otras apps y resúmenes de grupo se ignoran.
- Si coincide la gramática, deben aparecer monto, comercio y terminación correctos.
  Una actualización del mismo aviso puede aumentar de nuevo el contador;
  esta versión todavía no deduplica ni registra deuda.
- Un formato desconocido o un aviso sin compra reconocida debe mostrar que se
  ignoró. Si rechaza una compra real, conservar el problema como formato no
  cubierto; no ampliar la gramática suponiendo cómo eran los extras.
- Probar con la pantalla de Cuotas cerrada y abrirla después. El resultado se
  conserva solo mientras siga vivo el proceso. Un reinicio no conserva la compra.
- Pausar diagnóstico y comprobar que se borra el resultado. Los avisos siguientes
  no deben leer contenido ni aumentar contadores. El acceso del sistema se
  revoca separadamente en Ajustes.

## Evidencia a registrar sin secretos

Anotar versión de Android/One UI, versión del APK, conexión del servicio y si
el resultado coincide con la compra. Para describir un rechazo, usar solo texto
anonimizado de esa notificación: comercio ficticio, monto de ejemplo y terminación
`0000`. No exportar un volcado de todas las notificaciones ni compartir OTP,
credenciales, tokens, números completos de tarjeta o datos de otras apps.

Seguirán pendientes ejemplos auténticos anonimizados de pago, devolución y
publicidad, la identidad de actualizaciones y el comportamiento físico tras
reinicio/reconexión. Solo con esa evidencia se revisarán 1.3, 2.2, 2.3 y 7.3.
