// Contrato puro; no detecta notificaciones ni escribe en Firebase.
export const PENDIENTE_VERSION = 1;
export const MAX_COMERCIO = 200;
const MAX_PARSER_VERSION = 40;
const ID_PATTERN = /^[a-zA-Z0-9_-]{16,128}$/;
const HASH_PATTERN = /^[a-f0-9]{64}$/;
const STATES = new Set(["sin_asignar", "confirmada", "descartada"]);
const FIELDS = new Set([
  "schemaVersion", "eventId", "estado", "origen", "moneda", "montoOriginal",
  "comercio", "fechaCompra", "horaCompra", "tarjetaUltimos4", "referenciaHash",
  "recibidaEn", "parserVersion", "compraId"
]);
const OPTIONAL_FIELDS = new Set([
  "montoOriginal", "comercio", "fechaCompra", "horaCompra",
  "tarjetaUltimos4", "referenciaHash", "compraId"
]);

function objeto(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError("Registro pendiente inválido.");
  }
}

function identificador(value) {
  if (typeof value !== "string" || !ID_PATTERN.test(value)) {
    throw new TypeError("Identificador de evento inválido.");
  }
  return value;
}

function campos(value) {
  for (const field of Object.keys(value)) {
    if (!FIELDS.has(field)) throw new TypeError("El registro contiene campos no permitidos.");
  }
  for (const field of FIELDS) {
    if (!OPTIONAL_FIELDS.has(field) && !Object.hasOwn(value, field)) {
      throw new TypeError("El registro está incompleto.");
    }
  }
}

function fecha(value) {
  if (value === null) return null;
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new TypeError("Fecha de compra inválida.");
  }
  const parsed = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) {
    throw new TypeError("Fecha de compra inexistente.");
  }
  return value;
}

function hora(value) {
  if (value === null) return null;
  if (typeof value !== "string" || !/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/.test(value)) {
    throw new TypeError("Hora de compra inválida.");
  }
  return value;
}

function monto(value) {
  if (value === null) return null;
  if (!Number.isSafeInteger(value) || value <= 0) throw new TypeError("Monto de compra inválido.");
  return value;
}

function comercio(value) {
  if (value === null) return null;
  if (typeof value !== "string" || !value.trim() || value.length > MAX_COMERCIO ||
      /[\u0000-\u001f\u007f]/.test(value)) {
    throw new TypeError("Comercio inválido.");
  }
  return value.trim();
}

function ultimos4(value) {
  if (value === null) return null;
  if (typeof value !== "string" || !/^\d{4}$/.test(value)) {
    throw new TypeError("Solo se admiten los últimos cuatro dígitos.");
  }
  return value;
}

function referencia(value) {
  if (value === null) return null;
  if (typeof value !== "string" || !HASH_PATTERN.test(value)) {
    throw new TypeError("La referencia debe estar anonimizada mediante hash.");
  }
  return value;
}

function metadatos(value) {
  if (value.schemaVersion !== PENDIENTE_VERSION || value.origen !== "automatico" || value.moneda !== "CLP") {
    throw new TypeError("Contrato de captura no compatible.");
  }
  if (!Number.isSafeInteger(value.recibidaEn) || value.recibidaEn <= 0) {
    throw new TypeError("Fecha de recepción inválida.");
  }
  if (typeof value.parserVersion !== "string" || !value.parserVersion ||
      value.parserVersion.length > MAX_PARSER_VERSION || !/^[a-zA-Z0-9._-]+$/.test(value.parserVersion)) {
    throw new TypeError("Versión del analizador inválida.");
  }
}

function estado(value) {
  if (!STATES.has(value.estado)) throw new TypeError("Estado de revisión inválido.");
  if (value.estado === "confirmada") {
    if (value.compraId !== compraIdDeEvento(value.eventId)) {
      throw new TypeError("La compra no corresponde al evento original.");
    }
    return;
  }
  if (value.compraId !== undefined && value.compraId !== null) {
    throw new TypeError("Una compra no confirmada no debe tener asignación.");
  }
}

/**
 * Valida datos externos y devuelve una copia mínima.
 * Los timestamps de servidor pertenecen al adaptador Firestore y se
 * separan antes de esta validación de dominio.
 *
 * No se acepta texto bruto, PAN, UID proporcionado por el payload ni
 * credenciales. Las reglas de Firestore deben imponer el mismo contrato:
 * la validación de un cliente no es una frontera de seguridad.
 */
export function validarPendiente(value) {
  objeto(value);
  campos(value);
  identificador(value.eventId);
  metadatos(value);
  estado(value);
  return {
    schemaVersion: PENDIENTE_VERSION,
    eventId: value.eventId,
    estado: value.estado,
    origen: "automatico",
    moneda: "CLP",
    montoOriginal: monto(value.montoOriginal ?? null),
    comercio: comercio(value.comercio ?? null),
    fechaCompra: fecha(value.fechaCompra ?? null),
    horaCompra: hora(value.horaCompra ?? null),
    tarjetaUltimos4: ultimos4(value.tarjetaUltimos4 ?? null),
    referenciaHash: referencia(value.referenciaHash ?? null),
    recibidaEn: value.recibidaEn,
    parserVersion: value.parserVersion,
    compraId: value.compraId ?? null
  };
}

/**
 * Solo se llama después de que un analizador auténtico reconozca una compra.
 * No contiene expresiones regulares para Banco Falabella ni infiere un
 * tipo de transacción a partir del importe.
 */
export function crearPendiente(datos) {
  objeto(datos);
  if ((datos.moneda !== undefined && datos.moneda !== "CLP") ||
      (datos.estado !== undefined && datos.estado !== "sin_asignar")) {
    throw new TypeError("La captura no puede cambiar moneda ni reabrir una resolución.");
  }
  const value = validarPendiente({
    ...datos,
    schemaVersion: PENDIENTE_VERSION,
    estado: "sin_asignar",
    origen: "automatico",
    moneda: "CLP",
    compraId: null
  });
  return value;
}

/**
 * Identidad estable para enlazar la confirmación al evento original.
 * No modifica los saldos ni sustituye una transacción de base de datos.
 */
export function compraIdDeEvento(eventId) {
  return `auto_${identificador(eventId)}`;
}

/**
 * Máquina de estados idempotente de dominio.
 * El adaptador debe leer el registro actual dentro de una transacción
 * online y escribir compra + resolución de manera atómica. Llamar esta
 * función sobre una copia vieja no proporciona garantías distribuidas.
 */
export function resolverPendiente(datos, accion) {
  const value = validarPendiente(datos);
  if (accion !== "confirmar" && accion !== "descartar") {
    throw new TypeError("Acción de revisión inválida.");
  }
  const destino = accion === "confirmar" ? "confirmada" : "descartada";
  if (value.estado === destino) return { pendiente: value, hasCambio: false };
  if (value.estado !== "sin_asignar") throw new Error("La compra ya fue resuelta de otra manera.");
  return {
    pendiente: {
      ...value,
      estado: destino,
      compraId: destino === "confirmada" ? compraIdDeEvento(value.eventId) : null
    },
    hasCambio: true
  };
}

// Los datos corregidos, la persona, la tarjeta y el plan financiero serán
// validados en la operación transaccional de confirmación. Una captura con
// datos incompletos puede existir; no puede convertirse en deuda incompleta.
