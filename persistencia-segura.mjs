// Control optimista para el documento legado. No cambia el modelo de arrays.
// Las reglas deben rechazar clientes antiguos que no incrementen revisión.
const MAX_DEPTH = 12;
const ROOT_FIELDS = ["items", "tarjetas", "personas", "tarjetaActiva", "saldos", "historial"];
const ARRAY_FIELDS = ["items", "tarjetas", "personas", "historial"];

export class ConflictoGuardado extends Error {
  constructor() {
    super("Los datos cambiaron en otro dispositivo. El borrador no se ha guardado.");
    this.name = "ConflictoGuardado";
    this.code = "conflicto_guardado";
  }
}

function isObjeto(valor) {
  return valor !== null && typeof valor === "object" && !Array.isArray(valor);
}

function validarSaldo(valor) {
  // Los pagos históricos admiten decimales; conservarlos sin redondear.
  // Los aportes nuevos y planes explícitos exigen enteros en su entrada.
  if (typeof valor !== "number" || !Number.isFinite(valor) || valor < 0 || valor > Number.MAX_SAFE_INTEGER) {
    throw new TypeError("El saldo debe ser numérico, no negativo y dentro del límite seguro.");
  }
  return valor;
}

export function saldoDe(saldos, persona) {
  if (!isObjeto(saldos) || typeof persona !== "string") throw new TypeError("Saldo inválido.");
  return Object.hasOwn(saldos, persona) ? validarSaldo(saldos[persona]) : 0;
}

/** Calcula sin mutar: un aporte inválido o desbordamiento no altera el saldo. */
export function sumarSaldo(saldos, persona, aporte) {
  const saldo = saldoDe(saldos, persona);
  validarSaldo(aporte);
  if (aporte > Number.MAX_SAFE_INTEGER - saldo) throw new RangeError("El saldo excede el límite seguro.");
  return validarSaldo(saldo + aporte);
}

function valorCanonico(valor, profundidad = 0) {
  if (profundidad > MAX_DEPTH) throw new TypeError("Datos demasiado anidados.");
  if (valor === null || typeof valor === "string" || typeof valor === "boolean") return valor;
  if (typeof valor === "number" && Number.isFinite(valor)) return valor;
  if (Array.isArray(valor)) return Array.from(valor, (dato) => valorCanonico(dato, profundidad + 1));
  if (!isObjeto(valor) || Object.getPrototypeOf(valor) !== Object.prototype) {
    throw new TypeError("Los datos contienen un valor no compatible.");
  }
  return Object.fromEntries(Object.keys(valor).sort().map((clave) => [
    clave, valorCanonico(valor[clave], profundidad + 1)
  ]));
}

function revision(datos) {
  const valor = datos?.revision ?? 0;
  if (!Number.isSafeInteger(valor) || valor < 0) throw new TypeError("Revisión del documento inválida.");
  return valor;
}

function seleccionarCampos(datos) {
  return Object.fromEntries(ROOT_FIELDS.filter((campo) => Object.hasOwn(datos, campo))
    .map((campo) => [campo, datos[campo]]));
}

function huella(datos) {
  return JSON.stringify(valorCanonico(seleccionarCampos(datos)));
}

/**
 * Captura la base realmente leída, antes de normalizar los objetos para UI.
 * Además de revisión se compara contenido: detecta escritores antiguos que
 * cambiaron arrays sin actualizar revisión antes de nuestro siguiente save.
 * No puede impedir que esos clientes sobrescriban después: eso exige reglas.
 */
export function baseDocumento(datos) {
  if (datos !== null && !isObjeto(datos)) throw new TypeError("Documento inválido.");
  return {
    hasDocumento: datos !== null,
    revision: revision(datos),
    huella: datos === null ? null : huella(datos)
  };
}

/**
 * Valida el contenedor de la app. El dominio de cada compra se valida en
 * su servicio correspondiente; aquí se preservan registros históricos.
 */
export function validarDocumento(datos) {
  if (!isObjeto(datos)) throw new TypeError("Documento de cuotas inválido.");
  if (Object.keys(datos).some((campo) => !ROOT_FIELDS.includes(campo))) {
    throw new TypeError("Campos de documento no permitidos.");
  }
  for (const campo of ARRAY_FIELDS) {
    if (!Array.isArray(datos[campo])) throw new TypeError("Las listas de cuotas no son válidas.");
  }
  if (typeof datos.tarjetaActiva !== "string" || !isObjeto(datos.saldos)) {
    throw new TypeError("Selección o saldos inválidos.");
  }
  Object.values(datos.saldos).forEach(validarSaldo);
  if (datos.personas.some((p) => typeof p !== "string") ||
      datos.tarjetas.some((t) => typeof t !== "string") ||
      datos.items.some((item) => !isObjeto(item)) ||
      datos.historial.some((evento) => !isObjeto(evento))) {
    throw new TypeError("Contenido de listas inválido.");
  }
  return valorCanonico(datos);
}

function exigirBase(base) {
  if (!isObjeto(base) || typeof base.hasDocumento !== "boolean" ||
      !Number.isSafeInteger(base.revision) || base.revision < 0 ||
      (base.hasDocumento && typeof base.huella !== "string")) {
    throw new TypeError("No se ha leído una base válida para guardar.");
  }
}

function hasMismaBase(actual, esperada) {
  return actual.hasDocumento === esperada.hasDocumento &&
    actual.revision === esperada.revision && actual.huella === esperada.huella;
}

/**
 * El SDK se inyecta para poder probar conflictos sin conectar producción.
 * En la PWA se utiliza runTransaction real de Firebase.
 *
 * No hay efectos de UI ni mutación de memoria dentro del callback: Firestore
 * puede repetirlo. Cada intento lee de nuevo el documento y compara con la
 * base cargada por el cliente. No se rebasa una lista obsoleta a una revisión
 * nueva, porque borraría cambios que el titular no ha visto.
 *
 * Falla sin conexión. El llamador conserva el borrador en memoria y ofrece
 * exportarlo/reintentar, sin presentar una confirmación prematura.
 */
export async function guardarConRevision(sdk, referencia, base, datos) {
  if (!isObjeto(sdk) || typeof sdk.runTransaction !== "function" || !sdk.db || !referencia) {
    throw new TypeError("Adaptador de persistencia inválido.");
  }
  exigirBase(base);
  const copia = validarDocumento(datos);
  try { return await sdk.runTransaction(sdk.db, async (transaction) => {
    const snapshot = await transaction.get(referencia);
    const remoto = snapshot.exists() ? snapshot.data() : null;
    const actual = baseDocumento(remoto);
    if (!hasMismaBase(actual, base)) throw new ConflictoGuardado();
    const nuevaRevision = actual.revision + 1;
    if (!Number.isSafeInteger(nuevaRevision)) throw new RangeError("No se puede incrementar la revisión.");
    const escritura = { ...copia, revision: nuevaRevision };
    transaction.set(referencia, escritura, { merge: true });
    return baseDocumento(escritura);
  }); } catch (error) {
    if (error.code !== "permission-denied") throw error;
    // Las reglas pueden rechazar una revisión vieja antes de que Firestore
    // reintente el callback. Releer sin escribir distingue ese conflicto de
    // una denegación real; nunca rebasar ni volver a enviar el borrador.
    return sdk.runTransaction(sdk.db, async (transaction) => {
      const snapshot = await transaction.get(referencia);
      const actual = baseDocumento(snapshot.exists() ? snapshot.data() : null);
      if (!hasMismaBase(actual, base)) throw new ConflictoGuardado();
      throw error;
    });
  }
}

/**
 * Cola del mismo navegador. Serializa escrituras manteniendo la base que
 * produjo la anterior. Un fallo bloquea nuevas escrituras hasta una lectura
 * explícita. No ignorar errores y continuar con una base ya conflictiva.
 */
export function crearColaGuardado(guardar) {
  if (typeof guardar !== "function") throw new TypeError("Operación de guardado inválida.");
  let base = null;
  let generacion = 0;
  let hasBloqueo = false;
  let ultima = Promise.resolve();

  function cargar(datos) {
    base = baseDocumento(datos);
    generacion++;
    hasBloqueo = false;
    ultima = Promise.resolve();
  }

  function encolar(datos) {
    const copia = validarDocumento(datos);
    const generacionActual = generacion;
    const resultado = ultima.then(async () => {
      if (hasBloqueo || !base || generacion !== generacionActual) {
        throw new Error("Recarga los datos antes de volver a guardar.");
      }
      const siguiente = await guardar(base, copia);
      if (generacion !== generacionActual) throw new Error("La sesión cambió durante el guardado.");
      base = siguiente;
    });
    ultima = resultado.catch(() => {
      // El error original se entrega al llamador; la cola registra el bloqueo.
      if (generacion === generacionActual) hasBloqueo = true;
    });
    return resultado;
  }

  function invalidar() {
    generacion++;
    hasBloqueo = true;
    base = null;
  }

  function ejecutar(operacion) {
    const generacionActual = generacion;
    const resultado = ultima.then(async () => {
      if (hasBloqueo || !base || generacion !== generacionActual) {
        throw new Error("Recarga los datos antes de continuar.");
      }
      const salida = await operacion(structuredClone(base));
      if (generacion !== generacionActual) throw new Error("La sesión cambió durante la operación.");
      if (salida.documento) base = baseDocumento(salida.documento);
      return salida;
    });
    ultima = resultado.catch(() => {
      if (generacion === generacionActual) hasBloqueo = true;
    });
    return resultado;
  }

  function reintentar(datos) {
    // Conserva la misma base; nunca convierte un borrador viejo en escritura
    // sobre una revisión nueva. Si el servidor cambió, volverá a dar conflicto.
    hasBloqueo = false;
    return encolar(datos);
  }

  return { cargar, encolar, invalidar, reintentar, ejecutar };
}

// Requisitos de activación:
// - Auditar las reglas actuales antes de publicar una sustitución.
// - Exigir revision == revision_anterior + 1 en todos los escritores.
// - Rechazar escritores legados; una renovación de caché no los invalida.
// - Probar dos clientes, creación concurrente, transacción repetida y fallo.
// - Conservar el borrador cuando guardar devuelve un conflicto.
// - Confirmar pendientes con la misma revisión y la misma transacción.
// - No almacenar borradores financieros automáticamente en disco compartido.
// - No compartir una cola entre cuentas ni continuar una cola al cerrar sesión.
