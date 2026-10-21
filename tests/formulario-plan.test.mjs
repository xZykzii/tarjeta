import test from "node:test";
import assert from "node:assert/strict";
import { planDesdeEntrada, descripcionPlanCuotas } from "../ui-plan-cuotas.mjs";

test("el formulario interpreta el total original y muestra cada peso del redondeo", () => {
  const plan = planDesdeEntrada({ modalidad:"sin_interes", montoOriginal:"100", numeroCuotas:"3" });
  assert.deepEqual(plan.cuotas, [34, 33, 33]);
  assert.equal(plan.totalFinal, 100);
  assert.equal(plan.interesesTotales, 0);
  assert.match(descripcionPlanCuotas(plan), /Original \$100 · total final \$100/);
});

test("cuota única, interés manual y cuotas distintas requieren importes explícitos", () => {
  const manual = planDesdeEntrada({ modalidad:"interes_manual", montoOriginal:"100", numeroCuotas:"3", valorCuota:"40" });
  assert.deepEqual(manual.cuotas, [40, 40, 40]);
  assert.equal(manual.interesesTotales, 20);
  const distinta = planDesdeEntrada({ modalidad:"personalizadas", montoOriginal:"100", numeroCuotas:"3", cuotasTexto:"50, 35\n25" });
  assert.deepEqual(distinta.cuotas, [50, 35, 25]);
  assert.equal(distinta.totalFinal, 110);
  const unica = planDesdeEntrada({ modalidad:"una_cuota", montoOriginal:"100" });
  assert.deepEqual(unica.cuotas, [100]);
  assert.equal(unica.interesesTotales, 0);
});

test("entradas ambiguas o incompletas no se convierten en un contrato truncado", () => {
  const entrada = { modalidad:"sin_interes", montoOriginal:"100", numeroCuotas:"3" };
  for (const montoOriginal of ["1.000", "1e3", "10.5", "100abc", "", "-100", "9007199254740992"]) {
    assert.throws(() => planDesdeEntrada({ ...entrada, montoOriginal }));
  }
  assert.throws(() => planDesdeEntrada({ ...entrada, numeroCuotas:"121" }));
  assert.throws(() => planDesdeEntrada({ ...entrada, modalidad:"interes_manual", valorCuota:"" }));
  assert.throws(() => planDesdeEntrada({ ...entrada, modalidad:"interes_manual", valorCuota:"30" }));
  assert.throws(() => planDesdeEntrada({ ...entrada, modalidad:"personalizadas", cuotasTexto:"50,50" }));
  assert.throws(() => planDesdeEntrada({ ...entrada, modalidad:"personalizadas", cuotasTexto:"30,30,30" }));
});
