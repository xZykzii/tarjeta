import { validarPlanCuotas } from "./planes-cuotas.mjs";

// Límite defensivo para leer registros históricos, no un límite del banco.
export const MAX_CUOTAS_LEGADAS = 1200;

export function hasPlanExplicito(item) {
  return Object.hasOwn(item, "planCuotas");
}

function suma(importes) {
  const total = importes.reduce((valor, importe) => valor + importe, 0);
  if (!Number.isFinite(total) || total < 0) throw new TypeError("Importes inválidos.");
  return total;
}

function participacionValida(item, plan) {
  if (!Array.isArray(item.cuotasAsignadas) || item.cuotasAsignadas.length !== plan.cuotas.length ||
      typeof item.compraGrupoId !== "string" || !item.compraGrupoId) {
    throw new TypeError("Participación de compra inválida.");
  }
  const importes = Array.from(item.cuotasAsignadas, (importe, indice) => {
    if (!Number.isSafeInteger(importe) || importe < 0 || importe > plan.cuotas[indice]) {
      throw new TypeError("La participación excede el plan original.");
    }
    return importe;
  });
  if (!Number.isSafeInteger(suma(importes)) || suma(importes) <= 0) {
    throw new TypeError("La participación debe tener un importe positivo.");
  }
  return importes;
}

/**
 * Única representación de importes usada por pagos, resúmenes y reportes.
 * Los registros antiguos conservan monto por cuota, incluso sus importes
 * decimales históricos. Los planes nuevos ya exigen enteros seguros CLP.
 */
export function importesDeCompra(item) {
  if (hasPlanExplicito(item)) {
    const plan = validarPlanCuotas(item.planCuotas);
    if (Object.hasOwn(item, "cuotasAsignadas")) return participacionValida(item, plan);
    return plan.cuotas;
  }
  if (Object.hasOwn(item, "cuotasAsignadas")) throw new TypeError("Participación sin plan original.");
  const cantidad = Number(item.totales) || 1;
  const monto = Number(item.monto) || 0;
  if (!Number.isInteger(cantidad) || cantidad < 1 || cantidad > MAX_CUOTAS_LEGADAS ||
      !Number.isFinite(monto) || monto < 0) throw new TypeError("Cuotas históricas inválidas.");
  return Array(cantidad).fill(monto);
}

function pagadasDe(item, cantidad) {
  const valor = Number(item.pagadas) || 0;
  if (!Number.isInteger(valor) || valor < 0 || valor > cantidad) {
    throw new TypeError("Cuotas pagadas fuera de rango.");
  }
  return valor;
}

export function totalContratoDe(item) {
  const importes = importesDeCompra(item);
  return hasPlanExplicito(item) ? suma(importes) : (Number(item.monto) || 0) * importes.length;
}

export function proximaCuotaNumero(item) {
  const importes = importesDeCompra(item);
  const desde = pagadasDe(item, importes.length);
  for (let indice = desde; indice < importes.length; indice++) {
    if (importes[indice] > 0) return indice + 1;
  }
  return null;
}

export function ultimaCuotaPagadaNumero(item) {
  const importes = importesDeCompra(item);
  const hasta = pagadasDe(item, importes.length);
  for (let indice = hasta - 1; indice >= 0; indice--) {
    if (importes[indice] > 0) return indice + 1;
  }
  return null;
}

export function importeCuota(item, ordinal) {
  const importes = importesDeCompra(item);
  if (!Number.isInteger(ordinal) || ordinal < 1 || ordinal > importes.length) return 0;
  return importes[ordinal - 1];
}

export function abonoDeCompra(item) {
  const ordinal = proximaCuotaNumero(item);
  const cuota = ordinal ? importeCuota(item, ordinal) : 0;
  const abonado = Number(item.abonado) || 0;
  return Number.isFinite(abonado) && abonado > 0 && abonado < cuota ? abonado : 0;
}

export function pagadoDeCompra(item) {
  const importes = importesDeCompra(item);
  const pagadas = pagadasDe(item, importes.length);
  if (!hasPlanExplicito(item)) return (Number(item.monto) || 0) * pagadas + abonoDeCompra(item);
  return suma(importes.slice(0, pagadas)) + abonoDeCompra(item);
}

export function restanteCuotaDe(item) {
  const ordinal = proximaCuotaNumero(item);
  return ordinal ? importeCuota(item, ordinal) - abonoDeCompra(item) : 0;
}

export function montoExigibleHasta(item, ordinal) {
  const importes = importesDeCompra(item);
  const pagadas = pagadasDe(item, importes.length);
  if (!Number.isInteger(ordinal) || ordinal < 0 || ordinal > importes.length) {
    throw new TypeError("Cuotas exigibles fuera de rango.");
  }
  if (ordinal <= pagadas) return 0;
  if (!hasPlanExplicito(item)) {
    return Math.max(0, (ordinal - pagadas) * (Number(item.monto) || 0) - abonoDeCompra(item));
  }
  return Math.max(0, suma(importes.slice(pagadas, ordinal)) - abonoDeCompra(item));
}

export function contarCuotasPendientesHasta(item, ordinal) {
  const importes = importesDeCompra(item);
  const pagadas = pagadasDe(item, importes.length);
  return importes.slice(pagadas, ordinal).filter((importe) => importe > 0).length;
}

/**
 * Actualiza únicamente campos derivados del objeto en memoria.
 * Los ceros de una participación son períodos sin deuda; no producen un
 * pago ni descuentan saldo. Una vez agotados importes positivos, el plan
 * queda completo aunque termine en períodos de cero pesos.
 */
export function recalcularCompra(item) {
  item.pagadas = Number(item.pagadas) || 0;
  item.totales = Number(item.totales) || 1;
  item.monto = Number(item.monto) || 0;
  const importes = importesDeCompra(item);
  if (hasPlanExplicito(item)) item.totales = importes.length;
  pagadasDe(item, importes.length);
  if (!proximaCuotaNumero(item) && suma(importes) > 0) item.pagadas = importes.length;
  item.abonado = abonoDeCompra(item);
  item.factor = Math.max(0, importes.length - item.pagadas);
  item.total = hasPlanExplicito(item)
    ? Math.max(0, suma(importes) - pagadoDeCompra(item))
    : item.monto * item.factor - item.abonado;
  return item;
}

/** Operación de dominio común para pagar y deshacer, sin I/O ni historial. */
export function registrarPagoCompra(item, disponible) {
  if (!Number.isFinite(disponible) || disponible <= 0) throw new TypeError("Saldo inválido.");
  const copia = recalcularCompra(structuredClone(item));
  const ordinal = proximaCuotaNumero(copia);
  const restante = restanteCuotaDe(copia);
  if (!ordinal || restante <= 0) throw new TypeError("La compra no tiene cuotas pendientes.");
  const pagadoAhora = Math.min(disponible, restante);
  if (pagadoAhora === restante) {
    copia.pagadas = ordinal;
    copia.abonado = 0;
  } else {
    copia.abonado = abonoDeCompra(copia) + pagadoAhora;
  }
  return { compra: recalcularCompra(copia), pagadoAhora, cuota: ordinal };
}

export function deshacerPagoCompra(item) {
  const copia = recalcularCompra(structuredClone(item));
  const abonado = abonoDeCompra(copia);
  if (abonado > 0) {
    copia.abonado = 0;
    return { compra: recalcularCompra(copia), devuelto: abonado, isAbono: true };
  }
  const ordinal = ultimaCuotaPagadaNumero(copia);
  if (!ordinal) throw new TypeError("No hay un pago que deshacer.");
  const devuelto = importeCuota(copia, ordinal);
  copia.pagadas = ordinal - 1;
  return { compra: recalcularCompra(copia), devuelto, isAbono: false };
}

export function resumenImportesCompra(item) {
  const importes = importesDeCompra(item);
  return {
    minimo: Math.min(...importes),
    maximo: Math.max(...importes),
    hasImportesDiferentes: new Set(importes).size > 1,
    cuotas: [...importes]
  };
}

// El plan del grupo sirve como evidencia del contrato original; los totales
// personales usan solo cuotasAsignadas. Un PDF personal nunca debe incluir
// el total del grupo ni los nombres de las demás personas del reparto.
