import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import { validarDocumento, saldoDe, sumarSaldo, guardarConRevision, baseDocumento } from "../persistencia-segura.mjs";
import { leerBackup, crearBackup } from "../datos-compras.mjs";
import { crearPlanCuotas } from "../planes-cuotas.mjs";
import { repartirPlanCuotas } from "../reparto-compras.mjs";
import { normalizarCompra } from "../datos-compras.mjs";
import { registrarPagoCompra, deshacerPagoCompra, pagadoDeCompra, totalContratoDe } from "../cuotas-item.mjs";
import { jsPDF } from "jspdf";
import { crearReportePersona, crearReporteGeneral } from "../logic.mjs";
import { generarPdfPersona, generarPdfGeneral } from "../pdf-export.mjs";

const html = readFileSync(new URL("../index.html", import.meta.url), "utf8").replaceAll("\r\n", "\n");
const MARCA_HTML = '</select><img src=x onerror="alert(1)"><select>';

function documento(saldos = {}) {
  return { items: [], personas: ["A"], tarjetas: ["Ejemplo"], tarjetaActiva: "Ejemplo", saldos, historial: [] };
}

function funcion(nombre, isAsync = false) {
  const patron = new RegExp(`  ${isAsync ? "async " : ""}function ${nombre}\\([^]*?\\n  }`);
  const texto = html.match(patron)?.[0];
  assert.ok(texto, `Existe la función de producción ${nombre}`);
  return texto;
}

function contextoSaldo(saldo, entrada) {
  const contexto = vm.createContext({
    saldos: { A: saldo }, personaSeleccionada: "A", saldoDe, sumarSaldo,
    input: { value: entrada }, avisos: [], eventos: [], guardados: 0,
    requireLogin: () => true, console: { error() {} },
    showLoading() {}, hideLoading() {}, updateSaldoUI() {}, fmt: String,
    document: { getElementById() { return contexto.input; } },
    toast(mensaje, tipo) { contexto.avisos.push({ mensaje, tipo }); },
    logEvento(tipo, datos) { contexto.eventos.push({ tipo, ...datos }); },
    async save() { contexto.guardados++; }
  });
  vm.runInContext(`${funcion("saldoConAporte")}\n${funcion("agregarSaldo", true)}; globalThis.ejecutar = agregarSaldo;`, contexto);
  return contexto;
}

test("saldos inválidos se rechazan al importar y antes de guardar sin tocar la entrada", async () => {
  const invalidos = ["100", "", -1, NaN, Infinity, null, {}, [], true, Number.MAX_SAFE_INTEGER + 1];
  for (const valor of invalidos) {
    const doc = documento({ A: valor });
    assert.throws(() => validarDocumento(doc), /saldo/i);
    assert.throws(() => leerBackup({ version: 7, ...doc }), /saldo/i);
    let hasTransaccion = false;
    await assert.rejects(guardarConRevision({ db: {}, runTransaction() { hasTransaccion = true; } },
      {}, baseDocumento(documento()), doc), /saldo/i);
    assert.equal(hasTransaccion, false);
    assert.equal(doc.saldos.A, valor);
  }
});

test("saldo ausente equivale a cero, pero las propiedades heredadas no son saldos", () => {
  assert.equal(saldoDe({}, "A"), 0);
  assert.equal(saldoDe({}, "constructor"), 0);
  assert.equal(saldoDe({}, "__proto__"), 0);
  const especiales = JSON.parse('{"__proto__":100,"constructor":50}');
  assert.equal(saldoDe(especiales, "__proto__"), 100);
  assert.equal(sumarSaldo(especiales, "constructor", 25), 75);
  assert.equal(especiales.constructor, 50);
});

test("100 + 50 suma 150 en el manejador real de la interfaz", async () => {
  const contexto = contextoSaldo(100, "50");
  await contexto.ejecutar();
  assert.equal(contexto.saldos.A, 150);
  assert.equal(contexto.guardados, 1);
  assert.equal(contexto.input.value, "");
  assert.equal(contexto.eventos[0].monto, 50);
});

test("entrada fraccionaria, no numérica o desbordada no modifica saldo, historial ni guardado", async () => {
  for (const [saldo, entrada] of [[100, "50.5"], [100, "50abc"], [100, ""], [100, "-1"],
    ["100", "50"], [Number.MAX_SAFE_INTEGER, "1"], [100, "9007199254740992"]]) {
    const contexto = contextoSaldo(saldo, entrada);
    await contexto.ejecutar();
    assert.equal(contexto.saldos.A, saldo);
    assert.equal(contexto.input.value, entrada);
    assert.equal(contexto.guardados, 0);
    assert.equal(contexto.eventos.length, 0);
    assert.equal(contexto.avisos.at(-1).tipo, "error");
  }
  for (const entrada of ["50.5", "50abc", "9007199254740992"]) {
    const contexto = vm.createContext({
      items: [{ persona: "A", pagadas: 0, totales: 1 }], saldos: { A: 100 },
      saldoDe, abonoDe: () => 0, restanteCuota: () => 200, hasPlanExplicito: () => true,
      fmt: String, escapeHtml: String, showModal: async () => entrada,
      toast() {}, registrarPagoCompra() { assert.fail("No debe registrar un importe inválido"); }
    });
    vm.runInContext(`${funcion("pagarCuota", true)}; globalThis.ejecutar = pagarCuota;`, contexto);
    await contexto.ejecutar(0);
    assert.equal(contexto.saldos.A, 100);
    assert.equal(contexto.items[0].pagadas, 0);
  }
});

test("backups v6 y v7 conservan saldos válidos e históricos sin conversión silenciosa", () => {
  for (const version of [6, 7]) {
    const entrada = { version, ...documento({ A: 100.5, Reserva: Number.MAX_SAFE_INTEGER }) };
    entrada.historial.push({ tipo: "saldo", persona: "A", monto: 100, fecha: 1 });
    const copia = structuredClone(entrada);
    const salida = leerBackup(entrada);
    assert.deepEqual(salida.saldos, entrada.saldos);
    assert.deepEqual(crearBackup(salida).historial, entrada.historial);
    assert.deepEqual(entrada, copia);
  }
});

test("deshacer una cuota histórica decimal conserva el saldo sin convertirlo a texto ni redondear", () => {
  const inicial = normalizarCompra({ id: "decimal_historico", persona: "A", tarjeta: "Ejemplo",
    item: "Histórico", monto: 10.5, totales: 2, pagadas: 1, abonado: 0 });
  const reverso = deshacerPagoCompra(inicial);
  assert.equal(reverso.devuelto, 10.5);
  assert.equal(sumarSaldo({ A: 1.25 }, "A", reverso.devuelto), 11.75);
  assert.throws(() => sumarSaldo({ A: Number.MAX_SAFE_INTEGER }, "A", 0.25), /límite/);
  const doc = documento({ A: 11.75 });
  assert.deepEqual(leerBackup(crearBackup(doc)).saldos, doc.saldos);
});

test("historial escapa campos importados de texto y campos numéricos sin interpretar marcado", () => {
  const contexto = vm.createContext({
    fmt: n => (Number(n) || 0).toLocaleString("es-CL"), parseFecha: () => null,
    fmtFechaCorta: () => "", Date
  });
  vm.runInContext(`${funcion("escapeHtml")}\n${funcion("fmtFecha")}\n${funcion("renderHistList")};
    globalThis.renderizar = renderHistList;`, contexto);
  for (const tipo of ["saldo", "saldo_borrado", "compra_cuotas", "compra_unica", "pago_cuota",
    "abono", "deshacer_abono", "pago_unico", "deshacer_cuota", "fechas_recuperadas", MARCA_HTML]) {
    const elemento = {};
    contexto.renderizar(elemento, [{ tipo, persona: MARCA_HTML, item: MARCA_HTML, tarjeta: MARCA_HTML,
      totales: MARCA_HTML, cuota: MARCA_HTML, cantidad: MARCA_HTML, monto: MARCA_HTML, fecha: 1 }]);
    assert.ok(!elemento.innerHTML.includes("<img"), tipo);
    assert.ok(elemento.innerHTML.includes("&lt;img"), tipo);
  }
});

test("el selector del historial construye opciones como texto literal", () => {
  const opciones = [];
  const nodos = Object.fromEntries(["hist-list", "hist-count", "hist-persona-filter", "hist-close"]
    .map(id => [id, { addEventListener() {}, add(opcion) { opciones.push(opcion); } }]));
  const overlay = { querySelector: selector => nodos[selector.slice(1)], addEventListener() {} };
  const contexto = vm.createContext({
    personas: [MARCA_HTML], historial: [], renderHistList() {}, setTimeout,
    document: { createElement: () => overlay, body: { appendChild() {} } },
    Option: function(texto, valor) { this.text = texto; this.value = valor; }
  });
  vm.runInContext(`${funcion("showHistorial")}; showHistorial();`, contexto);
  assert.equal(opciones[1].text, MARCA_HTML);
  assert.equal(opciones[1].value, MARCA_HTML);
  assert.ok(!overlay.innerHTML.includes(MARCA_HTML));
});

test("reparto con intereses conserva cada columna y cada saldo al pagar y deshacer", () => {
  const plan = crearPlanCuotas({ modalidad: "interes_manual", montoOriginal: 120000,
    numeroCuotas: 6, valorCuota: 22000 });
  const reparto = repartirPlanCuotas(plan, [{ persona: "A", monto: 60000 }, { persona: "B", monto: 72000 }]);
  const cuotasPorPersona = reparto.participaciones;
  assert.equal(plan.totalFinal, 132000);
  for (const asignacion of cuotasPorPersona) {
    let compra = normalizarCompra({ id: `compra_${asignacion.persona}`, persona: asignacion.persona,
      tarjeta: "Ejemplo", item: "Ejemplo", planCuotas: plan, cuotasAsignadas: asignacion.cuotas,
      compraGrupoId: "grupo_ejemplo",
      monto: asignacion.cuotas[0], totales: 6, pagadas: 0 });
    let saldo = totalContratoDe(compra);
    const inicial = saldo;
    for (const cuota of asignacion.cuotas) {
      compra = registrarPagoCompra(compra, cuota).compra;
      saldo -= cuota;
      assert.equal(saldo + pagadoDeCompra(compra), inicial);
    }
    while (compra.pagadas > 0) {
      const reverso = deshacerPagoCompra(compra);
      saldo = sumarSaldo({ [asignacion.persona]: saldo }, asignacion.persona, reverso.devuelto);
      compra = reverso.compra;
      assert.equal(saldo + pagadoDeCompra(compra), inicial);
    }
    assert.equal(saldo, inicial);
  }
});

test("PDF real actualizado pagina el reporte y excluye tarjetas, totales y compras de terceros", () => {
  const compras = Array.from({ length: 30 }, (_, indice) => normalizarCompra({
    id: `compra_pdf_${indice}`, persona: "Persona A", tarjeta: "TC_A",
    item: `PRODUCTO_A_${indice}`, monto: 1000, totales: 3, pagadas: 0, fechaCompra: "2026-10-01"
  }));
  compras.push(normalizarCompra({ id: "tercero_pdf", persona: "PERSONA_PRIVADA_B",
    tarjeta: "TC_B", item: "PRODUCTO_PRIVADO_B", monto: 9000, totales: 1, pagadas: 0 }));
  const estadoDe = () => ({ estado: "aldia", montoAtrasado: 0, montoExigibleMes: 1000 });
  const personal = generarPdfPersona(jsPDF, crearReportePersona(compras, "Persona A", estadoDe, () => 0));
  const general = generarPdfGeneral(jsPDF, crearReporteGeneral(compras, estadoDe, () => 0));
  const texto = personal.doc.output();
  assert.match(texto, /^%PDF-/);
  assert.ok(personal.doc.getNumberOfPages() >= 2);
  assert.match(texto, /PRODUCTO_A_29/);
  assert.ok(!/TC_A|TC_B|PERSONA_PRIVADA_B|PRODUCTO_PRIVADO_B/.test(texto));
  assert.match(general.doc.output(), /PRODUCTO_PRIVADO_B/);
  assert.ok(general.doc.output().includes("TC_B"));
});
