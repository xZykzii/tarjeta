import test from "node:test";
import assert from "node:assert/strict";
import { crearPendiente } from "../compras-pendientes.mjs";
import { crearPlanCuotas } from "../planes-cuotas.mjs";
import { prepararConfirmacion, validarRevisionCompra, pendienteDesdeDocumento } from "../confirmacion-compras.mjs";
import { crearSuscripcionPendientes } from "../repositorio-pendientes.mjs";
import { crearColaGuardado, baseDocumento } from "../persistencia-segura.mjs";

const EVENT = "evento_prueba_confirmacion_0001";
const RECEIVED_AT = 1792540800000;
function datos() {
  return { items: [], tarjetas: ["Prueba"], personas: ["A", "B"], tarjetaActiva: "Prueba", saldos: {}, historial: [] };
}
function aviso() { return crearPendiente({ eventId: EVENT, recibidaEn: RECEIVED_AT, parserVersion: "prueba-v1", montoOriginal: 1000, comercio: "Ejemplo" }); }
function revision() {
  return { item: "Compra revisada", fechaCompra: "2026-10-21", tarjeta: "Prueba",
    planCuotas: crearPlanCuotas({ modalidad: "sin_interes", montoOriginal: 1000, numeroCuotas: 3 }),
    asignaciones: [{ persona: "A", monto: 700 }, { persona: "B", monto: 300 }] };
}
function snapshot(lista = [aviso()], hasConexion = true) {
  return { docs: lista.map((value) => ({ id: value.eventId, data: () => value })),
    metadata: { fromCache: !hasConexion, hasPendingWrites: false } };
}

test("una confirmación prepara todas las participaciones sin duplicar el contrato ni mutar el aviso", () => {
  const original = aviso();
  const documento = datos();
  const salida = prepararConfirmacion(original, revision(), documento);
  assert.equal(documento.items.length, 0);
  assert.equal(original.estado, "sin_asignar");
  assert.equal(salida.documento.items.length, 2);
  assert.deepEqual(salida.documento.items.map((item) => item.cuotasAsignadas.reduce((a, b) => a + b)), [700, 300]);
  assert.equal(new Set(salida.documento.items.map((item) => item.compraGrupoId)).size, 1);
  assert.equal(salida.pendiente.compraId, `auto_${EVENT}`);
  assert.deepEqual(prepararConfirmacion(original, revision(), documento), salida);
  assert.throws(() => prepararConfirmacion(original, revision(), salida.documento), /Ya existe/);
});

test("la revisión exige fecha explícita, catálogo actual y suma exacta", () => {
  const entrada = revision();
  for (const fechaCompra of [null, "", "2026-02-30"]) {
    assert.throws(() => validarRevisionCompra({ ...entrada, fechaCompra }, datos()));
  }
  assert.throws(() => validarRevisionCompra({ ...entrada, tarjeta: "Eliminada" }, datos()));
  assert.throws(() => validarRevisionCompra(entrada, { ...datos(), personas: ["A"] }));
  assert.throws(() => validarRevisionCompra({ ...entrada, asignaciones: [{ persona: "A", monto: 999 }] }, datos()));
  assert.throws(() => validarRevisionCompra({ ...entrada, textoBruto: "no admitir" }, datos()));
});

test("interés manual y participaciones pequeñas conservan cada columna y los ceros", () => {
  const planCuotas = crearPlanCuotas({ modalidad: "interes_manual", montoOriginal: 2, numeroCuotas: 3, valorCuota: 1 });
  const entrada = { ...revision(), planCuotas, asignaciones: [{ persona: "A", monto: 1 }, { persona: "B", monto: 2 }] };
  const { recibo } = prepararConfirmacion(aviso(), entrada, datos());
  assert.equal(recibo.planCuotas.interesesTotales, 1);
  for (let i = 0; i < 3; i++) assert.equal(recibo.items.reduce((sum, item) => sum + item.cuotasAsignadas[i], 0), 1);
});

test("el adaptador no descarta silenciosamente campos ni acepta otra identidad", () => {
  assert.deepEqual(pendienteDesdeDocumento(EVENT, { ...aviso(), creadaEn: { toMillis: () => RECEIVED_AT } }), aviso());
  assert.throws(() => pendienteDesdeDocumento("otra_identidad_0001", aviso()));
  assert.throws(() => pendienteDesdeDocumento(EVENT, { ...aviso(), creadaEn: RECEIVED_AT }));
  assert.throws(() => pendienteDesdeDocumento(EVENT, { ...aviso(), uid: "invitado" }));
});

test("cambiar de cuenta anula callbacks tardíos de lista y de error", () => {
  const callbacks = [];
  const vistas = [];
  let canceladas = 0;
  const control = crearSuscripcionPendientes({
    escuchar: (uid, recibir, fallar) => { callbacks.push({ uid, recibir, fallar }); return () => { canceladas++; }; },
    alCambiar: (vista) => vistas.push(vista)
  });
  control.iniciar("A");
  control.iniciar("B");
  const cantidad = vistas.length;
  callbacks[0].recibir(snapshot());
  callbacks[0].fallar(new Error("anterior"));
  assert.equal(vistas.length, cantidad);
  callbacks[1].recibir(snapshot());
  assert.equal(vistas.at(-1).lista.length, 1);
  control.detener();
  callbacks[1].recibir(snapshot());
  assert.equal(vistas.at(-1).lista.length, 0);
  assert.equal(canceladas, 2);
});

test("la caché no habilita confirmación y una respuesta inválida vacía la lista", () => {
  let recibir;
  let vista;
  const control = crearSuscripcionPendientes({
    escuchar: (uid, callback) => { recibir = callback; return () => {}; }, alCambiar: (valor) => { vista = valor; }
  });
  control.iniciar("A");
  recibir(snapshot([aviso()], false));
  assert.equal(vista.hasConexion, false);
  recibir(snapshot());
  assert.equal(vista.hasConexion, true);
  recibir(snapshot([aviso(), aviso()]));
  assert.equal(vista.hasError, true);
  assert.equal(vista.lista.length, 0);
});

test("la operación externa actualiza la base de la cola antes del próximo guardado", async () => {
  const revisiones = [];
  const cola = crearColaGuardado(async (base, documento) => {
    revisiones.push(base.revision);
    return baseDocumento({ ...documento, revision: base.revision + 1 });
  });
  cola.cargar({ ...datos(), revision: 1 });
  await cola.ejecutar(async (base) => ({ documento: { ...datos(), revision: base.revision + 1 } }));
  await cola.encolar(datos());
  assert.deepEqual(revisiones, [2]);
  const retrasada = cola.ejecutar(async () => { throw new Error("fallo" ); });
  await assert.rejects(retrasada);
  await assert.rejects(cola.encolar(datos()));
});
