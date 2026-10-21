import { importesDeCompra, recalcularCompra, hasPlanExplicito } from "./cuotas-item.mjs";
import { validarDocumento } from "./persistencia-segura.mjs";

export const BACKUP_VERSION = 7;
export const MAX_BACKUP_BYTES = 5 * 1024 * 1024;
const ID_PATTERN = /^[a-zA-Z0-9_-]{1,180}$/;
const ORIGENES = new Set(["manual", "automatico"]);
const EXTRA_FIELDS = ["planCuotas", "cuotasAsignadas", "compraGrupoId", "eventoOrigenId"];

function isObjeto(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function idValido(value) {
  if (typeof value !== "string" || !ID_PATTERN.test(value)) throw new TypeError("Identificador de compra inválido.");
  return value;
}

function nombre(value, porDefecto) {
  if (value === undefined || value === null || value === "") return porDefecto;
  if (typeof value !== "string" || !value.trim()) throw new TypeError("Nombre de compra inválido.");
  return value;
}

function fechaValida(value) {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new TypeError("Fecha de compra inválida.");
  }
  const fecha = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(fecha.getTime()) || fecha.toISOString().slice(0, 10) !== value) {
    throw new TypeError("Fecha de compra inexistente.");
  }
  return value;
}

function metadatosDeCompra(item, crearId) {
  const origen = item.origen ?? "manual";
  if (!ORIGENES.has(origen)) throw new TypeError("Origen de compra inválido.");
  const extras = {};
  for (const campo of EXTRA_FIELDS) {
    if (Object.hasOwn(item, campo)) extras[campo] = structuredClone(item[campo]);
  }
  if (extras.compraGrupoId !== undefined) idValido(extras.compraGrupoId);
  if (extras.eventoOrigenId !== undefined) idValido(extras.eventoOrigenId);
  return { id: idValido(item.id ?? crearId()), origen, ...extras };
}

/**
 * Lee registros antiguos con el mismo significado de monto por cuota.
 * Los identificadores nuevos se asignan sin cambiar fechas ni pagos, y se
 * conservan en el primer guardado. No realiza una migración de producción.
 */
export function normalizarCompra(item, tarjetaDefault = "Tarjeta 1", crearId = () => crypto.randomUUID()) {
  if (!isObjeto(item)) throw new TypeError("Compra inválida.");
  const meta = metadatosDeCompra(item, crearId);
  const monto = item.monto === undefined ? 0 : Number(item.monto);
  if (!Number.isFinite(monto) || monto < 0) throw new TypeError("Monto de compra inválido.");
  const totales = Number(item.totales) || 1;
  const pagadas = Number(item.pagadas) || 0;
  const salida = {
    persona: nombre(item.persona, "Persona 1"),
    tarjeta: nombre(item.tarjeta, tarjetaDefault),
    item: nombre(item.item, "-"),
    monto,
    totales: Math.max(1, totales),
    pagadas: Math.max(0, Math.min(totales, pagadas)),
    abonado: Number(item.abonado) || 0,
    pagoUnico: Boolean(item.pagoUnico),
    fechaCompra: hasPlanExplicito(item) ? fechaValida(item.fechaCompra) : fechaDeCompraValida(item.fechaCompra),
    completedAt: typeof item.completedAt === "number" && Number.isFinite(item.completedAt) ? item.completedAt : null,
    ...meta
  };
  if (hasPlanExplicito(salida)) normalizarPlan(salida, item, pagadas);
  return recalcularCompra(salida);
}

function normalizarPlan(salida, item, pagadas) {
  const importes = importesDeCompra(salida);
  if (item.totales !== undefined && item.totales !== importes.length) {
    throw new TypeError("El número de cuotas no coincide con el plan.");
  }
  salida.totales = importes.length;
  if (!Number.isInteger(pagadas) || pagadas < 0 || pagadas > salida.totales) {
    throw new TypeError("Pagos fuera del plan.");
  }
  salida.pagadas = pagadas;
  salida.pagoUnico = importes.length === 1;
  salida.monto = importes.find((importe) => importe > 0) || 0;
  salida.abonado = Number(item.abonado ?? 0);
  const proxima = importes.slice(pagadas).find((importe) => importe > 0) || 0;
  if (!Number.isSafeInteger(salida.abonado) || salida.abonado < 0 ||
      (proxima ? salida.abonado >= proxima : salida.abonado !== 0)) {
    throw new TypeError("Abono fuera del plan.");
  }
}

export function normalizarCompras(items, tarjetaDefault, crearId) {
  if (!Array.isArray(items)) throw new TypeError("Lista de compras inválida.");
  const compras = Array.from(items, (item) => normalizarCompra(item, tarjetaDefault, crearId));
  if (new Set(compras.map((item) => item.id)).size !== compras.length) {
    throw new TypeError("El archivo repite un identificador de compra.");
  }
  return compras;
}

/** Solo los campos persistidos; nunca guardar total/factor derivados. */
export function serializarCompra(item) {
  const meta = metadatosDeCompra(item, () => { throw new TypeError("Compra sin identificador estable."); });
  importesDeCompra(item);
  return {
    persona: item.persona, tarjeta: item.tarjeta, item: item.item,
    monto: item.monto, pagadas: item.pagadas, totales: item.totales,
    abonado: item.abonado || 0,
    pagoUnico: item.pagoUnico || false,
    fechaCompra: item.fechaCompra || null,
    completedAt: item.completedAt || null,
    ...meta
  };
}

export function crearBackup(datos) {
  const copia = validarDocumento(datos);
  copia.items = copia.items.map(serializarCompra);
  return { version: BACKUP_VERSION, ...copia };
}

/**
 * Importación v6/anteriores y v7. Se valida todo antes de solicitar confirmar
 * reemplazo o modificar el estado de la app. Una versión futura se rechaza
 * para no eliminar silenciosamente campos que este cliente no comprende.
 */
export function leerBackup(datos, crearId) {
  if (!Array.isArray(datos) && !isObjeto(datos)) throw new TypeError("Backup inválido.");
  if (!Array.isArray(datos) && datos.version !== undefined &&
      (!Number.isInteger(datos.version) || datos.version < 1 || datos.version > BACKUP_VERSION)) {
    throw new TypeError("Versión de backup no compatible.");
  }
  const entrada = Array.isArray(datos) ? { items: datos } : datos;
  const tarjetas = entrada.tarjetas ?? ["Tarjeta 1"];
  const personas = entrada.personas ?? ["Persona 1"];
  const contenedor = validarDocumento({
    items: entrada.items,
    tarjetas,
    personas,
    tarjetaActiva: entrada.tarjetaActiva ?? tarjetas[0] ?? "",
    saldos: entrada.saldos ?? {},
    historial: entrada.historial ?? []
  });
  if (!contenedor.tarjetas.length || !contenedor.personas.length) {
    throw new TypeError("El backup requiere personas y tarjetas.");
  }
  contenedor.items = normalizarCompras(contenedor.items, contenedor.tarjetas[0], crearId);
  if (!contenedor.tarjetas.includes(contenedor.tarjetaActiva)) {
    contenedor.tarjetaActiva = contenedor.tarjetas[0];
  }
  return contenedor;
}

export function fechaDeCompraValida(value) {
  try { return fechaValida(typeof value === "string" ? value.trim() : value); }
  catch (error) {
    // Los registros históricos conservan el tratamiento de fecha desconocida.
    // Un plan explícito usa fechaValida y rechaza fechas imposibles.
    if (error instanceof TypeError) return null;
    throw error;
  }
}

// El número de versión del backup no determina el origen. Un registro
// histórico sin origen se interpreta como manual; un registro automático
// conserva su evento y grupo. Restaurar no confirma pendientes de Firestore.
// La revisión del documento no se exporta: restaurar es un guardado nuevo
// contra la revisión actual de la cuenta, nunca contra una revisión del archivo.
