<!-- GENERADO: editar docs/seguimiento/plan.json y ejecutar node scripts/seguimiento.mjs -->
# Estado del proyecto

Snapshot: 2026-10-21 · Base: `58ebee85df3acf3b942f3ade944b40b63aa82af9` · Rama: `codex/compras-falabella`.

## Objetivo

Detectar compras reales desde Android, revisarlas sin asignación e incorporarlas solo al confirmar, conservando toda la PWA actual.

## Arquitectura comprobada

- PWA HTML/CSS/JS sin framework; index.html contiene UI, pagos y Firebase JS 10.12.0.
- Google Auth; users/{uid} contiene arrays items/tarjetas/personas, saldos e historial; getDoc/setDoc merge sin escucha en vivo.
- logic.mjs contiene cálculos derivados; pdf-export.mjs produce PDF; SW cuotas-v15; backup v6.
- monto es valor por cuota; total es saldo derivado. No se admiten aún cuotas desiguales.

## Decisiones técnicas

- Seguimiento separado de la PWA. docs/seguimiento/plan.json es la única fuente de verdad; Markdown y HTML se regeneran.
- Los pesos suman 100 puntos de aceptación. Solo completadas y con evidencia aportan avance; no es una estimación de tiempo.
- Gantt por orden lógico de ejecución, sin fechas ni duración inventadas. Dependencias independientes permiten trabajo fuera del orden visual.

## Punto exacto de continuidad

Tarea actual: **1.1 — Investigar Android y Firebase**. Estado efectivo: **en_curso**.

Criterio de cierre: Documentación oficial vigente, límites y alternativas contrastadas.

Última tarea terminada: **0.4 — Verificar regeneración y persistencia**.

Avance verificado: **8%**.

## Archivos creados o modificados en esta iniciativa

- `docs/INSPECCION_INICIAL.md`
- `docs/seguimiento/plan.json`
- `scripts/seguimiento.mjs`
- `docs/seguimiento/plantilla.html`
- `ROADMAP.md`
- `ESTADO_PROYECTO.md`
- `docs/seguimiento/roadmap.html`

## Implementaciones incompletas

- Ningún cambio funcional en la PWA. Todavía no hay detector ni sincronización Android.

## Pruebas y resultados

- 12/12 pruebas preexistentes aprobadas (node --test tests/*.test.mjs).
- Seguimiento generado y --check aprobado; controles de fases, búsqueda y recarga probados en navegador.

## Errores conocidos, riesgos y requisitos externos

- Faltan ejemplos auténticos y packageName verificado; el usuario enviará una captura. No implementar un analizador definitivo sin evidencia.
- Reglas de Firestore desplegadas sin verificar; no publicar reglas ni escribir datos reales desde esta sesión.
- save() sobrescribe arrays completos: riesgo de pérdida entre dispositivos y confirmaciones; requiere resolver concurrencia.
- Cuotas variables exigen cambios coordinados en pagos, abonos, PDF, importación y resumen.

## Próximos pasos en orden de prioridad

1. 1.1 — Investigar Android y Firebase (en_curso).

## Instrucciones concretas para retomar

- Leer ROADMAP.md y ESTADO_PROYECTO.md; comprobar git status y git diff antes de editar.
- Ejecutar node scripts/seguimiento.mjs --check y node --test tests/*.test.mjs; comprobar evidencia de tareas completadas.
- Abrir docs/seguimiento/roadmap.html. Consultar actual y dependencias en el JSON.
- Antes de un bloque extenso registrar tarea y archivos previstos en plan.json; regenerar. Al cerrarlo registrar evidencia, pruebas y siguiente tarea.
- No dar por operativo Android ni Firebase hasta ejecutar pruebas reales. No subir commits ni desplegar sin autorización.

La persistencia es el repositorio, no el chat, el almacenamiento del navegador ni una promesa de detectar créditos. Si la sesión se corta durante una edición, revisar el diff y regenerar antes de confiar en las vistas. Las operaciones Git remotas y el despliegue requieren autorización explícita.
