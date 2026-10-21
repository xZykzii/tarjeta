import { validarPendiente, resolverPendiente, compraIdDeEvento } from "./compras-pendientes.mjs";
import { validarPlanCuotas } from "./planes-cuotas.mjs";
import { repartirPlanCuotas, validarPersonasReparto } from "./reparto-compras.mjs";
import { normalizarCompra, serializarCompra } from "./datos-compras.mjs";
import { baseDocumento, validarDocumento, ConflictoGuardado } from "./persistencia-segura.mjs";

const MAX_DESCRIPCION = 200;
const CAMPOS_REVISION = new Set(["item", "fechaCompra", "tarjeta", "planCuotas", "asignaciones"]);

function texto(valor, nombre) {
  if (typeof valor !== "string" || !valor.trim() || valor.length > MAX_DESCRIPCION ||
      /[\u0000-\u001f\u007f]/.test(valor)) throw new TypeError(`${nombre} inválido.`);
  return valor.trim();
}

function fecha(valor) {
  if (typeof valor !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(valor)) {
    throw new TypeError("Indica una fecha de compra válida.");
  }
  const parsed = new Date(`${valor}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== valor) {
    throw new TypeError("Fecha de compra inexistente.");
  }
  return valor;
}

export function validarRevisionCompra(entrada, datos) {
  if (!entrada || typeof entrada !== "object" || Array.isArray(entrada) ||
      Object.keys(entrada).some((campo) => !CAMPOS_REVISION.has(campo))) {
    throw new TypeError("Revisión de compra inválida.");
  }
  const planCuotas = validarPlanCuotas(entrada.planCuotas);
  const reparto = repartirPlanCuotas(planCuotas, entrada.asignaciones);
  validarPersonasReparto(reparto.participaciones, datos.personas);
  if (!datos.tarjetas.includes(entrada.tarjeta)) throw new TypeError("La tarjeta ya no existe.");
  return {
    item: texto(entrada.item, "Descripción"), fechaCompra: fecha(entrada.fechaCompra),
    tarjeta: entrada.tarjeta, planCuotas,
    asignaciones: reparto.participaciones.map(({ persona, monto }) => ({ persona, monto }))
  };
}

/** Contrato original una vez, obligaciones personales con una identidad de grupo. */
export function prepararConfirmacion(pendiente, entrada, documento) {
  const origen = validarPendiente(pendiente);
  if (origen.estado !== "sin_asignar") throw new TypeError("El aviso ya está resuelto.");
  const datos = validarDocumento(documento);
  const revision = validarRevisionCompra(entrada, datos);
  const compraId = compraIdDeEvento(origen.eventId);
  if (datos.items.some((item) => item.compraGrupoId === compraId || item.eventoOrigenId === origen.eventId)) {
    throw new TypeError("Ya existe una compra asociada a este aviso.");
  }
  const reparto = repartirPlanCuotas(revision.planCuotas, revision.asignaciones);
  const nuevos = reparto.participaciones.map((parte, indice) => serializarCompra(normalizarCompra({
    id: `${compraId}_p${indice}`, origen: "automatico", compraGrupoId: compraId,
    eventoOrigenId: origen.eventId, persona: parte.persona, tarjeta: revision.tarjeta,
    item: revision.item, fechaCompra: revision.fechaCompra, planCuotas: revision.planCuotas,
    cuotasAsignadas: parte.cuotas, totales: parte.cuotas.length, pagadas: 0, abonado: 0,
    monto: parte.cuotas.find((valor) => valor > 0), pagoUnico: parte.cuotas.length === 1
  })));
  return {
    documento: { ...datos, items: [...datos.items, ...nuevos] },
    recibo: { schemaVersion: 1, compraId, eventId: origen.eventId, origen: "automatico", ...revision, items: nuevos },
    pendiente: resolverPendiente(origen, "confirmar").pendiente
  };
}

/** Convierte únicamente timestamps reconocidos del transporte; valida lo demás. */
export function pendienteDesdeDocumento(id, datos) {
  if (!datos || typeof datos !== "object") throw new TypeError("Aviso inválido.");
  const { creadaEn, resueltaEn, ...dominio } = datos;
  for (const valor of [creadaEn, resueltaEn]) {
    if (valor !== undefined && (!valor || typeof valor.toMillis !== "function" ||
        !Number.isFinite(valor.toMillis()))) throw new TypeError("Fecha de servidor inválida.");
  }
  const pendiente = validarPendiente(dominio);
  if (pendiente.eventId !== id) throw new TypeError("La identidad del aviso no coincide.");
  return pendiente;
}

function exigirMismaBase(datos, base) {
  const actual = baseDocumento(datos);
  if (!base || actual.hasDocumento !== base.hasDocumento || actual.revision !== base.revision ||
      actual.huella !== base.huella) throw new ConflictoGuardado();
}

function exigirMismoAviso(actual, esperado) {
  if (JSON.stringify(actual) !== JSON.stringify(validarPendiente(esperado))) {
    throw new Error("El aviso cambió. Vuelve a revisarlo antes de confirmar.");
  }
}

function referencias(sdk, uid, eventId) {
  // La identidad de la cuenta viene del adaptador autenticado, nunca del payload.
  if (typeof uid !== "string" || !uid || uid.includes("/")) throw new TypeError("Sesión inválida.");
  const compraId = compraIdDeEvento(eventId);
  return {
    usuario: sdk.doc(sdk.db, "users", uid),
    pendiente: sdk.doc(sdk.db, "users", uid, "comprasPendientes", eventId),
    recibo: sdk.doc(sdk.db, "users", uid, "comprasConfirmadas", compraId)
  };
}

async function confirmarEnTransaccion(sdk, tx, refs, actual, opciones) {
  const [usuario, recibo] = await Promise.all([tx.get(refs.usuario), tx.get(refs.recibo)]);
  if (actual.estado === "confirmada") {
    if (!recibo.exists() || recibo.data().eventId !== actual.eventId) throw new Error("Resolución inconsistente.");
    return { hasCambio: false, estado: "confirmada" };
  }
  if (actual.estado !== "sin_asignar") throw new Error("El aviso ya fue descartado.");
  if (!usuario.exists() || recibo.exists()) throw new Error("Recarga los datos antes de confirmar.");
  exigirMismaBase(usuario.data(), opciones.base);
  exigirMismoAviso(actual, opciones.esperado);
  const campos = ["items", "tarjetas", "personas", "tarjetaActiva", "saldos", "historial"];
  const datos = Object.fromEntries(campos.map((campo) => [campo, usuario.data()[campo]]));
  const salida = prepararConfirmacion(actual, opciones.revision, datos);
  const revision = opciones.base.revision + 1;
  if (!Number.isSafeInteger(revision)) throw new RangeError("Revisión fuera de rango.");
  const documento = { ...salida.documento, revision };
  tx.set(refs.usuario, documento, { merge: true });
  tx.set(refs.recibo, { ...salida.recibo, creadaEn: sdk.serverTimestamp() });
  tx.update(refs.pendiente, { estado: "confirmada", compraId: salida.recibo.compraId, resueltaEn: sdk.serverTimestamp() });
  return { hasCambio: true, estado: "confirmada", documento };
}

/** Lecturas antes de escrituras; callback sin UI, apto para reintentos del SDK. */
export async function resolverCompraRemota(sdk, opciones) {
  if (!sdk || typeof sdk.runTransaction !== "function" || typeof sdk.serverTimestamp !== "function") {
    throw new TypeError("Adaptador de compras inválido.");
  }
  const esperado = validarPendiente(opciones.esperado);
  if (!["confirmar", "descartar"].includes(opciones.accion)) throw new TypeError("Acción inválida.");
  const refs = referencias(sdk, opciones.uid, esperado.eventId);
  return sdk.runTransaction(sdk.db, async (tx) => {
    const snap = await tx.get(refs.pendiente);
    if (!snap.exists()) throw new Error("El aviso ya no está disponible.");
    const actual = pendienteDesdeDocumento(snap.id, snap.data());
    if (opciones.accion === "confirmar") return confirmarEnTransaccion(sdk, tx, refs, actual, opciones);
    if (actual.estado === "descartada") return { hasCambio: false, estado: "descartada" };
    if (actual.estado !== "sin_asignar") throw new Error("El aviso ya fue confirmado.");
    exigirMismoAviso(actual, esperado);
    tx.update(refs.pendiente, { estado: "descartada", compraId: null, resueltaEn: sdk.serverTimestamp() });
    return { hasCambio: true, estado: "descartada" };
  });
}
