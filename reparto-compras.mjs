import { validarPlanCuotas } from "./planes-cuotas.mjs";

// Política de entrada de esta versión, no un límite de la tarjeta bancaria.
export const MAX_PERSONAS_REPARTO = 100;
const MAX_NOMBRE = 80;
const MIN_PERSONAS = 1;
const MIN_MONTO = 1;

function montoValido(valor) {
  if (!Number.isSafeInteger(valor) || valor < MIN_MONTO) {
    throw new TypeError("Los importes deben ser pesos enteros positivos.");
  }
  return valor;
}

function nombreValido(valor) {
  if (typeof valor !== "string" || !valor.trim() || valor.length > MAX_NOMBRE ||
      /[\u0000-\u001f\u007f]/.test(valor)) {
    throw new TypeError("Persona del reparto inválida.");
  }
  return valor.trim();
}

function listaValida(personas) {
  if (!Array.isArray(personas) || personas.length < MIN_PERSONAS ||
      personas.length > MAX_PERSONAS_REPARTO) {
    throw new RangeError("Cantidad de personas inválida.");
  }
}

function exigirUnicas(personas) {
  if (new Set(personas).size !== personas.length) {
    throw new TypeError("Una persona no puede repetirse en el reparto.");
  }
}

/**
 * Reparto por importes libres. La suma debe coincidir exactamente con el
 * total final, incluidos intereses manuales. No se completan diferencias
 * automáticamente en el último participante sin mostrarlas al titular.
 */
export function validarReparto(total, asignaciones) {
  montoValido(total);
  listaValida(asignaciones);
  const copia = Array.from(asignaciones, (asignacion) => {
    if (!asignacion || typeof asignacion !== "object" || Array.isArray(asignacion)) {
      throw new TypeError("Asignación inválida.");
    }
    return { persona: nombreValido(asignacion.persona), monto: montoValido(asignacion.monto) };
  });
  exigirUnicas(copia.map((asignacion) => asignacion.persona));
  const suma = copia.reduce((valor, asignacion) => valor + BigInt(asignacion.monto), 0n);
  if (suma !== BigInt(total)) throw new RangeError("Las partes deben sumar el total de la compra.");
  return copia;
}

/**
 * Reparto igual opcional. Los pesos sobrantes van a las primeras personas
 * en el orden visible. La UI debe mostrar los importes antes de confirmar.
 */
export function crearRepartoIgual(total, personas) {
  montoValido(total);
  listaValida(personas);
  const nombres = Array.from(personas, nombreValido);
  exigirUnicas(nombres);
  if (nombres.length > total) throw new RangeError("Cada persona debe tener al menos un peso asignado.");
  const base = Number(BigInt(total) / BigInt(nombres.length));
  const resto = Number(BigInt(total) % BigInt(nombres.length));
  return nombres.map((persona, indice) => ({
    persona,
    monto: base + (indice < resto ? MIN_MONTO : 0)
  }));
}

function compararRestos(a, b) {
  if (a.resto === b.resto) return a.indice - b.indice;
  return a.resto > b.resto ? -1 : 1;
}

function fraccionesColumna(cuota, restantes, totalRestante) {
  const denominador = BigInt(totalRestante);
  return restantes.map((saldo, indice) => {
    const producto = BigInt(cuota) * BigInt(saldo);
    return {
      indice,
      valor: Number(producto / denominador),
      resto: producto % denominador
    };
  });
}

/** Asigna una cuota sin exceder los saldos individuales restantes. */
function distribuirColumna(cuota, restantes, totalRestante) {
  const fracciones = fraccionesColumna(cuota, restantes, totalRestante);
  const resultado = fracciones.map((fraccion) => fraccion.valor);
  const suma = resultado.reduce((valor, parte) => valor + parte, 0);
  const faltantes = cuota - suma;
  const candidatos = fracciones.filter((fraccion) => fraccion.resto > 0).sort(compararRestos);
  if (faltantes > candidatos.length) throw new Error("No se pudo distribuir el redondeo.");
  for (const fraccion of candidatos.slice(0, faltantes)) {
    resultado[fraccion.indice] += MIN_MONTO;
  }
  return resultado;
}

function verificarMatriz(plan, participaciones) {
  for (const participacion of participaciones) {
    const suma = participacion.cuotas.reduce((valor, cuota) => valor + cuota, 0);
    if (suma !== participacion.monto) throw new Error("El reparto no conserva la asignación individual.");
  }
  for (let indice = 0; indice < plan.cuotas.length; indice++) {
    const suma = participaciones.reduce((valor, parte) => valor + parte.cuotas[indice], 0);
    if (suma !== plan.cuotas[indice]) throw new Error("El reparto no conserva la cuota bancaria.");
  }
}

/**
 * Distribuye el contrato entre personas, manteniendo dos invariantes:
 *
 * - La suma de las cuotas de cada persona es su importe asignado.
 * - La suma de las personas en cada mes es la cuota de la compra original.
 *
 * Usa cocientes y restos BigInt para no perder precisión al multiplicar
 * importes grandes, aunque los importes externos sean enteros seguros.
 *
 * Cada columna se reparte proporcionalmente a los saldos aún no asignados.
 * Los empates de un peso se resuelven por orden de personas. No se inventa
 * una cuota bancaria adicional para corregir diferencias de redondeo.
 *
 * Una participación puede valer cero en un mes si el monto asignado es
 * menor al número de cuotas. La futura UI debe mostrar ese cero y no
 * convertirlo en una deuda ni en un pago ficticio.
 */
export function repartirPlanCuotas(input, asignaciones) {
  const plan = validarPlanCuotas(input);
  const partes = validarReparto(plan.totalFinal, asignaciones);
  const restantes = partes.map((parte) => parte.monto);
  const participaciones = partes.map((parte) => ({ ...parte, cuotas: [] }));
  let totalRestante = plan.totalFinal;
  for (const cuota of plan.cuotas) {
    const columna = distribuirColumna(cuota, restantes, totalRestante);
    columna.forEach((monto, indice) => {
      participaciones[indice].cuotas.push(monto);
      restantes[indice] -= monto;
    });
    totalRestante -= cuota;
  }
  verificarMatriz(plan, participaciones);
  return { totalFinal: plan.totalFinal, participaciones };
}

/**
 * Comprueba las personas contra un catálogo leído dentro de la misma
 * transacción de confirmación. Esta comprobación pura no sustituye leer
 * de nuevo el catálogo al confirmar: podría cambiar en otro dispositivo.
 */
export function validarPersonasReparto(asignaciones, personasExistentes) {
  listaValida(asignaciones);
  if (!Array.isArray(personasExistentes)) throw new TypeError("Catálogo de personas inválido.");
  const catalogo = new Set(Array.from(personasExistentes, nombreValido));
  for (const asignacion of asignaciones) {
    if (!asignacion || !catalogo.has(nombreValido(asignacion.persona))) {
      throw new TypeError("Una persona del reparto ya no existe.");
    }
  }
  return true;
}

/**
 * Previsualización de cuotas compartidas para revisión antes de confirmar.
 * Informa ceros explícitos y extremos; no resume con una cuota promedio,
 * porque ocultaría diferencias que el titular debe poder comprobar.
 */
export function previsualizarReparto(input, asignaciones) {
  const reparto = repartirPlanCuotas(input, asignaciones);
  return reparto.participaciones.map((parte) => ({
    persona: parte.persona,
    monto: parte.monto,
    numeroCuotas: parte.cuotas.length,
    primeraCuota: parte.cuotas[0],
    ultimaCuota: parte.cuotas[parte.cuotas.length - 1],
    cuotaMinima: Math.min(...parte.cuotas),
    cuotaMaxima: Math.max(...parte.cuotas),
    hasCuotasDiferentes: new Set(parte.cuotas).size > 1,
    cuotas: [...parte.cuotas]
  }));
}

// Integración pendiente:
// guardar una compra original y sus participaciones bajo un grupo estable;
// confirmar el grupo completo en una transacción, nunca en varios saves;
// mostrar el origen bancario una vez y los saldos por participación;
// conservar cuotas individuales y pagos parciales en backups y PDF;
// impedir que editar una participación vuelva a contabilizar la compra.

// Este módulo no importa lógica de UI ni almacena datos. No crea personas,
// no decide una tarjeta, no supone partes iguales por defecto y no toca
// registros históricos. Una persona única es un reparto válido para poder
// reutilizar exactamente la misma ruta del registro no compartido.
