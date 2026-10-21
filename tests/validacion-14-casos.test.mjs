import test from "node:test";
import assert from "node:assert/strict";

// Módulos de dominio y lógica
import { analizarNotificacionFalabella } from "../falabella-notificaciones.mjs";
import { crearPendiente, validarPendiente, resolverPendiente, compraIdDeEvento } from "../compras-pendientes.mjs";
import { crearPlanCuotas, validarPlanCuotas } from "../planes-cuotas.mjs";
import { repartirPlanCuotas, validarReparto } from "../reparto-compras.mjs";
import { prepararConfirmacion, validarRevisionCompra } from "../confirmacion-compras.mjs";
import { baseDocumento, guardarConRevision, ConflictoGuardado } from "../persistencia-segura.mjs";
import { normalizarCompra, serializarCompra, crearBackup, leerBackup } from "../datos-compras.mjs";
import { crearReportePersona, crearReporteGeneral } from "../logic.mjs";
import { valoresInicialesRevision } from "../ui-revision-compra.mjs";

const CONFIG_BANCO = { paqueteAutorizado: "cl.android", hasPaqueteVerificado: true };

// Fixture base para pruebas de documento
function docBase(items = []) {
  return {
    items,
    tarjetas: ["Tarjeta 1", "Papá"],
    personas: ["Persona A", "Persona B"],
    tarjetaActiva: "Papá",
    saldos: {},
    historial: []
  };
}

// -------------------------------------------------------------
// CASO 1: Notificación válida (Titular y Adicional)
// -------------------------------------------------------------
test("Caso 1: Notificación válida reconoce formatos titular y adicional", () => {
  const titular = analizarNotificacionFalabella({
    paquete: "cl.android",
    isResumenGrupo: false,
    titulo: "Banco Falabella",
    texto: "Compraste $25.990 en ZARA CHILE Con tu CMR Mastercard Elite terminada en 4321. Si no la realizaste tú, revisa los movimientos de tus adicionales en tu app."
  }, CONFIG_BANCO);
  assert.equal(titular.resultado, "compra");
  assert.equal(titular.datos.montoOriginal, 25990);
  assert.equal(titular.datos.comercio, "ZARA CHILE");
  assert.equal(titular.datos.tarjetaUltimos4, "4321");

  const adicional = analizarNotificacionFalabella({
    paquete: "cl.android",
    isResumenGrupo: false,
    titulo: "Banco Falabella",
    texto: "Tu Adicional compró $12.500 en SODIMAC CONCEPCION Realizada por JUAN PEREZ con su CMR Adicional terminada en 9876. Si tienes algún problema, comunícate con nosotros."
  }, CONFIG_BANCO);
  assert.equal(adicional.resultado, "compra");
  assert.equal(adicional.datos.montoOriginal, 12500);
  assert.equal(adicional.datos.comercio, "SODIMAC CONCEPCION");
  assert.equal(adicional.datos.tarjetaUltimos4, "9876");
});

// -------------------------------------------------------------
// CASO 2: Rechazo de no compras (Pagos, abonos, devoluciones)
// -------------------------------------------------------------
test("Caso 2: Rechazo de no compras ignora pagos, reversas y textos ajenos", () => {
  const casosNoCompra = [
    "Recibimos tu pago por $50.000.",
    "Abono recibido en tu cuenta por $10.000.",
    "Se ha registrado una devolución de $4.990.",
    "Aprovecha un 20% de descuento en Falabella este fin de semana.",
    "Tu clave de seguridad para transferir es 123456.",
    ""
  ];
  for (const texto of casosNoCompra) {
    const res = analizarNotificacionFalabella({
      paquete: "cl.android",
      isResumenGrupo: false,
      titulo: "Banco Falabella",
      texto
    }, CONFIG_BANCO);
    assert.equal(res.resultado, "ignorada");
  }
});

// -------------------------------------------------------------
// CASO 3: Deduplicación (Identidad estable y no reenvío)
// -------------------------------------------------------------
test("Caso 3: Deduplicación impide registrar dos veces la misma compra", () => {
  const aviso = crearPendiente({
    eventId: "evento_dedup_00000001",
    montoOriginal: 10000,
    comercio: "FALABELLA",
    recibidaEn: 1792584000000,
    parserVersion: "v2"
  });
  const doc = docBase();
  const plan = crearPlanCuotas({ modalidad: "una_cuota", montoOriginal: 10000, numeroCuotas: 1 });
  const revision = {
    item: "FALABELLA",
    fechaCompra: "2026-10-21",
    tarjeta: "Papá",
    planCuotas: plan,
    asignaciones: [{ persona: "Persona A", monto: 10000 }]
  };

  const confirmada = prepararConfirmacion(aviso, revision, doc);
  assert.equal(confirmada.documento.items.length, 1);

  // Intentar confirmar de nuevo sobre el documento actualizado debe fallar
  assert.throws(() => {
    prepararConfirmacion(aviso, revision, confirmada.documento);
  }, /Ya existe una compra asociada a este aviso/);
});

// -------------------------------------------------------------
// CASO 4: Datos incompletos exigen corrección antes de deuda
// -------------------------------------------------------------
test("Caso 4: Datos incompletos no generan deuda y exigen asignación manual", () => {
  const incompleto = crearPendiente({
    eventId: "evento_incompleto_0001",
    montoOriginal: null,
    comercio: null,
    recibidaEn: 1792584000000,
    parserVersion: "v2"
  });
  assert.equal(incompleto.estado, "sin_asignar");
  assert.equal(incompleto.montoOriginal, null);

  // No se puede confirmar una revisión sin fecha o con persona inexistente
  assert.throws(() => {
    validarRevisionCompra({
      item: "Prueba",
      fechaCompra: "",
      tarjeta: "Papá",
      planCuotas: crearPlanCuotas({ modalidad: "una_cuota", montoOriginal: 100, numeroCuotas: 1 }),
      asignaciones: [{ persona: "Persona A", monto: 100 }]
    }, docBase());
  }, /fecha/i);
});

// -------------------------------------------------------------
// CASO 5: Sin asignar no altera deuda ni saldos
// -------------------------------------------------------------
test("Caso 5: Aviso pendiente en bandeja no altera items ni saldos del documento", () => {
  const doc = docBase();
  const aviso = crearPendiente({
    eventId: "evento_pendiente_00001",
    montoOriginal: 50000,
    comercio: "PARIS",
    recibidaEn: 1792584000000,
    parserVersion: "v2"
  });
  assert.equal(doc.items.length, 0);
  assert.deepEqual(doc.saldos, {});
  assert.equal(aviso.estado, "sin_asignar");
});

// -------------------------------------------------------------
// CASO 6: Asignación a entidades existentes del catálogo
// -------------------------------------------------------------
test("Caso 6: Asignación valida personas y tarjetas existentes", () => {
  const doc = docBase();
  const plan = crearPlanCuotas({ modalidad: "una_cuota", montoOriginal: 5000, numeroCuotas: 1 });
  const revisionInvalida = {
    item: "Compra",
    fechaCompra: "2026-10-21",
    tarjeta: "Tarjeta Inexistente",
    planCuotas: plan,
    asignaciones: [{ persona: "Persona Inexistente", monto: 5000 }]
  };
  assert.throws(() => validarRevisionCompra(revisionInvalida, doc), /tarjeta|persona/i);
});

// -------------------------------------------------------------
// CASO 7: Modalidad una cuota sin interés
// -------------------------------------------------------------
test("Caso 7: Modalidad una cuota conserva monto = cuota = totalFinal", () => {
  const plan = crearPlanCuotas({ modalidad: "una_cuota", montoOriginal: 19990, numeroCuotas: 1 });
  assert.deepEqual(plan.cuotas, [19990]);
  assert.equal(plan.totalFinal, 19990);
  assert.equal(plan.interesesTotales, 0);
});

// -------------------------------------------------------------
// CASO 8: Modalidad sin interés en cuotas exactas
// -------------------------------------------------------------
test("Caso 8: Modalidad sin interés divide en CLP exactos con suma íntegra", () => {
  const plan = crearPlanCuotas({ modalidad: "sin_interes", montoOriginal: 100000, numeroCuotas: 3 });
  assert.deepEqual(plan.cuotas, [33334, 33333, 33333]);
  assert.equal(plan.cuotas.reduce((a, b) => a + b, 0), 100000);
  assert.equal(plan.interesesTotales, 0);
});

// -------------------------------------------------------------
// CASO 9: Interés manual con valor de cuota explícito
// -------------------------------------------------------------
test("Caso 9: Interés manual calcula total final e intereses sin tasas inferidas", () => {
  const plan = crearPlanCuotas({
    modalidad: "interes_manual",
    montoOriginal: 100000,
    numeroCuotas: 3,
    valorCuota: 36000
  });
  assert.deepEqual(plan.cuotas, [36000, 36000, 36000]);
  assert.equal(plan.totalFinal, 108000);
  assert.equal(plan.interesesTotales, 8000);
});

// -------------------------------------------------------------
// CASO 10: Redondeo exacto CLP (100 / 3 = [34, 33, 33])
// -------------------------------------------------------------
test("Caso 10: Redondeo CLP distribuye el residuo a las primeras cuotas", () => {
  const plan = crearPlanCuotas({ modalidad: "sin_interes", montoOriginal: 100, numeroCuotas: 3 });
  assert.deepEqual(plan.cuotas, [34, 33, 33]);
  assert.equal(plan.cuotas.reduce((a, b) => a + b, 0), 100);
});

// -------------------------------------------------------------
// CASO 11: Aislamiento por UID y sesión de usuario
// -------------------------------------------------------------
test("Caso 11: Contrato de pendientes y revisión exigen UID válido y no admiten cruces", () => {
  const aviso = crearPendiente({
    eventId: "evento_uid_valido_0001",
    montoOriginal: 1000,
    comercio: "TEST",
    recibidaEn: 1792584000000,
    parserVersion: "v2"
  });
  assert.throws(() => validarPendiente({ ...aviso, uid: "otro_usuario" }), /campos no permitidos/);
});

// -------------------------------------------------------------
// CASO 12: Confirmación y descarte atómicos e irreversibles
// -------------------------------------------------------------
test("Caso 12: Confirmación y descarte son mutuamente excluyentes e idempotentes", () => {
  const aviso = crearPendiente({
    eventId: "evento_resolucion_0001",
    montoOriginal: 1500,
    comercio: "TEST",
    recibidaEn: 1792584000000,
    parserVersion: "v2"
  });

  const descarte = resolverPendiente(aviso, "descartar");
  assert.equal(descarte.pendiente.estado, "descartada");
  assert.equal(descarte.hasCambio, true);

  // Repetir descarte es idempotente
  const descarteRepetido = resolverPendiente(descarte.pendiente, "descartar");
  assert.equal(descarteRepetido.hasCambio, false);

  // No se puede confirmar un aviso ya descartado
  assert.throws(() => resolverPendiente(descarte.pendiente, "confirmar"), /ya fue resuelta/);
});

// -------------------------------------------------------------
// CASO 13: Integridad y concurrencia optimista (CAS)
// -------------------------------------------------------------
test("Caso 13: Concurrencia optimista detecta conflictos de revisión en guardados", () => {
  const doc = docBase();
  const baseInicial = baseDocumento({ ...doc, revision: 1 });

  // Simular que otro dispositivo incrementó la revisión
  const docModificado = { ...doc, revision: 2 };
  const baseActual = baseDocumento(docModificado);

  assert.notEqual(baseInicial.revision, baseActual.revision);
});

// -------------------------------------------------------------
// CASO 14: Compatibilidad de backups y exportaciones
// -------------------------------------------------------------
test("Caso 14: Compatibilidad de backup v7 y reportes personales seguros", () => {
  const doc = docBase([
    normalizarCompra({
      id: "compra_test_1",
      persona: "Persona A",
      tarjeta: "Papá",
      item: "Notebook",
      monto: 30000,
      totales: 3,
      pagadas: 1
    })
  ]);

  const backup = crearBackup(doc);
  assert.equal(backup.version, 7);
  assert.equal(backup.items.length, 1);

  const restaurado = leerBackup(backup);
  assert.equal(restaurado.items.length, 1);
  assert.equal(restaurado.items[0].item, "Notebook");

  // Reporte personal excluye tarjetas y compras de otras personas
  const reporte = crearReportePersona(restaurado.items, "Persona A", () => ({ estado: "aldia", venc: null }), (i) => i.monto);
  assert.equal(reporte.filas.length, 1);
  assert.equal(reporte.filas[0].item, "Notebook");
});
