import { before, beforeEach, after, test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { initializeTestEnvironment, assertFails, assertSucceeds } from "@firebase/rules-unit-testing";
import { doc, getDoc, setDoc, updateDoc, deleteDoc, runTransaction, serverTimestamp } from "firebase/firestore";
import { baseDocumento, guardarConRevision } from "../persistencia-segura.mjs";
import { crearPendiente } from "../compras-pendientes.mjs";
import { resolverCompraRemota } from "../confirmacion-compras.mjs";
import { crearPlanCuotas } from "../planes-cuotas.mjs";

const PROJECT_ID = "demo-cuotas-local";
const OWNER = "usuario_prueba";
const OTHER = "otro_usuario_prueba";
const EVENT = "evento_de_prueba_0001";
const RECEIVED_AT = 1792540800000;
let entorno;

function datos(items = []) {
  return { items, personas: ["A"], tarjetas: ["Ejemplo"], tarjetaActiva: "Ejemplo", saldos: {}, historial: [] };
}

function pendiente(cambios = {}) {
  return {
    ...crearPendiente({ eventId: EVENT, recibidaEn: RECEIVED_AT, parserVersion: "fixture-v1" }),
    creadaEn: serverTimestamp(),
    ...cambios
  };
}

function dbDe(uid) { return entorno.authenticatedContext(uid).firestore(); }
function usuario(db, uid = OWNER) { return doc(db, "users", uid); }
function evento(db, uid = OWNER, id = EVENT) { return doc(db, "users", uid, "comprasPendientes", id); }

async function sembrar(valor = datos()) {
  await entorno.withSecurityRulesDisabled(async (contexto) => {
    await setDoc(usuario(contexto.firestore()), valor);
  });
}

before(async () => {
  if (!process.env.FIRESTORE_EMULATOR_HOST?.startsWith("127.0.0.1:")) {
    throw new Error("Ejecutar únicamente mediante npm run test:reglas en emulador local.");
  }
  entorno = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: { rules: readFileSync(new URL("../firestore.rules", import.meta.url), "utf8") }
  });
});
beforeEach(async () => { await entorno.clearFirestore(); });
after(async () => { await entorno?.cleanup(); });

test("datos legados se leen y su primer guardado incorpora revisión sin migración destructiva", async () => {
  const original = datos([{ item: "Compra histórica", monto: 1000 }]);
  await sembrar(original);
  const db = dbDe(OWNER);
  const base = baseDocumento((await getDoc(usuario(db))).data());
  const guardada = await guardarConRevision({ db, runTransaction }, usuario(db), base, original);
  assert.equal(guardada.revision, 1);
  assert.deepEqual((await getDoc(usuario(db))).data().items, original.items);
});

test("dos clientes reales concurrentes conservan una escritura y rechazan la base obsoleta", async () => {
  await sembrar(datos());
  const dbA = dbDe(OWNER);
  const dbB = dbDe(OWNER);
  const base = baseDocumento(datos());
  const operaciones = [
    guardarConRevision({ db: dbA, runTransaction }, usuario(dbA), base, datos([{ item: "A" }])),
    guardarConRevision({ db: dbB, runTransaction }, usuario(dbB), base, datos([{ item: "B" }]))
  ];
  const resultados = await Promise.allSettled(operaciones);
  assert.equal(resultados.filter((resultado) => resultado.status === "fulfilled").length, 1);
  const rechazado = resultados.find((resultado) => resultado.status === "rejected");
  assert.equal(rechazado.reason.code, "conflicto_guardado");
  const remoto = (await getDoc(usuario(dbA))).data();
  assert.equal(remoto.revision, 1);
  assert.equal(remoto.items.length, 1);
});

test("las reglas rechazan un escritor antiguo posterior al cliente nuevo", async () => {
  await sembrar({ ...datos(), revision: 1 });
  const db = dbDe(OWNER);
  await assertFails(setDoc(usuario(db), datos([{ item: "Escritura vieja" }]), { merge: true }));
  await assertFails(updateDoc(usuario(db), { revision: 3 }));
  await assertFails(updateDoc(usuario(db), { revision: 0 }));
  assert.equal((await getDoc(usuario(db))).data().revision, 1);
});

test("creación válida requiere revisión inicial y tipo correcto, no borra el documento", async () => {
  const db = dbDe(OWNER);
  await assertFails(setDoc(usuario(db), datos()));
  await assertFails(setDoc(usuario(db), { ...datos(), items: "inválido", revision: 1 }));
  await assertSucceeds(setDoc(usuario(db), { ...datos(), revision: 1 }));
  await assertFails(deleteDoc(usuario(db)));
});

test("aislamiento de UID: invitado y otro titular no leen ni modifican datos", async () => {
  await sembrar({ ...datos(), revision: 1 });
  const db = dbDe(OTHER);
  const invitado = entorno.unauthenticatedContext().firestore();
  await assertFails(getDoc(usuario(db)));
  await assertFails(setDoc(usuario(db), { ...datos(), revision: 2 }));
  await assertFails(getDoc(usuario(invitado)));
  await assertFails(setDoc(usuario(invitado), { ...datos(), revision: 2 }));
});

test("sesión Firebase anónima no puede crear datos aunque use su propio UID", async () => {
  const anonimo = entorno.authenticatedContext(OWNER, { firebase: { sign_in_provider: "anonymous" } }).firestore();
  await assertFails(setDoc(usuario(anonimo), { ...datos(), revision: 1 }));
});

test("campos legados desconocidos se conservan pero no se pueden sobreescribir", async () => {
  await sembrar({ ...datos(), revision: 1, campoLegado: "conservar" });
  const db = dbDe(OWNER);
  const inicial = (await getDoc(usuario(db))).data();
  await guardarConRevision({ db, runTransaction }, usuario(db), baseDocumento(inicial), datos());
  assert.equal((await getDoc(usuario(db))).data().campoLegado, "conservar");
  await assertFails(updateDoc(usuario(db), { revision: 3, campoLegado: "cambiado" }));
});

test("captura mínima pertenece al UID y no admite texto bruto, PAN ni confirmación anticipada", async () => {
  const db = dbDe(OWNER);
  await assertSucceeds(setDoc(evento(db), pendiente()));
  await assertSucceeds(getDoc(evento(db)));
  await assertFails(getDoc(evento(dbDe(OTHER))));
  await assertFails(updateDoc(evento(db), { estado: "confirmada", compraId: "inventada" }));
  await assertFails(deleteDoc(evento(db)));
  await assertFails(setDoc(evento(db, OWNER, "evento_de_prueba_0002"), pendiente({ eventId: "evento_de_prueba_0002", textoBruto: "no guardar" })));
  await assertFails(setDoc(evento(db, OWNER, "evento_de_prueba_0003"), pendiente({ eventId: "evento_de_prueba_0003", tarjetaUltimos4: "1234567890123456" })));
});

test("captura rechaza moneda, importe y fecha de servidor falsificados", async () => {
  const db = dbDe(OWNER);
  await assertFails(setDoc(evento(db), pendiente({ moneda: "USD" })));
  await assertFails(setDoc(evento(db), pendiente({ montoOriginal: 1.5 })));
  await assertFails(setDoc(evento(db), pendiente({ montoOriginal: -1 })));
  await assertFails(setDoc(evento(db), pendiente({ creadaEn: RECEIVED_AT })));
  await assertFails(setDoc(evento(db), pendiente({ recibidaEn: -1 })));
});

function revisionCompartida() {
  return { item: "Compra compartida", fechaCompra: "2026-10-21", tarjeta: "Ejemplo",
    planCuotas: crearPlanCuotas({ modalidad: "sin_interes", montoOriginal: 1000, numeroCuotas: 3 }),
    asignaciones: [{ persona: "A", monto: 700 }, { persona: "B", monto: 300 }] };
}

async function prepararEvento() {
  const original = { ...datos(), personas: ["A", "B"], revision: 1 };
  await sembrar(original);
  const db = dbDe(OWNER);
  await setDoc(evento(db), pendiente({ montoOriginal: 1000, comercio: "Ejemplo" }));
  const { creadaEn, ...esperado } = (await getDoc(evento(db))).data();
  return { db, esperado, base: baseDocumento(original), revision: revisionCompartida() };
}

function resolver(config, accion = "confirmar") {
  return resolverCompraRemota({ db: config.db, doc, runTransaction, serverTimestamp },
    { ...config, uid: OWNER, accion });
}

test("confirmar grupo 700/300 crea recibo y resolución atómicos; repetir no duplica", async () => {
  const config = await prepararEvento();
  const primera = await resolver(config);
  assert.equal(primera.hasCambio, true);
  const segunda = await resolver(config);
  assert.equal(segunda.hasCambio, false);
  const remoto = (await getDoc(usuario(config.db))).data();
  assert.equal(remoto.revision, 2);
  assert.equal(remoto.items.length, 2);
  assert.deepEqual(remoto.items.map((item) => item.cuotasAsignadas.reduce((a, b) => a + b)), [700, 300]);
  const resuelto = (await getDoc(evento(config.db))).data();
  assert.equal(resuelto.estado, "confirmada");
  assert.equal(resuelto.comercio, "Ejemplo");
  const ref = doc(config.db, "users", OWNER, "comprasConfirmadas", `auto_${EVENT}`);
  await assertSucceeds(getDoc(ref));
  await assertFails(updateDoc(ref, { item: "cambiar recibo" }));
  await assertFails(deleteDoc(ref));
  await assertFails(getDoc(doc(dbDe(OTHER), "users", OWNER, "comprasConfirmadas", `auto_${EVENT}`)));
});

test("descartar es idempotente, no cambia arrays ni permite reabrir o confirmar", async () => {
  const config = await prepararEvento();
  await resolver(config, "descartar");
  assert.equal((await resolver(config, "descartar")).hasCambio, false);
  await assert.rejects(resolver(config));
  const remoto = (await getDoc(usuario(config.db))).data();
  assert.equal(remoto.revision, 1);
  assert.equal(remoto.items.length, 0);
  await assertFails(updateDoc(evento(config.db), { estado: "sin_asignar" }));
});

test("la base obsoleta y las personas eliminadas no crean deuda", async () => {
  const config = await prepararEvento();
  await updateDoc(usuario(config.db), { revision: 2, personas: ["A"] });
  await assert.rejects(resolver(config), (error) => error.code === "conflicto_guardado");
  const base = baseDocumento((await getDoc(usuario(config.db))).data());
  await assert.rejects(resolver({ ...config, base }), /persona/);
  assert.equal((await getDoc(evento(config.db))).data().estado, "sin_asignar");
});

test("dos confirmaciones concurrentes solo incorporan un grupo", async () => {
  const config = await prepararEvento();
  const resultados = await Promise.allSettled([resolver(config), resolver({ ...config, db: dbDe(OWNER) })]);
  assert.ok(resultados.some((resultado) => resultado.status === "fulfilled"));
  assert.equal((await getDoc(usuario(config.db))).data().items.length, 2);
  assert.equal((await resolver(config)).hasCambio, false);
});

test("las reglas rechazan un recibo aislado o una confirmación sin añadir participaciones", async () => {
  const config = await prepararEvento();
  const ref = doc(config.db, "users", OWNER, "comprasConfirmadas", `auto_${EVENT}`);
  const recibo = { schemaVersion: 1, compraId: `auto_${EVENT}`, eventId: EVENT, origen: "automatico",
    ...revisionCompartida(), items: [{ persona: "A" }], creadaEn: serverTimestamp() };
  await assertFails(setDoc(ref, recibo));
  await assertFails(runTransaction(config.db, async (tx) => {
    tx.set(ref, recibo);
    tx.update(evento(config.db), { estado: "confirmada", compraId: `auto_${EVENT}`, resueltaEn: serverTimestamp() });
  }));
  assert.equal((await getDoc(evento(config.db))).data().estado, "sin_asignar");
});

test("confirmar conserva íntegros los registros legados sin ID y campos desconocidos", async () => {
  const config = await prepararEvento();
  const legado = { persona: "A", tarjeta: "Ejemplo", item: "Histórico", monto: 10.5, totales: 2, pagadas: 1 };
  const anterior = { ...datos([legado]), personas: ["A", "B"], revision: 1, campoLegado: "preservar" };
  await sembrar(anterior);
  await resolver({ ...config, base: baseDocumento(anterior) });
  const remoto = (await getDoc(usuario(config.db))).data();
  assert.deepEqual(remoto.items[0], legado);
  assert.equal(remoto.items.length, 3);
  assert.equal(remoto.campoLegado, "preservar");
});

test("confirmar y descartar a la vez solo dejan una resolución coherente", async () => {
  const config = await prepararEvento();
  await Promise.allSettled([resolver(config), resolver({ ...config, db: dbDe(OWNER) }, "descartar")]);
  const resuelto = (await getDoc(evento(config.db))).data();
  const remoto = (await getDoc(usuario(config.db))).data();
  const recibo = await getDoc(doc(config.db, "users", OWNER, "comprasConfirmadas", `auto_${EVENT}`));
  assert.ok(["confirmada", "descartada"].includes(resuelto.estado));
  assert.equal(recibo.exists(), resuelto.estado === "confirmada");
  assert.equal(remoto.items.length, resuelto.estado === "confirmada" ? 2 : 0);
});
