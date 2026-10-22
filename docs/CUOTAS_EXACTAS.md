# Cuotas exactas, pagos y backups

Las cuotas exactas y la confirmación explícita están integradas y publicadas.
La corrección posterior de seguridad/validación también está publicada;
estado vigente en `CORRECCIONES_AUDITORIA.md`. No se usan datos reales para probar.

## Representación y compatibilidad

`cuotas-item.mjs` es el adaptador financiero utilizado por la PWA, resúmenes y
reportes. Un registro histórico conserva `monto` por cuota y la fórmula original,
incluso sus decimales. No se convierte automáticamente a un contrato nuevo.

Un registro nuevo con `planCuotas` usa importes CLP enteros explícitos, por
ejemplo $100 en tres cuotas: $34, $33 y $33. La próxima cuota, atrasos, abonos,
pagos y deshacer leen esos importes; no multiplican la primera cuota ni usan
un promedio. El calendario conserva cierre el día 10 y pago el 25.

Una participación conserva el plan original y su propio vector
`cuotasAsignadas`, vinculado mediante `compraGrupoId`. Los totales personales
usan solo ese vector: $700 y $300 suman $1.000, sin volver a sumar el contrato
original. Un período de cero pesos no genera deuda ni un pago ficticio.

La edición existente permite corregir identidad, descripción y fecha de un
plan explícito. Sus importes y pagos quedan bloqueados para evitar que el
editor histórico reescriba el contrato. La revisión integral de un reparto
pertenece a la tarea 3.5; todavía no existe esa interfaz.

## Identidad y restauración

`datos-compras.mjs` asigna UUID a registros históricos que carecen de ID, antes
de mostrarlos; el primer guardado exitoso conserva esa identidad. No se
escribe una migración al iniciar sesión. Los registros antiguos sin origen se
interpretan como manuales. Los eventos nuevos de compra/pago incluyen ID.

El backup v7 y el borrador recuperable conservan IDs, origen, planes,
participaciones y evento de captura. No exportan revisión Firestore, ni
totales/factores derivados. Importar es un guardado nuevo con la base actual.
Se admiten v6 y formatos históricos; versiones futuras, IDs repetidos, planes
corruptos y abonos imposibles de un plan explícito se rechazan antes de
reemplazar el estado. El archivo está limitado a 5 MB.

Los registros históricos conservan el tratamiento anterior de fecha
desconocida; fechas imposibles de un plan explícito se rechazan. Una captura
sin fecha debe completarse al revisar, antes de generar la compra definitiva.

## Evidencia ejecutada

- 49 pruebas Node aprobadas: suites previas, dominio de cuotas/reparto,
  integración de cálculos/backups y seguimiento. Incluyen abonos, atrasos,
  ceros, importes variables, reversión exacta y compatibilidad histórica.
- Interfaz con Firebase sustituido por memoria y datos claramente ficticios:
  importación v7, contrato $1.100 con reparto $700/$300 y plan $34/$33/$33;
  pago de $34, pago de $33, deshacer $33 y edición de descripción sin alterar
  pagos. Saldo final de la persona A: $966; deuda total pendiente: $1.066.
- Se detectó caché antigua del módulo de resumen en el entorno de prueba.
  Se repitió la prueba cargando temporalmente sus módulos con una consulta
  de versión; esa instrumentación se retiró. La PWA final usa caché v17.
- Backup descargado por la UI, leído y restaurado: versión, IDs, origen,
  grupo, cuotas asignadas, pagos y saldo coinciden con el estado exportado.
- PDF personal y general generados por la UI y renderizados con Poppler,
  sin cortes ni superposición en los ejemplos. El personal no contiene
  tarjeta, otra persona ni contrato global; muestra $700 de participación,
  no $1.000. Los rangos se presentan como cuotas variables.
- Las nueve pruebas previas de Firestore usaron el SDK y emulador reales;
  esta prueba de interfaz no reemplaza esa evidencia de concurrencia.

No se ha probado captura física Android ni conexión al Firebase real de la
cuenta. La caché nueva debe publicarse junto con los módulos y las reglas
coordinadas, después de auditar las vigentes y obtener autorización.

## Formulario de modalidades

En «Registrar una compra», «Definir total y cuotas» abre el configurador.
Exige el monto original; no interpreta el monto por cuota ya escrito como
total. Permite una cuota, división exacta sin interés, valor mensual con
interés manual o importes distintos por cuota. Muestra original, total final,
diferencia por financiamiento y cada importe antes de aplicar. No infiere tasas.

Configurar el plan no crea deuda. «Usar este plan» lo devuelve al formulario;
solo «Guardar compra» registra. Cancelar/Escape conserva la configuración
anterior. «Volver al valor por cuota» permite usar la entrada habitual y limpia
los importes para que no se reinterpreten accidentalmente. Una sesión nueva
limpia el formulario y cierra el configurador.

La interfaz comprobó las cuatro modalidades y guardó una compra manual
$34/$33/$33 una sola vez. Guardar y pagar una cuota única, después editar su
descripción, conservó la cuota pagada y el saldo. Cancelar otra configuración
no añadió registros. Sin errores de consola en esa prueba. La suite final
incluye **53 pruebas**, con validación de entrada y de actualizaciones del
roadmap. El service worker pasa a **cuotas-v18** e incluye el configurador.

La prueba visual se realizó en escritorio; la validación física en el Galaxy
S24 y la regresión completa de captura/bandeja siguen pendientes.
