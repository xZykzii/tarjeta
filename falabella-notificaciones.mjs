import { crearPendiente } from "./compras-pendientes.mjs";

// Prototipo conservador basado en una captura auténtica del 2026-10-21.
// No está conectado a Android. No representa un analizador definitivo.
export const PARSER_VERSION = "captura-20261021-v2";
export const MAX_TEXTO_NOTIFICACION = 2000;
const PACKAGE_PATTERN = /^[a-zA-Z][\w]*(\.[a-zA-Z][\w]*)+$/;
const MAX_PACKAGE_LENGTH = 200;
const MAX_COMERCIO = 200;
const MAX_CANDIDATOS = 4;
const LABEL_BANCO = "Banco Falabella";
const PURCHASE_PATTERN = /^Compraste \$((?:[1-9]\d{0,2}(?:\.\d{3})+)|(?:[1-9]\d*)) en (.+?) Con tu CMR Mastercard Elite terminada en (\d{4})\. Si no la realizaste tú, revisa los movimientos de tus adicionales en tu app\.$/u;
// El nombre del adicional se valida como parte de la gramática, pero no se captura ni asigna.
const ADDITIONAL_PATTERN = /^Tu Adicional compró \$((?:[1-9]\d{0,2}(?:\.\d{3})+)|(?:[1-9]\d*)) en (.+?) Realizada por [\p{L}\p{M}][\p{L}\p{M} .'-]{0,199} con su CMR Adicional terminada en (\d{4})\. Si tienes algún problema, comunícate con nosotros\.$/u;

function rechazo(motivo) {
  // No incluir texto, importe ni terminación en diagnósticos o logs.
  return { resultado: "ignorada", motivo, parserVersion: PARSER_VERSION };
}

function isObjeto(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

/**
 * El nombre visible Banco Falabella no identifica a un paquete Android.
 * El adaptador debe verificar el paquete instalado en el dispositivo y
 * proporcionar la configuración local; no se adivina a partir del logo.
 */
function hasPaqueteValido(value) {
  return typeof value === "string" && value.length <= MAX_PACKAGE_LENGTH && PACKAGE_PATTERN.test(value);
}

function filtroOrigen(notificacion, config) {
  if (!isObjeto(config) || !hasPaqueteValido(config.paqueteAutorizado) ||
      config.hasPaqueteVerificado !== true) {
    return rechazo("paquete_no_verificado");
  }
  if (notificacion.paquete !== config.paqueteAutorizado) return rechazo("otra_aplicacion");
  // El adaptador Android debe proporcionar este booleano desde FLAG_GROUP_SUMMARY.
  // No aceptar un valor desconocido como si fuera una notificación individual.
  if (notificacion.isResumenGrupo !== false) return rechazo("resumen_o_tipo_desconocido");
  return null;
}

function textoSeguro(value) {
  if (value === undefined || value === null) return "";
  if (typeof value !== "string" || value.length > MAX_TEXTO_NOTIFICACION ||
      /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(value)) {
    throw new TypeError("Contenido de notificación inválido.");
  }
  return value.normalize("NFC").replace(/\s+/gu, " ").trim();
}

/**
 * El layout de la captura no prueba la separación entre extras Android.
 * Se prueban hasta cuatro candidatos de título/cuerpo, todos con anclaje
 * completo. No buscar un fragmento de compra dentro de un texto mayor.
 */
function candidatos(notificacion) {
  const titulo = textoSeguro(notificacion.titulo);
  const texto = textoSeguro(notificacion.texto);
  const textoAmpliado = textoSeguro(notificacion.textoAmpliado);
  const tituloCompra = titulo === LABEL_BANCO ? "" : titulo;
  return [...new Set([
    texto, textoAmpliado,
    `${tituloCompra} ${texto}`.trim(),
    `${tituloCompra} ${textoAmpliado}`.trim()
  ])].filter(Boolean).slice(0, MAX_CANDIDATOS);
}

function datosDeTexto(texto) {
  const match = PURCHASE_PATTERN.exec(texto) || ADDITIONAL_PATTERN.exec(texto);
  if (!match) return null;
  const montoOriginal = Number(match[1].replaceAll(".", ""));
  const comercio = match[2].trim();
  if (!Number.isSafeInteger(montoOriginal) || montoOriginal <= 0 ||
      !comercio || comercio.length > MAX_COMERCIO) return null;
  return {
    montoOriginal,
    comercio,
    tarjetaUltimos4: match[3],
    moneda: "CLP",
    fechaCompra: null,
    horaCompra: null,
    referenciaHash: null
  };
}

function coincidenciasUnicas(notificacion) {
  const resultados = candidatos(notificacion).map(datosDeTexto).filter(Boolean);
  const porDatos = new Map(resultados.map((datos) => [JSON.stringify(datos), datos]));
  return [...porDatos.values()];
}

/**
 * Analiza únicamente el formato positivo documentado.
 *
 * Entrada esperada del futuro listener:
 * - paquete: StatusBarNotification.packageName.
 * - isResumenGrupo: booleano derivado de FLAG_GROUP_SUMMARY.
 * - titulo/texto/textoAmpliado: extras de texto, si están disponibles.
 *
 * La fecha de recepción no se convierte en fecha de transacción. Las
 * cuotas e intereses no se extraen porque no aparecen en la evidencia.
 * El resultado no tiene persona, tarjeta de la PWA ni saldo.
 *
 * Un resultado compra es un candidato a revisión; nunca una deuda.
 * Falta validar este comportamiento con extras reales en el dispositivo
 * y muestras negativas auténticas antes de activar sincronización.
 */
export function analizarNotificacionFalabella(notificacion, config) {
  if (!isObjeto(notificacion)) return rechazo("entrada_invalida");
  const filtro = filtroOrigen(notificacion, config);
  if (filtro) return filtro;
  try {
    const resultados = coincidenciasUnicas(notificacion);
    if (!resultados.length) return rechazo("formato_no_reconocido");
    if (resultados.length > 1) return rechazo("contenido_ambiguo");
    return {
      resultado: "compra",
      datos: resultados[0],
      parserVersion: PARSER_VERSION,
      debeRevisarse: true
    };
  } catch (error) {
    if (error instanceof TypeError) return rechazo("texto_invalido");
    throw error;
  }
}

/**
 * Estado del soporte para mostrar en herramientas de diagnóstico local.
 * Las capacidades se describen por evidencia, sin afirmar captura activa.
 */
export function soporteAnalizador() {
  return {
    version: PARSER_VERSION,
    hasCapturaAndroidValidada: false,
    hasFormatoPositivoDocumentado: true,
    hasPaqueteBancoConfirmado: false,
    hasNegativosAutenticosValidados: false,
    hasFechaBancaria: false,
    hasReferenciaBancaria: false,
    hasCuotasEnNotificacion: false,
    maxTexto: MAX_TEXTO_NOTIFICACION,
    resultadoDesconocido: "ignorada"
  };
}

/**
 * Puente puro entre análisis y contrato de revisión. Todavía no se llama
 * desde Android ni desde una suscripción Firebase.
 *
 * El adaptador debe proporcionar una identidad persistente y el instante
 * real de recepción. No generar un ID aleatorio en cada reintento ni
 * sustituir con Date.now() una fecha de compra que el banco no entregó.
 *
 * Repetir esta operación con los mismos metadatos conserva el eventId;
 * la deduplicación distribuida dependerá después de la escritura y reglas
 * de la misma ruta Firestore. Esta función no certifica esa deduplicación.
 */
export function pendienteDesdeNotificacion(notificacion, config, metadatos) {
  const resultado = analizarNotificacionFalabella(notificacion, config);
  if (resultado.resultado !== "compra") return resultado;
  if (!isObjeto(metadatos)) throw new TypeError("Faltan identidad y recepción de la captura.");
  const pendiente = crearPendiente({
    ...resultado.datos,
    eventId: metadatos.eventId,
    recibidaEn: metadatos.recibidaEn,
    parserVersion: PARSER_VERSION
  });
  return { resultado: "pendiente", pendiente };
}

// Contrato de privacidad:
// 1. Filtrar el paquete antes de normalizar los textos.
// 2. No leer ni guardar otras notificaciones.
// 3. No escribir texto bruto en Firestore ni consola.
// 4. Mantener únicamente datos normalizados y una identidad persistente.
// 5. No usar la etiqueta, logo o nombre del banco como autenticación.
// 6. No acceder a PendingIntent, acciones, OTP, contraseñas o tokens.
// 7. No procesar resúmenes de grupos como transacciones individuales.

// Qué NO certifican los tests de este archivo:
// - que el nombre del paquete coincida con la app instalada;
// - que Android entregue título/cuerpo sin redacción o truncamiento;
// - que los formatos negativos reales sean idénticos a fixtures sintéticos;
// - que una compra fuera del formato observado sea reconocida;
// - que la identidad de notificación sea una referencia de transacción;
// - que exista una conexión o una sesión Firebase válida;
// - que la tarjeta de cuatro dígitos sea única en el catálogo del titular.

// La implementación Android deberá portar esta gramática con el mismo
// corpus de pruebas, o compartir un contrato de fixtures. No depender de
// ejecutar JavaScript dentro de un WebView para acceder al listener.
