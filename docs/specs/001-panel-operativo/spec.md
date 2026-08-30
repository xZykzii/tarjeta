---
id: 001-panel-operativo
estado: implementado-pendiente-publicacion
---

# Panel operativo y rediseño de Control de cuotas

## Contexto y objetivo

La aplicación ya permite registrar, pagar y respaldar cuotas, pero el primer vistazo mezcla el estado global de la tarjeta con el resultado de los filtros y obliga a recorrer la tabla para saber qué vence primero. El objetivo es convertir la portada en un panel operativo claro, conservar el modelo de datos y dar a la interfaz una identidad negra propia, táctil y sobria.

## Alcance

Incluye:

- Rediseño del primer viewport, tokens visuales y microinteracciones.
- Resumen estable de la tarjeta activa, independiente de búsqueda y filtros.
- Agenda de los próximos compromisos y contexto del ciclo de facturación/pago.
- Mejora de filtros, estados vacíos, accesibilidad y adaptación móvil.
- Actualización de metadatos, PWA y documentación.

No incluye:

- Cambios al esquema de Firestore, autenticación, reglas de negocio de fechas o formato de backups.
- Nuevas integraciones, cuentas, roles o dependencias.
- Reescritura con framework.

## Usuarios o sistemas afectados

- Persona administradora: necesita decidir qué pagar, a quién cobrar y qué está atrasado desde el primer vistazo.
- Personas asociadas a las compras: reciben resúmenes copiados, sin acceso directo ni cambios de rol.
- Firebase y backups existentes: deben seguir recibiendo exactamente la misma estructura de datos.

## Requisitos funcionales

- **RF-1.** WHEN la persona selecciona una tarjeta, THE aplicación SHALL mostrar el pendiente, la carga mensual y el atraso de toda la tarjeta, aunque la tabla tenga búsqueda o filtros activos.
- **RF-2.** WHEN existen cuotas con fecha, THE aplicación SHALL mostrar una agenda ordenada con hasta tres próximos compromisos, priorizando los vencidos.
- **RF-3.** WHEN se muestra el panel, THE aplicación SHALL indicar las próximas fechas de cierre y pago según los días 10 y 25 ya definidos.
- **RF-4.** WHEN la persona activa búsqueda, estado u orden, THE aplicación SHALL limitar solo la lista y comunicar cuántos resultados se muestran respecto del total de la tarjeta.
- **RF-5.** IF no hay ítems, fechas o coincidencias, THEN THE aplicación SHALL explicar el estado y ofrecer una acción de recuperación pertinente.
- **RF-6.** WHEN se usa teclado, pantalla estrecha o preferencia de movimiento reducido, THE aplicación SHALL mantener controles accesibles, foco visible, contenido sin desbordamiento y animaciones no esenciales desactivadas.
- **RF-7.** WHEN se importa, exporta o sincroniza información, THE aplicación SHALL conservar el modelo de datos y el formato de backup existentes.

## Criterios de aceptación

| Requisito | Evidencia de cumplimiento |
| --- | --- |
| RF-1 | Prueba de render con filtro activo: KPI y agenda mantienen totales de la tarjeta. |
| RF-2 | Prueba de datos con vencido, próximo, futuro y sin fecha; orden y límite correctos. |
| RF-3 | Prueba determinista de cálculo antes/después de los días 10 y 25. |
| RF-4 | Búsqueda, filtro y orden actualizan lista, filtros y contador sin alterar resumen. |
| RF-5 | Inspección de estados sin datos, sin fechas y sin resultados. |
| RF-6 | Revisión a 375 px y 1280 px, navegación por teclado y regla `prefers-reduced-motion`. |
| RF-7 | Comparación del objeto guardado/exportado y validación de importación existente. |

## Requisitos no funcionales

- Mantener HTML, CSS y JavaScript sin framework ni dependencia nueva.
- Mantener compatibilidad con Chrome/Brave modernos y funcionamiento PWA.
- Evitar exponer información adicional fuera de la sesión autenticada.
- Usar colores semánticos con contraste, números tabulares y objetivos táctiles de al menos 40 px en móvil.

## Puertas de calidad web o app

| Área | Aplica | Criterio verificable |
| --- | --- | --- |
| UX y responsive | sí | Flujo principal usable a 375 px y 1280 px sin controles cortados. |
| Accesibilidad | sí | Jerarquía semántica, etiquetas, foco visible, `aria-live` y movimiento reducido. |
| Estados de interfaz | sí | Carga, vacío, éxito, error y ausencia de fechas son comprensibles. |
| Datos y seguridad | sí | No cambia el límite de confianza; Firebase y backups conservan estructura. |
| Rendimiento | sí | Sin dependencias ni imágenes nuevas; HTML/CSS/JS locales permanecen livianos. |
| SEO | sí | Título, descripción, color de tema y manifest coherentes con la app. |
| Observabilidad | no | No hay servicio propio ni backend nuevo. |
| Pruebas | sí | Lógica extraída comprobada y recorrido principal inspeccionado. |

## Casos límite y errores

- Tarjeta sin ítems, solo con ítems pagados o solo con ítems sin fecha.
- Filtro sin coincidencias mientras el resumen aún tiene datos.
- Próximo pago en el año siguiente.
- Cuota parcialmente abonada o con varias cuotas atrasadas.
- Pantalla pequeña y texto largo en persona o ítem.

## Dudas abiertas

- Ninguna. Se conserva la marca actual y se interpreta la referencia de diseño como un sistema propio inspirado en Cult UI y Motion Primitives, adaptado a HTML/CSS nativo.

## Definición de terminado

- [ ] Todos los RF tienen evidencia de validación (queda pendiente la revisión visual del panel autenticado).
- [x] La documentación, metadatos y caché PWA están actualizados.
- [x] No quedan dudas abiertas que impidan el uso previsto.
