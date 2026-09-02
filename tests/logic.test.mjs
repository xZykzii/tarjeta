import test from "node:test";
import assert from "node:assert/strict";
import {
  crearAgenda, crearReporteGeneral, crearReportePersona,
  filtrarItems, proximosHitosCiclo, resumirTarjeta
} from "../logic.mjs";

test("calcula los próximos hitos antes y después del cierre", () => {
  const antes = proximosHitosCiclo(new Date(2026, 7, 9), 10, 25);
  assert.equal(antes.cierre.toISOString().slice(0, 10), "2026-08-10");
  assert.equal(antes.pago.toISOString().slice(0, 10), "2026-08-25");

  const despues = proximosHitosCiclo(new Date(2026, 7, 26), 10, 25);
  assert.equal(despues.cierre.toISOString().slice(0, 10), "2026-09-10");
  assert.equal(despues.pago.toISOString().slice(0, 10), "2026-09-25");
});

test("la agenda prioriza atrasos, ordena por fecha y limita resultados", () => {
  const items = [
    { item: "Futuro", estado: "aldia", venc: new Date(2026, 9, 25) },
    { item: "Próximo", estado: "proximo", venc: new Date(2026, 8, 25) },
    { item: "Atrasado reciente", estado: "atrasado", venc: new Date(2026, 7, 25) },
    { item: "Atrasado antiguo", estado: "atrasado", venc: new Date(2026, 6, 25) },
    { item: "Sin fecha", estado: "sinfecha", venc: null }
  ];
  const agenda = crearAgenda(items, (item) => item, 3);
  assert.deepEqual(agenda.map(({ item }) => item.item), ["Atrasado antiguo", "Atrasado reciente", "Próximo"]);
});

test("resume toda la tarjeta sin depender del subconjunto visible", () => {
  const items = [
    { monto: 10000, totales: 3, pagadas: 1, total: 20000, estado: "aldia", montoAtrasado: 0 },
    { monto: 5000, totales: 2, pagadas: 0, total: 10000, estado: "atrasado", montoAtrasado: 5000 },
    { monto: 7000, totales: 1, pagadas: 1, total: 0, estado: "completo", montoAtrasado: 0 }
  ];
  const resumen = resumirTarjeta(items, (item) => item, (item) => item.monto * item.pagadas);
  assert.deepEqual(resumen, {
    totalContrato: 47000,
    pagado: 17000,
    pendiente: 30000,
    mensual: 15000,
    atrasado: 5000,
    itemsAtrasados: 1
  });

  const visibles = filtrarItems(
    [
      { persona: "Ana", item: "Notebook", tarjeta: "Visa", estado: "aldia" },
      { persona: "Luis", item: "Teléfono", tarjeta: "Visa", estado: "atrasado" }
    ],
    "luis",
    "atrasado",
    (item) => item
  );
  assert.equal(visibles.length, 1);
  assert.equal(visibles[0].item, "Teléfono");
  assert.equal(resumen.pendiente, 30000);
});

test("el reporte personal filtra la deuda y no expone datos de tarjetas ni terceros", () => {
  const items = [
    { persona: "Germán", tarjeta: "Visa privada", item: "Notebook", monto: 10000, totales: 3, pagadas: 1, total: 20000 },
    { persona: "Germán", tarjeta: "Visa privada", item: "Pagado", monto: 5000, totales: 1, pagadas: 1, total: 0 },
    { persona: "Luis", tarjeta: "Mastercard privada", item: "Teléfono", monto: 8000, totales: 2, pagadas: 0, total: 16000 }
  ];
  const estadoDe = () => ({ estado: "aldia", venc: new Date(2026, 8, 25), montoAtrasado: 0 });
  const reporte = crearReportePersona(items, "Germán", estadoDe, (item) => item.monto * item.pagadas);
  const serializado = JSON.stringify(reporte);

  assert.equal(reporte.filas.length, 1);
  assert.equal(reporte.resumen.pendiente, 20000);
  assert.deepEqual(Object.keys(reporte.filas[0]).includes("tarjeta"), false);
  assert.doesNotMatch(serializado, /Visa privada|Mastercard privada|Luis|Teléfono/);
});

test("el reporte general conserva personas, tarjetas y totales", () => {
  const items = [
    { persona: "Germán", tarjeta: "Visa", item: "Notebook", monto: 10000, totales: 3, pagadas: 1, total: 20000 },
    { persona: "Luis", tarjeta: "Mastercard", item: "Teléfono", monto: 8000, totales: 2, pagadas: 0, total: 16000 }
  ];
  const estadoDe = () => ({ estado: "aldia", venc: null, montoAtrasado: 0 });
  const reporte = crearReporteGeneral(items, estadoDe, (item) => item.monto * item.pagadas);

  assert.equal(reporte.filas.length, 2);
  assert.equal(reporte.resumen.pendiente, 36000);
  assert.equal(reporte.filas[0].tarjeta, "Visa");
  assert.equal(reporte.filas[1].persona, "Luis");
});
