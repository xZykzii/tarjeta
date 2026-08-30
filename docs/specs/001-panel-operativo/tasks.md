# Tareas: Panel operativo y rediseño

> Marca una tarea solamente después de ejecutar su comprobación de terminado.

- [x] **T1 — Definir la experiencia y el contrato de datos derivados**
  - Depende de: ninguna
  - Cubre: RF-1, RF-2, RF-3, RF-4
  - Hecho cuando: la spec y el plan no tienen dudas abiertas y distinguen datos de tarjeta/datos filtrados.

- [x] **T2 — Construir el panel operativo y el sistema visual**
  - Depende de: T1
  - Cubre: RF-1, RF-2, RF-3, RF-5, RF-6
  - Hecho cuando: ciclo, KPIs y agenda renderizan con estados vacíos y responsive.

- [x] **T3 — Corregir el alcance de filtros y mejorar la lista**
  - Depende de: T2
  - Cubre: RF-1, RF-4, RF-5
  - Hecho cuando: filtrar cambia solo la lista y el contador comunica mostrado/total.

- [x] **T4 — Actualizar metadatos, PWA y documentación**
  - Depende de: T2
  - Cubre: RF-6, RF-7
  - Hecho cuando: manifest, README y caché corresponden al nuevo panel sin cambiar backups.

- [ ] **T5 — Validar lógica e interfaz requisito por requisito**
  - Depende de: T3, T4
  - Cubre: RF-1 a RF-7
  - Hecho cuando: pruebas, sintaxis y revisión funcional/visual tienen evidencia y la spec refleja el cierre.
