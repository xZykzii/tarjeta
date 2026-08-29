# Control de cuotas

Seguimiento de compras en cuotas de tarjeta de crédito: cuánto se ha pagado de cada una,
cuánto queda pendiente y cuánto se estima pagar en el mes en curso.

**En vivo:** https://xzykzii.github.io/tarjeta/

## Qué hace

- Registro de compras con monto, número de cuotas y fecha de compra.
- Estado de cada ítem: en curso, pagado o atrasado, con porcentaje de avance.
- Estimación del total a pagar en el mes.
- Asignación de cuotas por persona, para compras compartidas.
- Historial de actividad, con opción de deshacer una cuota marcada por error.
- Búsqueda, filtros rápidos por estado y orden adaptable para móvil.
- Resumen de la tarjeta listo para copiar y compartir.
- Exportación e importación de backups en JSON.
- Tema claro y oscuro.

## Tecnologías

HTML, CSS y JavaScript sin framework. Firebase para sesión y sincronización.
Service worker y manifest, de modo que se instala como PWA.
