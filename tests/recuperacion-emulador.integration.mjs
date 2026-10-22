import { beforeEach, afterEach, test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createConnection, createServer } from "node:net";
import { initializeTestEnvironment } from "@firebase/rules-unit-testing";
import {
  collection, disableNetwork, doc, enableNetwork, getDoc, getDocs, limit,
  onSnapshot, query, runTransaction, serverTimestamp, setDoc, where
} from "firebase/firestore";
import { crearPendiente } from "../compras-pendientes.mjs";
import { pendienteDesdeDocumento, resolverCompraRemota } from "../confirmacion-compras.mjs";
import { crearPlanCuotas } from "../planes-cuotas.mjs";
import { baseDocumento, crearColaGuardado, guardarConRevision } from "../persistencia-segura.mjs";
import { crearSuscripcionPendientes, escucharPendientes } from "../repositorio-pendientes.mjs";

const PROJECT_ID = "demo-cuotas-local";
const OWNER = "titular_offline_ficticio";
const OTHER = "otra_cuenta_ficticia";
const EVENT = "evento_offline_ficticio_001";
const NEXT_EVENT = "evento_offline_ficticio_002";
const RECEIVED_AT = 1792627200000;
const WAIT_TIMEOUT_MS = 10000;
const TEST_TIMEOUT_MS = 30000;
const SINGLE_ATTEMPT = 1;
let entorno;

function datos(items = []) {
  return { items, personas: ["A", "B"], tarjetas: ["Ejemplo"], tarjetaActiva: "Ejemplo",
    saldos: {}, historial: [], revision: 1 };
}

function usuario(db, uid = OWNER) { return doc(db, "users", uid); }
function evento(db, uid = OWNER, eventId = EVENT) {
  return doc(db, "users", uid, "comprasPendientes", eventId);
}
function dbDe(uid = OWNER) { return entorno.authenticatedContext(uid).firestore(); }

function pendiente(eventId = EVENT) {
  return { ...crearPendiente({ eventId, recibidaEn: RECEIVED_AT, parserVersion: "fixture-v1",
    montoOriginal: 1000, comercio: "Comercio ficticio", tarjetaUltimos4: "0000" }), creadaEn: serverTimestamp() };
}

function revisionCompartida() {
  return { item: "Compra ficticia", fechaCompra: "2026-10-22", tarjeta: "Ejemplo",
    planCuotas: crearPlanCuotas({ modalidad: "sin_interes", montoOriginal: 1000, numeroCuotas: 3 }),
    asignaciones: [{ persona: "A", monto: 700 }, { persona: "B", monto: 300 }] };
}

async function preparar() {
  const db = dbDe();
  const original = datos();
  await setDoc(usuario(db), original);
  await setDoc(evento(db), pendiente());
  const snapshot = await getDoc(evento(db));
  return { db, original, base: baseDocumento(original),
    esperado: pendienteDesdeDocumento(snapshot.id, snapshot.data()), revision: revisionCompartida() };
}

function resolver(config, transaccion = runTransaction) {
  return resolverCompraRemota({ db: config.db, doc, runTransaction: transaccion, serverTimestamp },
    { ...config, uid: OWNER, accion: "confirmar" });
}

function transaccionUnIntento(db, operacion) {
  // SDK real: evitar esperar los reintentos exponenciales en el caso sin red.
  return runTransaction(db, operacion, { maxAttempts: SINGLE_ATTEMPT });
}

async function crearTransporteInterrumpible() {
  const port = Number(process.env.FIRESTORE_EMULATOR_HOST.split(":")[1]);
  const conexiones = new Set();
  let isConectado = true;
  const servidor = createServer((entrada) => {
    if (!isConectado) { entrada.destroy(); return; }
    const salida = createConnection({ host: "127.0.0.1", port });
    for (const socket of [entrada, salida]) {
      conexiones.add(socket);
      socket.on("close", () => conexiones.delete(socket));
    }
    entrada.on("error", () => salida.destroy());
    salida.on("error", () => entrada.destroy());
    entrada.on("close", () => salida.destroy());
    salida.on("close", () => entrada.destroy());
    entrada.pipe(salida).pipe(entrada);
  });
  await new Promise((resolve, reject) => {
    servidor.once("error", reject);
    servidor.listen({ host: "127.0.0.1", port: 0 }, resolve);
  });
  const cortar = () => { isConectado = false; for (const socket of conexiones) socket.destroy(); };
  return { port: servidor.address().port, cortar, restaurar: () => { isConectado = true; },
    cerrar: () => { cortar(); return new Promise((resolve) => servidor.close(resolve)); } };
}

async function crearClienteInterrumpible(t) {
  const transporte = await crearTransporteInterrumpible();
  try {
    const aislado = await initializeTestEnvironment({ projectId: PROJECT_ID,
      firestore: { host: "127.0.0.1", port: transporte.port } });
    t.after(async () => {
      try { await aislado.cleanup(); }
      finally { await transporte.cerrar(); }
    });
    return { db: aislado.authenticatedContext(OWNER).firestore(), ...transporte };
  } catch (error) {
    await transporte.cerrar();
    throw error;
  }
}

function crearMonitor(t, dbInicial, uidInicial = OWNER) {
  const vistas = [];
  const esperas = new Set();
  let db = dbInicial;
  const suscripcion = crearSuscripcionPendientes({
    escuchar: (uid, recibir, fallar) => escucharPendientes({
      db, collection, query, where, limit, onSnapshot
    }, uid, recibir, fallar),
    alCambiar: (vista) => { vistas.push(vista); for (const espera of [...esperas]) espera(vista); }
  });
  const esperar = (condicion) => esperarVista(vistas, esperas, condicion);
  suscripcion.iniciar(uidInicial);
  t.after(() => suscripcion.detener());
  return { vistas, esperar, cambiar: (otroDb, uid) => { db = otroDb; suscripcion.iniciar(uid); } };
}

function esperarVista(vistas, esperas, condicion) {
  const actual = vistas.at(-1);
  if (actual && condicion(actual)) return Promise.resolve(actual);
  return new Promise((resolve, reject) => {
    const recibir = (vista) => {
      if (!condicion(vista)) return;
      clearTimeout(timeout);
      esperas.delete(recibir);
      resolve(vista);
    };
    const timeout = setTimeout(() => {
      esperas.delete(recibir);
      reject(new Error("La bandeja no alcanzó el estado esperado dentro del límite."));
    }, WAIT_TIMEOUT_MS);
    esperas.add(recibir);
  });
}

async function exigirUnaConfirmacion(db) {
  const remoto = (await getDoc(usuario(db))).data();
  assert.equal(remoto.revision, 2);
  assert.equal(remoto.items.length, 2);
  assert.deepEqual(remoto.items.map((item) => item.cuotasAsignadas.reduce((a, b) => a + b)), [700, 300]);
  assert.equal(new Set(remoto.items.map((item) => item.id)).size, 2);
  assert.equal((await getDoc(evento(db))).data().estado, "confirmada");
  const recibos = await getDocs(collection(db, "users", OWNER, "comprasConfirmadas"));
  assert.equal(recibos.size, 1);
  assert.equal(recibos.docs[0].id, `auto_${EVENT}`);
}

beforeEach(async () => {
  if (!/^127\.0\.0\.1:\d+$/.test(process.env.FIRESTORE_EMULATOR_HOST || "")) {
    throw new Error("Estas pruebas requieren el emulador Firestore local; no admiten producción.");
  }
  entorno = await initializeTestEnvironment({ projectId: PROJECT_ID,
    firestore: { rules: readFileSync(new URL("../firestore.rules", import.meta.url), "utf8") } });
  await entorno.clearFirestore();
});
afterEach(async () => { await entorno?.cleanup(); });

test("bandeja: desconectar marca caché y reconectar incorpora avisos sin crear deuda", { timeout: TEST_TIMEOUT_MS }, async (t) => {
  const config = await preparar();
  const receptor = dbDe();
  const monitor = crearMonitor(t, receptor);
  await monitor.esperar((vista) => vista.hasConexion && vista.lista.length === 1);
  await disableNetwork(receptor);
  const offline = await monitor.esperar((vista) => !vista.hasConexion && vista.lista.length === 1);
  assert.equal(offline.hasError, false);
  await setDoc(evento(config.db, OWNER, NEXT_EVENT), pendiente(NEXT_EVENT));
  assert.equal(monitor.vistas.at(-1).lista.length, 1);
  await enableNetwork(receptor);
  const online = await monitor.esperar((vista) => vista.hasConexion && vista.lista.length === 2);
  assert.deepEqual(new Set(online.lista.map((aviso) => aviso.eventId)), new Set([EVENT, NEXT_EVENT]));
  assert.deepEqual((await getDoc(usuario(config.db))).data(), config.original);
  assert.equal((await getDocs(collection(config.db, "users", OWNER, "comprasConfirmadas"))).size, 0);
});

test("confirmación sin red no escribe; al reconectar el reintento crea un único grupo", { timeout: TEST_TIMEOUT_MS }, async (t) => {
  const config = await preparar();
  const transporte = await crearClienteInterrumpible(t);
  const desconectado = transporte.db;
  const monitor = crearMonitor(t, desconectado);
  await monitor.esperar((vista) => vista.hasConexion);
  await disableNetwork(desconectado);
  await monitor.esperar((vista) => !vista.hasConexion);
  transporte.cortar();
  await assert.rejects(resolver({ ...config, db: desconectado }, transaccionUnIntento),
    (error) => error.code === "unavailable");
  assert.deepEqual((await getDoc(usuario(config.db))).data(), config.original);
  assert.equal((await getDoc(evento(config.db))).data().estado, "sin_asignar");
  assert.equal((await getDocs(collection(config.db, "users", OWNER, "comprasConfirmadas"))).size, 0);
  transporte.restaurar();
  await enableNetwork(desconectado);
  await monitor.esperar((vista) => vista.hasConexion);
  assert.equal((await resolver({ ...config, db: desconectado })).hasCambio, true);
  assert.equal((await resolver({ ...config, db: desconectado })).hasCambio, false);
  await exigirUnaConfirmacion(config.db);
});

test("otro dispositivo confirma durante el corte: la bandeja se vacía y el reintento no duplica", { timeout: TEST_TIMEOUT_MS }, async (t) => {
  const config = await preparar();
  const receptor = dbDe();
  const monitor = crearMonitor(t, receptor);
  await monitor.esperar((vista) => vista.hasConexion && vista.lista.length === 1);
  await disableNetwork(receptor);
  await monitor.esperar((vista) => !vista.hasConexion && vista.lista.length === 1);
  await resolver(config);
  assert.equal(monitor.vistas.at(-1).lista[0].estado, "sin_asignar");
  await enableNetwork(receptor);
  await monitor.esperar((vista) => vista.hasConexion && vista.lista.length === 0);
  assert.equal((await resolver({ ...config, db: receptor })).hasCambio, false);
  await exigirUnaConfirmacion(config.db);
});

test("borrador offline se conserva y su base obsoleta no pisa la compra de otro dispositivo", { timeout: TEST_TIMEOUT_MS }, async (t) => {
  const config = await preparar();
  const transporte = await crearClienteInterrumpible(t);
  const desconectado = transporte.db;
  const monitor = crearMonitor(t, desconectado);
  await monitor.esperar((vista) => vista.hasConexion);
  const inicial = (await getDoc(usuario(desconectado))).data();
  const { revision, ...borrador } = datos([{ item: "Borrador ficticio", monto: 25 }]);
  const copia = structuredClone(borrador);
  const cola = crearColaGuardado((base, valor) => guardarConRevision({ db: desconectado,
    runTransaction: transaccionUnIntento }, usuario(desconectado), base, valor));
  cola.cargar(inicial);
  await disableNetwork(desconectado);
  await monitor.esperar((vista) => !vista.hasConexion);
  transporte.cortar();
  await assert.rejects(cola.encolar(borrador), (error) => error.code === "unavailable");
  await resolver(config);
  transporte.restaurar();
  await enableNetwork(desconectado);
  await monitor.esperar((vista) => vista.hasConexion);
  await assert.rejects(cola.reintentar(borrador), (error) => error.code === "conflicto_guardado");
  assert.deepEqual(borrador, copia);
  await exigirUnaConfirmacion(config.db);
  const actual = (await getDoc(usuario(desconectado))).data();
  const { revision: revisionActual, ...campos } = actual;
  cola.cargar(actual);
  await cola.encolar({ ...campos, saldos: { A: 25 } });
  const final = (await getDoc(usuario(config.db))).data();
  assert.equal(final.revision, 3);
  assert.deepEqual(final.items, actual.items);
  assert.deepEqual(final.saldos, { A: 25 });
});

test("cambiar cuenta durante el corte no muestra avisos antiguos al recuperar la conexión", { timeout: TEST_TIMEOUT_MS }, async (t) => {
  const config = await preparar();
  const receptor = dbDe();
  const otraCuenta = dbDe(OTHER);
  await setDoc(usuario(otraCuenta, OTHER), datos());
  const monitor = crearMonitor(t, receptor);
  await monitor.esperar((vista) => vista.hasConexion && vista.lista.length === 1);
  await disableNetwork(receptor);
  await monitor.esperar((vista) => !vista.hasConexion && vista.lista.length === 1);
  monitor.cambiar(otraCuenta, OTHER);
  await monitor.esperar((vista) => vista.hasConexion && vista.lista.length === 0);
  const inicioOtraCuenta = monitor.vistas.length;
  await setDoc(evento(config.db, OWNER, NEXT_EVENT), pendiente(NEXT_EVENT));
  await enableNetwork(receptor);
  // Barrera real del servidor antes de comprobar que no cambió la vista activa.
  assert.equal((await getDoc(evento(receptor, OWNER, NEXT_EVENT))).exists(), true);
  assert.ok(monitor.vistas.slice(inicioOtraCuenta).every((vista) => vista.lista.length === 0));
  assert.equal(monitor.vistas.at(-1).lista.length, 0);
  assert.deepEqual((await getDoc(usuario(otraCuenta, OTHER))).data(), datos());
});
