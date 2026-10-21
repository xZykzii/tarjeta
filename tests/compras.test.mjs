import test from "node:test";
import assert from "node:assert/strict";
import {
  crearPlanCuotas, validarPlanCuotas, planDeItem,
  resumirPlanCuotas, montoExigiblePlan, MAX_CUOTAS
} from "../planes-cuotas.mjs";
import {
  crearPendiente, validarPendiente, resolverPendiente, compraIdDeEvento
} from "../compras-pendientes.mjs";
import {
  crearRepartoIgual, validarReparto, repartirPlanCuotas, validarPersonasReparto
} from "../reparto-compras.mjs";
import {
  analizarNotificacionFalabella, soporteAnalizador, MAX_TEXTO_NOTIFICACION
} from "../falabella-notificaciones.mjs";
import {
  baseDocumento, guardarConRevision, crearColaGuardado
} from "../persistencia-segura.mjs";

// Datos ficticios. La gramática positiva se transcribió de la captura;
// ni este paquete ni los negativos son muestras verificadas del banco.
const PAQUETE_FICTICIO = "cl.ejemplo.banco";
const CONFIG = { paqueteAutorizado: PAQUETE_FICTICIO, hasPaqueteVerificado: true };
const CABECERA = "Compraste $1.000 en COMERCIO DE EJEMPLO CHL";
const CUERPO = "Con tu CMR Mastercard Elite terminada en 0000. Si no la realizaste tú, revisa los movimientos de tus adicionales en tu app.";
const EVENTO = "evento_ficticio_0001";
const RECEPCION_FICTICIA = 1792540800000;

function plan(total = 100, cuotas = 3) {
  return crearPlanCuotas({ modalidad: "sin_interes", montoOriginal: total, numeroCuotas: cuotas });
}

function captura(cambios = {}) {
  return {
    paquete: PAQUETE_FICTICIO, isResumenGrupo: false,
    titulo: CABECERA, texto: CUERPO, ...cambios
  };
}

function pendiente(cambios = {}) {
  return crearPendiente({
    eventId: EVENTO, montoOriginal: 1000, comercio: "Ejemplo",
    fechaCompra: null, recibidaEn: RECEPCION_FICTICIA,
    parserVersion: "fixture-v1", ...cambios
  });
}

test("una cuota conserva monto original y no inventa interés", () => {
  const compra = crearPlanCuotas({ modalidad: "una_cuota", montoOriginal: 15000, numeroCuotas: 1 });
  assert.deepEqual(compra.cuotas, [15000]);
  assert.equal(compra.totalFinal, 15000);
  assert.equal(compra.interesesTotales, 0);
  assert.throws(() => crearPlanCuotas({ modalidad: "una_cuota", montoOriginal: 100, numeroCuotas: 2 }));
});

test("sin interés reparte pesos sobrantes y conserva la suma exhaustivamente", () => {
  assert.deepEqual(plan().cuotas, [34, 33, 33]);
  const MAX_TOTAL_PRUEBA = 300;
  for (let total = 1; total <= MAX_TOTAL_PRUEBA; total++) {
    for (let numero = 1; numero <= Math.min(MAX_CUOTAS, total); numero++) {
      const compra = plan(total, numero);
      assert.equal(compra.cuotas.reduce((suma, cuota) => suma + cuota, 0), total);
      assert.ok(Math.max(...compra.cuotas) - Math.min(...compra.cuotas) <= 1);
    }
  }
});

test("interés manual calcula total y diferencia, cuotas individuales son explícitas", () => {
  const compra = crearPlanCuotas({ modalidad: "interes_manual", montoOriginal: 120000, numeroCuotas: 6, valorCuota: 22000 });
  assert.equal(compra.totalFinal, 132000);
  assert.equal(compra.interesesTotales, 12000);
  const diferente = crearPlanCuotas({ modalidad: "personalizadas", montoOriginal: 100, numeroCuotas: 3, cuotas: [40, 35, 35] });
  assert.equal(diferente.interesesTotales, 10);
  assert.deepEqual(validarPlanCuotas(diferente), diferente);
});

test("rechaza dinero fraccionario, strings, cuotas imposibles y overflow", () => {
  for (const total of [0, -1, 1.5, "100", NaN, Infinity, Number.MAX_SAFE_INTEGER + 1]) {
    assert.throws(() => plan(total));
  }
  for (const numero of [0, -1, 1.5, MAX_CUOTAS + 1]) assert.throws(() => plan(1000, numero));
  assert.throws(() => plan(1, 2));
  assert.throws(() => crearPlanCuotas({ modalidad: "interes_manual", montoOriginal: 100, numeroCuotas: 2, valorCuota: Number.MAX_SAFE_INTEGER }));
  assert.throws(() => crearPlanCuotas({ modalidad: "personalizadas", montoOriginal: 100, numeroCuotas: 2, cuotas: Array(2) }));
  assert.throws(() => crearPlanCuotas({ modalidad: "interes_manual", montoOriginal: 100, numeroCuotas: 2, valorCuota: 40 }));
});

test("un plan leído de API no puede alterar sumas o cuotas", () => {
  const compra = plan();
  assert.throws(() => validarPlanCuotas({ ...compra, totalFinal: 101 }));
  assert.throws(() => validarPlanCuotas({ ...compra, cuotas: [33, 34, 33] }));
  assert.throws(() => validarPlanCuotas({ ...compra, moneda: "USD" }));
});

test("adaptador legado conserva monto por cuota y no modifica el original", () => {
  const legado = { monto: 2000, totales: 8, pagadas: 2, abonado: 500 };
  const previo = structuredClone(legado);
  assert.deepEqual(planDeItem(legado).cuotas, Array(8).fill(2000));
  assert.deepEqual(legado, previo);
  assert.throws(() => planDeItem({ ...legado, planCuotas: null }));
});

test("pagos parciales y atrasos usan importes de cada cuota sin doble descuento", () => {
  const compra = plan();
  assert.deepEqual(resumirPlanCuotas(compra, 1, 10), {
    totalFinal: 100, pagado: 44, pendiente: 56, proximaCuota: 23, isCompleto: false
  });
  assert.equal(montoExigiblePlan(compra, 1, 10, 3), 56);
  assert.equal(montoExigiblePlan(compra, 1, 10, 1), 0);
  assert.equal(resumirPlanCuotas(compra, 3, 0).pendiente, 0);
  assert.throws(() => resumirPlanCuotas(compra, 0, 34));
  assert.throws(() => resumirPlanCuotas(compra, 3, 1));
});

test("compra incompleta queda sin asignar y no contiene persona ni deuda", () => {
  const registro = pendiente({ montoOriginal: null, comercio: null });
  assert.equal(registro.estado, "sin_asignar");
  assert.equal(registro.fechaCompra, null);
  assert.equal(registro.montoOriginal, null);
  assert.equal(Object.hasOwn(registro, "persona"), false);
  assert.equal(Object.hasOwn(registro, "total"), false);
});

test("contrato rechaza datos inválidos, campos innecesarios y PAN completo", () => {
  assert.throws(() => pendiente({ textoBruto: "No almacenar" }));
  assert.throws(() => pendiente({ uid: "otro_usuario" }));
  assert.throws(() => pendiente({ tarjetaUltimos4: "1234567890123456" }));
  assert.throws(() => pendiente({ fechaCompra: "2026-02-30" }));
  assert.throws(() => pendiente({ horaCompra: "25:01" }));
  assert.throws(() => pendiente({ montoOriginal: 10.5 }));
  assert.throws(() => pendiente({ moneda: "USD" }));
  assert.throws(() => pendiente({ referenciaHash: "referencia sin hash" }));
});

test("la resolución de dominio es idempotente y no reabre descartes", () => {
  const original = pendiente();
  const primera = resolverPendiente(original, "confirmar");
  assert.equal(primera.hasCambio, true);
  assert.equal(primera.pendiente.compraId, compraIdDeEvento(EVENTO));
  assert.equal(resolverPendiente(primera.pendiente, "confirmar").hasCambio, false);
  assert.equal(original.estado, "sin_asignar");
  const descarte = resolverPendiente(original, "descartar");
  assert.equal(resolverPendiente(descarte.pendiente, "descartar").hasCambio, false);
  assert.throws(() => resolverPendiente(descarte.pendiente, "confirmar"));
  assert.throws(() => crearPendiente(descarte.pendiente));
  assert.throws(() => validarPendiente({ ...primera.pendiente, compraId: "otro_evento_00000" }));
  const largo = resolverPendiente(pendiente({ eventId: "a".repeat(128) }), "confirmar");
  assert.equal(validarPendiente(largo.pendiente).compraId.length, 133);
});

test("reparto libre de 1000 admite 700/300 y reparto igual es opcional", () => {
  const partes = [{ persona: "A", monto: 700 }, { persona: "B", monto: 300 }];
  assert.deepEqual(validarReparto(1000, partes), partes);
  assert.deepEqual(crearRepartoIgual(1000, ["A", "B", "C"]).map((p) => p.monto), [334, 333, 333]);
  assert.throws(() => validarReparto(1000, [{ persona: "A", monto: 700 }, { persona: "B", monto: 400 }]));
  assert.throws(() => validarReparto(1000, [{ persona: "A", monto: 500 }, { persona: " A ", monto: 500 }]));
  assert.throws(() => validarPersonasReparto(partes, ["A"]));
  assert.equal(validarPersonasReparto(partes, ["A", "B"]), true);
});

test("reparto en cuotas conserva exactamente cada persona y cada mes", () => {
  const MAX_TOTAL_PRUEBA = 100;
  for (let total = 2; total <= MAX_TOTAL_PRUEBA; total++) {
    for (let parte = 1; parte < total; parte++) {
      const compra = plan(total, Math.min(total, 6));
      const resultado = repartirPlanCuotas(compra, [{ persona: "A", monto: parte }, { persona: "B", monto: total - parte }]);
      assert.equal(resultado.participaciones[0].cuotas.reduce((a, b) => a + b, 0), parte);
      compra.cuotas.forEach((cuota, i) => {
        assert.equal(resultado.participaciones.reduce((a, b) => a + b.cuotas[i], 0), cuota);
      });
    }
  }
});

test("reparto usa aritmética exacta para importes grandes y planes con interés", () => {
  const compra = plan(Number.MAX_SAFE_INTEGER, MAX_CUOTAS);
  const partes = crearRepartoIgual(compra.totalFinal, ["A", "B", "C"]);
  const reparto = repartirPlanCuotas(compra, partes);
  assert.equal(reparto.participaciones[2].cuotas.reduce((a, b) => a + b, 0), partes[2].monto);
  const interes = crearPlanCuotas({ modalidad: "interes_manual", montoOriginal: 120000, numeroCuotas: 6, valorCuota: 22000 });
  const compartida = repartirPlanCuotas(interes, [{ persona: "A", monto: 100000 }, { persona: "B", monto: 32000 }]);
  assert.equal(compartida.totalFinal, 132000);
});

test("gramática documentada reconoce título/cuerpo sin inferir fecha o cuotas", () => {
  const resultado = analizarNotificacionFalabella(captura(), CONFIG);
  assert.equal(resultado.resultado, "compra");
  assert.equal(resultado.datos.montoOriginal, 1000);
  assert.equal(resultado.datos.tarjetaUltimos4, "0000");
  assert.equal(resultado.datos.fechaCompra, null);
  assert.equal(Object.hasOwn(resultado.datos, "numeroCuotas"), false);
  const ampliada = analizarNotificacionFalabella(captura({ titulo: "Banco Falabella", texto: "", textoAmpliado: `${CABECERA}\n${CUERPO}` }), CONFIG);
  assert.deepEqual(ampliada.datos, resultado.datos);
});

test("origen no verificado, otro paquete y resumen de grupo se rechazan", () => {
  assert.equal(analizarNotificacionFalabella(captura(), {}).motivo, "paquete_no_verificado");
  assert.equal(analizarNotificacionFalabella(captura({ paquete: "otra.app" }), CONFIG).motivo, "otra_aplicacion");
  assert.equal(analizarNotificacionFalabella(captura({ isResumenGrupo: true }), CONFIG).resultado, "ignorada");
  assert.equal(soporteAnalizador().hasCapturaAndroidValidada, false);
});

test("negativos sintéticos y contenido ambiguo no producen compras", () => {
  for (const titulo of ["Pagaste $1.000", "Abonaste $1.000", "Devolución $1.000", "Reversa $1.000", "Aprovecha nuestras ofertas", "Compraste $1.00 en Ejemplo"]) {
    assert.equal(analizarNotificacionFalabella(captura({ titulo }), CONFIG).resultado, "ignorada");
  }
  const distinto = `${CABECERA.replace("1.000", "2.000")} ${CUERPO}`;
  assert.equal(analizarNotificacionFalabella(captura({ textoAmpliado: distinto }), CONFIG).motivo, "contenido_ambiguo");
  assert.equal(analizarNotificacionFalabella(captura({ titulo: "x".repeat(MAX_TEXTO_NOTIFICACION + 1) }), CONFIG).motivo, "texto_invalido");
});

function documento(items = []) {
  return { items, tarjetas: ["Ejemplo"], personas: ["A"], tarjetaActiva: "Ejemplo", saldos: {}, historial: [] };
}

// Puerto de prueba en memoria. No certifica reglas ni concurrencia del
// SDK Firestore; permite comprobar las precondiciones del callback.
function almacenDePrueba(inicial) {
  let datos = structuredClone(inicial);
  let escrituras = 0;
  const sdk = {
    db: {},
    runTransaction: async (_, operacion) => operacion({
      get: async () => ({ exists: () => datos !== null, data: () => structuredClone(datos) }),
      set: (_, cambio) => { datos = { ...datos, ...structuredClone(cambio) }; escrituras++; }
    })
  };
  return { sdk, leer: () => structuredClone(datos), contar: () => escrituras };
}

test("dos clientes con la misma base no pueden sobrescribir el primer guardado", async () => {
  const original = documento();
  const almacen = almacenDePrueba(original);
  const baseA = baseDocumento(original);
  const baseB = baseDocumento(original);
  const compraA = { item: "Compra A" };
  await guardarConRevision(almacen.sdk, "referencia_prueba", baseA, documento([compraA]));
  await assert.rejects(
    guardarConRevision(almacen.sdk, "referencia_prueba", baseB, documento([{ item: "Compra B" }])),
    { code: "conflicto_guardado" }
  );
  assert.deepEqual(almacen.leer().items, [compraA]);
  assert.equal(almacen.contar(), 1);
});

test("la comparación de contenido detecta un escritor antiguo sin revisión", async () => {
  const original = documento();
  const cambiado = documento([{ item: "Cambio legado" }]);
  const almacen = almacenDePrueba(cambiado);
  await assert.rejects(guardarConRevision(almacen.sdk, "ref", baseDocumento(original), documento()), { code: "conflicto_guardado" });
  assert.equal(almacen.contar(), 0);
  const nuevo = almacenDePrueba(null);
  const base = await guardarConRevision(nuevo.sdk, "ref", baseDocumento(null), documento());
  assert.equal(base.revision, 1);
});

test("cola serializa revisiones y captura borradores sin mutarlos", async () => {
  const original = documento();
  const almacen = almacenDePrueba(original);
  const cola = crearColaGuardado((base, datos) => guardarConRevision(almacen.sdk, "ref", base, datos));
  cola.cargar(original);
  const primero = documento([{ item: "Primera" }]);
  const tareaA = cola.encolar(primero);
  primero.items.push({ item: "Mutación posterior" });
  const tareaB = cola.encolar(documento([{ item: "Segunda" }]));
  await Promise.all([tareaA, tareaB]);
  assert.equal(almacen.leer().revision, 2);
  assert.deepEqual(almacen.leer().items, [{ item: "Segunda" }]);
});

test("un fallo bloquea la cola hasta lectura explícita y no escribe al invalidar", async () => {
  let intentos = 0;
  const cola = crearColaGuardado(async () => { intentos++; throw new Error("Sin conexión de prueba"); });
  cola.cargar(documento());
  await assert.rejects(cola.encolar(documento()), /Sin conexión/);
  await assert.rejects(cola.encolar(documento()), /Recarga/);
  assert.equal(intentos, 1);
  cola.cargar(documento());
  const enEspera = cola.encolar(documento());
  cola.invalidar();
  await assert.rejects(enEspera, /Recarga/);
  assert.equal(intentos, 1);
});
