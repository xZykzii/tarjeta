import test from "node:test";
import assert from "node:assert/strict";
import { crearPlanCuotas } from "../planes-cuotas.mjs";
import { repartirPlanCuotas } from "../reparto-compras.mjs";
import {
  recalcularCompra, totalContratoDe, pagadoDeCompra, restanteCuotaDe, montoExigibleHasta,
  proximaCuotaNumero, registrarPagoCompra, deshacerPagoCompra, importesDeCompra
} from "../cuotas-item.mjs";
import { normalizarCompra, normalizarCompras, serializarCompra, crearBackup, leerBackup } from "../datos-compras.mjs";
import { calcularMontoExigibleMes, crearReportePersona, resumirTarjeta } from "../logic.mjs";

function nuevoPlan(total = 100, numero = 3) {
  return crearPlanCuotas({ modalidad: "sin_interes", montoOriginal: total, numeroCuotas: numero });
}

function compra(plan = nuevoPlan(), cambios = {}) {
  return normalizarCompra({
    id: "compra_prueba_0001", origen: "automatico", persona: "A", tarjeta: "Ejemplo",
    item: "Plan de prueba", planCuotas: plan, totales: plan.cuotas.length,
    pagadas: 0, monto: plan.cuotas[0], fechaCompra: "2026-01-01", ...cambios
  });
}

function vencimiento(fecha, numero) {
  const inicio = new Date(`${fecha}T00:00:00`);
  return new Date(inicio.getFullYear(), inicio.getMonth() + numero - 1, 25);
}

function estadoDe(item) {
  return { estado: "aldia", montoAtrasado: 0, montoExigibleMes: montoExigibleHasta(item, item.totales) };
}

test("pagos y abonos siguen el valor exacto de cada cuota, incluida la última", () => {
  let item = compra();
  assert.equal(totalContratoDe(item), 100);
  assert.equal(restanteCuotaDe(item), 34);
  item = registrarPagoCompra(item, 10).compra;
  assert.equal(pagadoDeCompra(item), 10);
  assert.equal(restanteCuotaDe(item), 24);
  item = registrarPagoCompra(item, 24).compra;
  assert.equal(pagadoDeCompra(item), 34);
  assert.equal(restanteCuotaDe(item), 33);
  item = registrarPagoCompra(item, 33).compra;
  assert.equal(restanteCuotaDe(item), 33);
  item = registrarPagoCompra(item, 33).compra;
  assert.equal(item.total, 0);
  assert.equal(pagadoDeCompra(item), 100);
  assert.equal(item.pagadas, 3);
});

test("deshacer devuelve la cuota pagada y no la primera ni un promedio", () => {
  let item = compra();
  item = registrarPagoCompra(item, 34).compra;
  item = registrarPagoCompra(item, 33).compra;
  const ultima = deshacerPagoCompra(item);
  assert.equal(ultima.devuelto, 33);
  assert.equal(ultima.compra.pagadas, 1);
  assert.equal(ultima.compra.total, 66);
  const primera = deshacerPagoCompra(ultima.compra);
  assert.equal(primera.devuelto, 34);
  assert.equal(primera.compra.total, 100);
  const abono = deshacerPagoCompra(registrarPagoCompra(primera.compra, 10).compra);
  assert.equal(abono.isAbono, true);
  assert.equal(abono.devuelto, 10);
});

test("mensualidad y atrasos acumulan importes variables y descuentan un abono una vez", () => {
  const item = compra(nuevoPlan(), { pagadas: 1, abonado: 10 });
  assert.equal(calcularMontoExigibleMes(item, new Date(2026, 2, 10), vencimiento), 56);
  assert.equal(montoExigibleHasta(item, 2), 23);
  assert.equal(montoExigibleHasta(item, 3), 56);
  assert.equal(calcularMontoExigibleMes({ ...item, fechaCompra: "2026-05-01" }, new Date(2026, 2, 10), vencimiento), 0);
});

test("registro manual y automático usan los mismos resultados financieros", () => {
  const automatico = compra(nuevoPlan(), { pagadas: 1, abonado: 10 });
  const manual = compra(nuevoPlan(), { origen: "manual", pagadas: 1, abonado: 10 });
  assert.deepEqual(resumirTarjeta([automatico], estadoDe, pagadoDeCompra), resumirTarjeta([manual], estadoDe, pagadoDeCompra));
});

test("una participación de cero en un mes no genera cuota exigible ni pago ficticio", () => {
  const plan = nuevoPlan(3, 3);
  const item = compra(plan, { cuotasAsignadas: [0, 0, 1], compraGrupoId: "grupo_prueba" });
  assert.equal(proximaCuotaNumero(item), 3);
  assert.equal(totalContratoDe(item), 1);
  assert.equal(montoExigibleHasta(item, 1), 0);
  assert.equal(montoExigibleHasta(item, 2), 0);
  assert.equal(calcularMontoExigibleMes(item, new Date(2026, 1, 10), vencimiento), 0);
  const pago = registrarPagoCompra(item, 1);
  assert.equal(pago.cuota, 3);
  assert.equal(pago.compra.pagadas, 3);
  assert.equal(pago.compra.total, 0);
  const deshecho = deshacerPagoCompra(pago.compra);
  assert.equal(deshecho.devuelto, 1);
  assert.equal(proximaCuotaNumero(deshecho.compra), 3);
  const finalCero = compra(plan, { cuotasAsignadas: [1, 1, 0], compraGrupoId: "otro_grupo" });
  const completa = registrarPagoCompra(registrarPagoCompra(finalCero, 1).compra, 1).compra;
  assert.equal(completa.pagadas, 3);
  assert.equal(completa.total, 0);
});

test("reparto 700/300 conserva el contrato en resúmenes personales y globales", () => {
  const plan = nuevoPlan(1000, 3);
  const reparto = repartirPlanCuotas(plan, [{ persona: "A", monto: 700 }, { persona: "B", monto: 300 }]);
  const items = reparto.participaciones.map((parte, i) => compra(plan, {
    id: `participacion_${i}`, persona: parte.persona, cuotasAsignadas: parte.cuotas, compraGrupoId: "grupo_unico"
  }));
  assert.equal(items[0].total, 700);
  assert.equal(items[1].total, 300);
  assert.equal(resumirTarjeta(items, estadoDe, pagadoDeCompra).totalContrato, 1000);
  const personal = crearReportePersona(items, "A", estadoDe, pagadoDeCompra);
  assert.equal(personal.resumen.totalContrato, 700);
  assert.equal(personal.filas[0].totalContrato, 700);
  assert.equal(personal.filas[0].cuotasImportes.reduce((s, valor) => s + valor, 0), 700);
  assert.equal(Object.hasOwn(personal.filas[0], "planCuotas"), false);
  assert.equal(Object.hasOwn(personal.filas[0], "tarjeta"), false);
  assert.equal(Object.hasOwn(personal.filas[0], "persona"), false);
});

test("planes individuales variables e interés manual mantienen el contrato al pagar y deshacer", () => {
  const plan = crearPlanCuotas({ modalidad: "personalizadas", montoOriginal: 100, numeroCuotas: 3, cuotas: [50, 35, 25] });
  let item = compra(plan);
  assert.equal(item.total, 110);
  for (const valor of [50, 35, 25]) item = registrarPagoCompra(item, valor).compra;
  assert.equal(pagadoDeCompra(item), 110);
  assert.equal(deshacerPagoCompra(item).devuelto, 25);
});

test("backup v7 conserva ID, origen, planes, pagos y participaciones", () => {
  const item = compra(nuevoPlan(), { pagadas: 1, abonado: 10, eventoOrigenId: "evento_prueba_0001" });
  const datos = { items: [item], personas: ["A"], tarjetas: ["Ejemplo"], tarjetaActiva: "Ejemplo", saldos: { A: 50 }, historial: [] };
  const backup = crearBackup(datos);
  assert.equal(backup.version, 7);
  assert.equal(Object.hasOwn(backup.items[0], "total"), false);
  const restaurada = leerBackup(JSON.parse(JSON.stringify(backup)));
  assert.equal(restaurada.items[0].id, item.id);
  assert.equal(restaurada.items[0].origen, "automatico");
  assert.equal(restaurada.items[0].eventoOrigenId, item.eventoOrigenId);
  assert.deepEqual(restaurada.items[0].planCuotas, item.planCuotas);
  assert.equal(restaurada.items[0].total, 56);
  const compartida = compra(nuevoPlan(3, 3), { cuotasAsignadas: [0, 0, 1], compraGrupoId: "grupo_prueba" });
  assert.deepEqual(serializarCompra(compartida).cuotasAsignadas, [0, 0, 1]);
});

test("backup v6 y listas antiguas mantienen importes y reciben ID estable sin alterar pagos", () => {
  const legado = { persona: "A", tarjeta: "Ejemplo", item: "Legado", monto: 2000, totales: 8, pagadas: 2, abonado: 500, fechaCompra: "2026-01-01" };
  const crearId = () => "id_legado";
  const antiguo = leerBackup({ version: 6, items: [legado], personas: ["A"], tarjetas: ["Ejemplo"] }, crearId);
  assert.equal(antiguo.items[0].total, 11500);
  assert.equal(antiguo.items[0].abonado, 500);
  assert.equal(antiguo.items[0].origen, "manual");
  assert.equal(serializarCompra(antiguo.items[0]).id, "id_legado");
  assert.equal(leerBackup([legado], crearId).items[0].fechaCompra, legado.fechaCompra);
  assert.equal(Object.hasOwn(legado, "id"), false);
});

test("importación rechaza versiones futuras, IDs repetidos y planes corruptos antes de reemplazar datos", () => {
  assert.throws(() => leerBackup({ version: 8, items: [] }));
  assert.throws(() => normalizarCompras([compra(), compra()]));
  assert.throws(() => compra(nuevoPlan(), { cuotasAsignadas: [40, 30, 30], compraGrupoId: "grupo" }));
  assert.throws(() => normalizarCompra({ monto: "error", totales: 2 }));
  assert.throws(() => compra(nuevoPlan(), { fechaCompra: "2026-02-30" }));
  assert.throws(() => compra(nuevoPlan(), { totales: 4 }));
  assert.throws(() => compra(nuevoPlan(), { origen: "inventado" }));
  assert.throws(() => importesDeCompra({ totales: 3, monto: 10, cuotasAsignadas: [1, 1, 1] }));
});

test("compatibilidad de la fórmula histórica de abonos y decimales sin convertir el contrato", () => {
  const original = { monto: 0.3, totales: 6, pagadas: 2, abonado: 0.1 };
  const item = recalcularCompra({ ...original });
  assert.equal(totalContratoDe(item), original.monto * original.totales);
  assert.equal(pagadoDeCompra(item), original.monto * original.pagadas + original.abonado);
  assert.equal(item.total, original.monto * (original.totales - original.pagadas) - original.abonado);
  assert.equal(Object.hasOwn(item, "planCuotas"), false);
});

test("un plan explícito no pierde silenciosamente abonos inválidos al restaurar", () => {
  for (const abonado of [34, -1, 0.5, "error", Infinity]) {
    assert.throws(() => compra(nuevoPlan(), { abonado }));
  }
  assert.throws(() => compra(nuevoPlan(), { pagadas:3, abonado:1 }));
  assert.equal(compra(nuevoPlan(), { pagadas:3, abonado:0 }).total, 0);
});

test("fechas legadas desconocidas siguen siendo null sin bloquear toda la cuenta", () => {
  const legado = normalizarCompra({ id:"legado_fecha", monto:1000, totales:3, pagadas:1, fechaCompra:"fecha anterior inválida" });
  assert.equal(legado.fechaCompra, null);
  assert.equal(legado.total, 2000);
  assert.equal(normalizarCompra({ ...legado, fechaCompra:" 2026-10-01 " }).fechaCompra, "2026-10-01");
  assert.throws(() => compra(nuevoPlan(), { fechaCompra:"2026-02-30" }));
});
