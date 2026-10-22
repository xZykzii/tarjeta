# Plan de validación y compatibilidad

El roadmap es la fuente del estado. Esta matriz define evidencia que se exigirá, sin presentar pruebas planificadas como realizadas. Los fixtures sintéticos sirven para contrato y cálculos; no certifican el formato del banco.

| Caso solicitado | Prueba requerida | Tareas |
| --- | --- | --- |
| 1. Notificación válida | Fixtures anonimizados auténticos + callback en teléfono físico | 1.3, 2.2, 7.3 |
| 2. Rechazo de no compras | Pagos, abonos, reversas, devolución, publicidad y texto desconocido auténticos | 1.3, 2.2, 7.1 |
| 3. Duplicados | Mismo callback/reintento, actualización, reinicio, descarte y dos compras legítimas iguales | 2.3, 3.3, 7.1 |
| 4. Datos incompletos | Compra reconocida sin monto/fecha/tarjeta exige corrección; otros formatos no se capturan | 2.2, 3.1 |
| 5. Sin asignar | Pendiente no altera items, KPI, PDF, saldo ni deuda | 3.1, 3.2, 7.2 |
| 6. Asignación | Entidades existentes; eliminadas entre revisión y commit provocan conflicto | 3.4, 3.3 |
| 7. Una cuota | Igualdad monto original = cuota = contrato, cero interés | 4.1, 4.2 |
| 8. Sin interés | División exacta, cuotas positivas y suma igual al original | 4.1, 4.2 |
| 9. Interés manual | Valor mensual explícito; total final y diferencia, sin tasa inferida | 4.1, 4.2 |
| 10. Redondeo CLP | 100/3 = [34,33,33], residuos exhaustivos y límites de enteros | 4.2 |
| 11. Firebase | UID correcto, anónimo y acceso cruzado denegados; reconexión y cambio de cuenta | 6.1, 6.2 |
| 12. Confirmar/descartar | Transacción repetida y concurrente: una sola compra, resolución irreversible por captura | 3.3, 7.1 |
| 13. Integridad | Cliente antiguo, conflicto de revisión, pagos simultáneos, atrasos y abonos | 5.1, 5.3, 7.4 |
| 14. Compatibilidad | Backup v6, manual, PDF personal/general, historial, fechas y caché | 5.2, 5.3, 5.4 |

## Antes de habilitar integración

### Evidencia ejecutada después de la auditoría

- Casos 1–4: corpus compartido JS/JVM y pruebas del listener. Titular/adicional
  positivos basados en capturas; negativos y distribución de extras sintéticos.
  No sustituyen muestras negativas auténticas ni el ciclo físico completo.
- Caso 5: el SDK/emulador crea un pendiente sobre datos financieros sembrados
  y compara íntegros items/saldos/revisión, sin recibo. La UI cancela revisión
  con cero compras y recibos; KPI/PDF solo consumen registros confirmados.
- Casos 6–10: dominio y emulador validan catálogos, precisión, intereses y reparto.
- Casos 11–13: `persistencia-emulador.integration.mjs` verifica UID, anónimo,
  escritores obsoletos y carreras reales. El caso 13 unitario también llama al
  guardado; los casos puros 11/12 no se presentan como pruebas de servidor.
- Caso 14: v6/v7, historial hostil inerte, saldos inválidos y decimales legados;
  PDF real multipágina con terceros ausentes del personal y presentes en general.
  Revisión visual de las seis páginas y de confirmación móvil con datos ficticios.
- Android: seis pruebas Room/WorkManager ejecutan el interleaving final, cadenas
  fallidas, pausa/consentimiento y UID con un envío sustituido. Son pruebas de
  componentes; la actualización 0.2.1 no se ha ejecutado físicamente en S24.

Detalle y pendientes vigentes en `CORRECCIONES_AUDITORIA.md`.

### Procedimiento

1. Usar una copia sintética; nunca desarrollar contra los datos financieros reales.
2. Ejecutar las pruebas preexistentes (`node --test tests/*.test.mjs`) y las nuevas de dominio.
3. Ejecutar reglas y transacciones con emuladores Auth/Firestore, incluyendo intentos maliciosos de campos extra, estados y UID.
4. Probar en UI escritorio/móvil; pendientes con importes desconocidos no se pueden confirmar hasta corregirlos.
5. Comparar los registros y resúmenes legados antes y después; incluir cuotas pagadas, parciales, atrasadas, futuras y pago único.
6. Configurar SDK/registro Android y compilar. El usuario autoriza el permiso en el teléfono, no el agente.
7. Probar una notificación auténtica con web cerrada, red caída, reinicio, reconexión y segundo dispositivo. No confundir instalación con validación real.
8. Preparar respaldo y reversión antes de cualquier cambio de reglas o despliegue. Publicación pendiente de autorización.

## Invariantes de implementación

- Todos los montos se representan con enteros seguros CLP; sin punto flotante para distribuir pesos.
- Un plan nuevo guarda sus cuotas explícitas. Un registro antiguo conserva `monto * totales` mediante adaptador, sin migración destructiva.
- Los abonos reducen solo la cuota pendiente actual y no se descuentan dos veces.
- Solo una confirmación validada incorpora deuda; una captura o un descarte no lo hacen.
- Sesión revocada, permiso denegado o lectura fallida producen estado visible y recuperable.
- La simulación de almacenamiento en una prueba unitaria se identifica como prueba; no se incorpora un modo que aparente detección bancaria en la app.
