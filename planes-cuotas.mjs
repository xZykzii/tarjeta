// Dominio puro. Todavía no conectado a la PWA ni a Firebase.
// Los importes siempre son pesos chilenos enteros seguros.
export const MAX_CUOTAS = 120;
export const MODALIDADES = Object.freeze([
  "una_cuota", "sin_interes", "interes_manual", "personalizadas"
]);
const MIN_CUOTAS = 1;
const PLAN_VERSION = 1;
const MIN_MONTO = 1;

function exigirObjeto(valor) {
  if (!valor || typeof valor !== "object" || Array.isArray(valor)) {
    throw new TypeError("Configuración de cuotas inválida.");
  }
}

function entero(valor, nombre, minimo = MIN_MONTO) {
  if (!Number.isSafeInteger(valor) || valor < minimo) {
    throw new TypeError(`${nombre} debe ser un entero válido.`);
  }
  return valor;
}

function cantidad(valor) {
  entero(valor, "Número de cuotas", MIN_CUOTAS);
  if (valor > MAX_CUOTAS) throw new RangeError("Demasiadas cuotas.");
  return valor;
}

function sumaSegura(valores) {
  return valores.reduce((suma, valor) => {
    const siguiente = suma + valor;
    entero(siguiente, "Total");
    return siguiente;
  }, 0);
}

function dividirExacto(montoOriginal, numeroCuotas) {
  if (numeroCuotas > montoOriginal) {
    throw new RangeError("Cada cuota debe ser de al menos un peso.");
  }
  const base = Number(BigInt(montoOriginal) / BigInt(numeroCuotas));
  const resto = Number(BigInt(montoOriginal) % BigInt(numeroCuotas));
  return Array.from({ length: numeroCuotas }, (_, indice) => (
    base + (indice < resto ? MIN_MONTO : 0)
  ));
}

function cuotasManuales(config, numeroCuotas) {
  entero(config.valorCuota, "Valor de cuota");
  entero(config.valorCuota * numeroCuotas, "Total final");
  return Array(numeroCuotas).fill(config.valorCuota);
}

function cuotasPersonalizadas(config, numeroCuotas) {
  if (!Array.isArray(config.cuotas) || config.cuotas.length !== numeroCuotas) {
    throw new TypeError("La lista de cuotas no coincide con la cantidad.");
  }
  // Array.from también visita huecos de arrays dispersos y los rechaza.
  return Array.from(config.cuotas, (valor) => entero(valor, "Cuota"));
}

function resolverCuotas(config, numeroCuotas) {
  if (config.modalidad === "una_cuota") {
    if (numeroCuotas !== MIN_CUOTAS) throw new RangeError("Una compra simple tiene una cuota.");
    return [config.montoOriginal];
  }
  if (config.modalidad === "sin_interes") {
    return dividirExacto(config.montoOriginal, numeroCuotas);
  }
  if (config.modalidad === "interes_manual") return cuotasManuales(config, numeroCuotas);
  return cuotasPersonalizadas(config, numeroCuotas);
}

/**
 * Construye un contrato financiero explícito, nunca una tasa estimada.
 *
 * Sin interés, los pesos sobrantes se distribuyen al principio del plan.
 * Ejemplo: 100 pesos / 3 cuotas = [34, 33, 33].
 *
 * En interés manual, valorCuota es un importe introducido por el titular.
 * En personalizadas, cada cuota es explícita y el total debe cubrir el
 * monto original. Un descuento o devolución necesita otro flujo; no se
 * interpreta como interés negativo.
 *
 * No crea deuda, no modifica el objeto recibido y no realiza I/O.
 */
export function crearPlanCuotas(config) {
  exigirObjeto(config);
  entero(config.montoOriginal, "Monto original");
  if (!MODALIDADES.includes(config.modalidad)) throw new TypeError("Modalidad inválida.");
  const numeroCuotas = cantidad(config.numeroCuotas);
  const cuotas = resolverCuotas(config, numeroCuotas);
  const totalFinal = sumaSegura(cuotas);
  if (totalFinal < config.montoOriginal) {
    throw new RangeError("El total final no puede ser menor al original.");
  }
  return {
    version: PLAN_VERSION,
    moneda: "CLP",
    modalidad: config.modalidad,
    montoOriginal: config.montoOriginal,
    cuotas,
    totalFinal,
    interesesTotales: totalFinal - config.montoOriginal
  };
}

/** Valida un plan procedente de un archivo o de la API antes de utilizarlo. */
export function validarPlanCuotas(plan) {
  exigirObjeto(plan);
  if (plan.version !== PLAN_VERSION || plan.moneda !== "CLP") {
    throw new TypeError("Versión o moneda del plan no compatible.");
  }
  if (!Array.isArray(plan.cuotas)) throw new TypeError("Plan sin cuotas.");
  const config = {
    modalidad: plan.modalidad,
    montoOriginal: plan.montoOriginal,
    numeroCuotas: plan.cuotas.length,
    cuotas: plan.cuotas,
    valorCuota: plan.cuotas[0]
  };
  const esperado = crearPlanCuotas(config);
  const hasSameCuotas = esperado.cuotas.every((valor, indice) => valor === plan.cuotas[indice]);
  if (!hasSameCuotas || esperado.totalFinal !== plan.totalFinal ||
      esperado.interesesTotales !== plan.interesesTotales) {
    throw new TypeError("El plan no coincide con sus importes calculados.");
  }
  return esperado;
}

/**
 * Adaptador de solo lectura para el contrato histórico: monto es por cuota.
 * No convierte una compra antigua a un nuevo plan persistido.
 * Si aparece un plan explícito inválido se rechaza, sin fallback silencioso.
 */
export function planDeItem(item) {
  exigirObjeto(item);
  if (Object.hasOwn(item, "planCuotas")) return validarPlanCuotas(item.planCuotas);
  const numeroCuotas = cantidad(item.totales);
  entero(item.monto, "Monto de cuota legado");
  const total = entero(item.monto * numeroCuotas, "Total legado");
  return crearPlanCuotas({
    modalidad: "sin_interes",
    montoOriginal: total,
    numeroCuotas
  });
}

function progresoPago(plan, pagadas, abonado) {
  entero(pagadas, "Cuotas pagadas", 0);
  entero(abonado, "Abono", 0);
  if (pagadas > plan.cuotas.length) throw new RangeError("Cuotas pagadas fuera de rango.");
  const cuotaActual = plan.cuotas[pagadas] || 0;
  const isCompleto = pagadas === plan.cuotas.length;
  if ((isCompleto && abonado !== 0) || (!isCompleto && abonado >= cuotaActual)) {
    throw new RangeError("El abono debe ser menor a la cuota pendiente.");
  }
  return { cuotaActual, isCompleto };
}

/** Saldos de un plan con pagos consecutivos y un abono en la siguiente cuota. */
export function resumirPlanCuotas(input, pagadas = 0, abonado = 0) {
  const plan = validarPlanCuotas(input);
  const avance = progresoPago(plan, pagadas, abonado);
  const pagado = plan.cuotas.slice(0, pagadas).reduce((suma, cuota) => suma + cuota, 0) + abonado;
  return {
    totalFinal: plan.totalFinal,
    pagado,
    pendiente: plan.totalFinal - pagado,
    proximaCuota: avance.isCompleto ? 0 : avance.cuotaActual - abonado,
    isCompleto: avance.isCompleto
  };
}

/**
 * Suma cuotas vencidas o exigibles hasta un ordinal, descontando un abono
 * una sola vez. El calendario se mantiene fuera del dominio financiero:
 * la PWA debe resolver el ordinal con su regla de cierre y vencimiento.
 */
export function montoExigiblePlan(input, pagadas, abonado, cuotasExigibles) {
  const plan = validarPlanCuotas(input);
  progresoPago(plan, pagadas, abonado);
  entero(cuotasExigibles, "Cuotas exigibles", 0);
  if (cuotasExigibles > plan.cuotas.length) {
    throw new RangeError("Cuotas exigibles fuera del plan.");
  }
  if (cuotasExigibles <= pagadas) return 0;
  const exigible = plan.cuotas.slice(pagadas, cuotasExigibles)
    .reduce((suma, cuota) => suma + cuota, 0);
  return exigible - abonado;
}

/** Valor real de una cuota por ordinal, útil al pagar y deshacer un pago. */
export function valorCuotaPlan(input, ordinal) {
  const plan = validarPlanCuotas(input);
  entero(ordinal, "Número de cuota");
  if (ordinal > plan.cuotas.length) throw new RangeError("La cuota no existe en el plan.");
  return plan.cuotas[ordinal - 1];
}

// La integración deberá reutilizar estas funciones tanto para compras manuales
// como automáticas. No usar cuota media ni multiplicar una cuota redondeada
// por el número total cuando existe un plan explícito.
