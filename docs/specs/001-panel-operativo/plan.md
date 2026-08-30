# Plan técnico: Panel operativo y rediseño

## Resumen

Se conservará la aplicación monolítica y se separará conceptualmente el conjunto de datos de la tarjeta del subconjunto visible en la tabla. El primer viewport combinará un bloque de ciclo, KPIs y una agenda breve. El sistema visual se resolverá con tokens CSS, superficies oscuras de alto contraste y movimiento moderado, sin copiar componentes React ni añadir dependencias.

## Diseño y cambios

| Área o archivo | Cambio | RF cubiertos |
| --- | --- | --- |
| `index.html` / tokens y layout | Identidad visual, ciclo, agenda, responsive y estados accesibles. | RF-2, RF-3, RF-5, RF-6 |
| `index.html` / datos derivados | Separar `itemsTarjeta()` de `getItems()` y calcular resumen estable. | RF-1, RF-4, RF-7 |
| `index.html` / filtros | Contador mostrado/total y acción contextual para vacíos. | RF-4, RF-5 |
| `sw.js`, `manifest.json`, `README.md` | Renovar caché, metadatos y documentar el panel. | RF-7 |
| `tests/logic.test.mjs` | Comprobar fechas, agenda, filtrado y totales. | RF-1, RF-2, RF-3, RF-4 |

## Datos, integraciones y compatibilidad

- No se modifica el documento de Firestore ni el JSON de exportación/importación.
- Firebase 10.12.0 y la autenticación con Google se mantienen.
- El sitio continúa desplegable en GitHub Pages y utilizable como PWA.

## Decisiones técnicas

| Decisión | Motivo | Alternativa descartada |
| --- | --- | --- |
| Mantener un solo `index.html` | Preserva arquitectura, despliegue y riesgo bajo. | Introducir React/Vite sin necesidad funcional. |
| Acento lima controlado sobre negro | Da identidad y señal de control sin competir con rojo/ámbar semánticos. | Paleta multicolor genérica de dashboard. |
| Agenda máxima de tres ítems | Resuelve la decisión inmediata sin duplicar la tabla. | Calendario completo, que añade complejidad y densidad. |
| Movimiento CSS con `prefers-reduced-motion` | Toma el principio de Motion Primitives sin dependencia ni costo de carga. | Biblioteca de animación para efectos pequeños. |
| KPIs calculados antes de filtrar | El estado financiero no debe variar al buscar. | Mantener el comportamiento actual, ambiguo para el usuario. |

## Estrategia de validación

| RF | Prueba o comprobación | Resultado esperado |
| --- | --- | --- |
| RF-1 | Datos de tarjeta + filtro activo | Totales iguales antes y después del filtro. |
| RF-2 | Agenda con fechas mezcladas | Vencidos primero, luego fecha ascendente, máximo tres. |
| RF-3 | Fechas fijas alrededor de cierre/pago | Próximos hitos correctos. |
| RF-4 | Buscar, filtrar y ordenar | Solo cambia la lista y aparece `N de M`. |
| RF-5 | Render sin ítems, sin fechas y sin coincidencias | Mensaje y acción adecuados. |
| RF-6 | Navegador/inspección a 375 y 1280 px | Sin desbordes; teclado y reducción de movimiento correctos. |
| RF-7 | Revisión de `save`, exportar e importar | Mismas claves y versión de backup. |

## Verificación de interfaz

- Recorrido principal: iniciar sesión, seleccionar tarjeta, identificar próximo compromiso, filtrar, agregar ítem y registrar pago.
- Revisión visual: escritorio 1280 px y móvil 375 px en claro y oscuro.
- Estados: login, carga, tarjeta vacía, sin fechas, sin coincidencias, atraso y pago próximo.

## Riesgos y reversibilidad

- El archivo concentra interfaz y lógica: los cambios se harán por bloques pequeños y se validará sintaxis tras cada integración.
- Todo el trabajo queda en un commit aislado, reversible sin migración de datos.
