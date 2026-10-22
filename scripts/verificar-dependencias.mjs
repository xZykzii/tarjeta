import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";

const ROOT = fileURLToPath(new URL("../", import.meta.url));
const TIMEOUT_AUDIT_MS = 120000;
const MAX_AUDIT_BYTES = 5 * 1024 * 1024;
const MAX_PAQUETES = 10000;
const MAX_PROFUNDIDAD = 30;
const GRAVEDADES = ["info", "low", "moderate", "high", "critical"];
const SEMVER_PATTERN = /^\d+\.\d+\.\d+$/;
const MODULOS_WEB = new Set(["firebase-app.js", "firebase-auth.js", "firebase-firestore.js"]);

// Excepciones acotadas a avisos ya revisados, nunca a un paquete completo.
// Son deuda abierta de herramientas; no declarar audit limpio al aceptarlas.
// Esta comprobación tampoco sustituye las pruebas Android ni las reglas.
const CONOCIDOS = new Map([
  ["https://github.com/advisories/GHSA-vfj7-8cjw-p6xm", {
    gravedad: "high", paquetes: new Set(["braces", "chokidar", "firebase-tools"])
  }],
  ["https://github.com/advisories/GHSA-8988-4f7v-96qf", {
    gravedad: "moderate", paquetes: new Set(["@opentelemetry/core", "@google-cloud/pubsub", "firebase-tools"])
  }]
]);

function isObjeto(valor) {
  return valor !== null && typeof valor === "object" && !Array.isArray(valor);
}

function validarInforme(informe, lock) {
  if (!isObjeto(informe) || informe.auditReportVersion !== 2 || informe.error ||
      !isObjeto(informe.vulnerabilities) || !isObjeto(informe.metadata?.vulnerabilities)) {
    throw new TypeError("No se recibió una auditoría npm válida.");
  }
  if (!isObjeto(lock?.packages) || ![2, 3].includes(lock.lockfileVersion)) {
    throw new TypeError("Lockfile no compatible con la revisión de dependencias.");
  }
  const nombres = Object.keys(informe.vulnerabilities);
  if (nombres.length > MAX_PAQUETES || informe.metadata.vulnerabilities.total !== nombres.length) {
    throw new TypeError("El informe de dependencias está incompleto o fuera de límites.");
  }
  for (const nombre of nombres) validarEntrada(nombre, informe.vulnerabilities[nombre], lock);
  validarConteos(informe);
}

function validarConteos(informe) {
  for (const gravedad of GRAVEDADES) {
    const cantidad = Object.values(informe.vulnerabilities).filter(entrada => entrada.severity === gravedad).length;
    if (informe.metadata.vulnerabilities[gravedad] !== cantidad) {
      throw new TypeError("Las gravedades declaradas no coinciden con los avisos.");
    }
  }
}

function validarEntrada(nombre, entrada, lock) {
  if (!isObjeto(entrada) || entrada.name !== nombre || !GRAVEDADES.includes(entrada.severity) ||
      !Array.isArray(entrada.via) || !entrada.via.length || !Array.isArray(entrada.nodes) || !entrada.nodes.length) {
    throw new TypeError("Una entrada de la auditoría está incompleta.");
  }
  for (const nodo of entrada.nodes) {
    validarNodo(nodo, nombre, lock);
  }
}

function validarNodo(nodo, nombre, lock) {
  const isNombreValido = /^(?:@[a-z0-9._-]+\/)?[a-z0-9._-]+$/.test(nombre);
  if (!isNombreValido || typeof nodo !== "string" || !nodo.startsWith("node_modules/") ||
      nodo.split("/").includes("..") || !nodo.endsWith(`node_modules/${nombre}`) ||
      !Object.hasOwn(lock.packages, nodo)) {
    throw new TypeError("La auditoría no coincide con el lockfile.");
  }
  const paquete = lock.packages[nodo];
  if (!isObjeto(paquete) || typeof paquete.version !== "string" || !paquete.version.length) {
    throw new TypeError("El lockfile contiene una dependencia sin versión.");
  }
}

function validarAviso(aviso) {
  if (!isObjeto(aviso) || typeof aviso.url !== "string" || !GRAVEDADES.includes(aviso.severity)) {
    throw new TypeError("Aviso de seguridad inválido.");
  }
  let url;
  try { url = new URL(aviso.url); }
  catch (error) { throw new TypeError("URL de aviso inválida.", { cause: error }); }
  if (url.protocol !== "https:" || url.username || url.password || url.search || url.hash) {
    throw new TypeError("La URL del aviso no es una referencia pública segura.");
  }
}

function avisosDe(nombre, entradas, visitados = new Set()) {
  if (visitados.size >= MAX_PROFUNDIDAD || visitados.has(nombre) || !Object.hasOwn(entradas, nombre)) {
    throw new TypeError("Las referencias de la auditoría no son válidas.");
  }
  const camino = new Set([...visitados, nombre]);
  return entradas[nombre].via.flatMap(via => {
    if (typeof via === "string") return avisosDe(via, entradas, camino);
    validarAviso(via);
    return [via];
  });
}

function hasAvisoConocido(nombre, entrada, aviso, lock) {
  const excepcion = CONOCIDOS.get(aviso.url);
  if (!excepcion?.paquetes.has(nombre)) return false;
  const limite = GRAVEDADES.indexOf(excepcion.gravedad);
  return GRAVEDADES.indexOf(aviso.severity) <= limite &&
    entrada.nodes.every(nodo => lock.packages[nodo].dev === true);
}

/** Un fallo del registro, un aviso nuevo o deuda movida a producción bloquean CI. */
export function analizarAuditoria(informe, lock) {
  validarInforme(informe, lock);
  const conocidas = [];
  const nuevas = [];
  for (const [nombre, entrada] of Object.entries(informe.vulnerabilities)) {
    const avisos = avisosDe(nombre, informe.vulnerabilities);
    const resumen = { paquete: nombre, gravedad: entrada.severity,
      avisos: [...new Set(avisos.map(aviso => aviso.url))] };
    const limite = Math.max(...avisos.map(aviso => GRAVEDADES.indexOf(CONOCIDOS.get(aviso.url)?.gravedad)));
    if (GRAVEDADES.indexOf(entrada.severity) <= limite &&
        avisos.every(aviso => hasAvisoConocido(nombre, entrada, aviso, lock))) conocidas.push(resumen);
    else nuevas.push(resumen);
  }
  return { conocidas, nuevas };
}

/** npm no escanea un import CDN: al menos debe ser la versión probada aquí. */
export function validarVersionesWeb(html, paquete) {
  if (typeof html !== "string" || !html.length || !isObjeto(paquete?.devDependencies)) {
    throw new TypeError("No se puede comprobar la versión de las dependencias web.");
  }
  const firebase = paquete.devDependencies.firebase;
  const jspdf = paquete.devDependencies.jspdf;
  if (!SEMVER_PATTERN.test(firebase) || !SEMVER_PATTERN.test(jspdf)) {
    throw new TypeError("Las versiones de prueba deben estar fijadas exactamente.");
  }
  const modulos = [...html.matchAll(/https:\/\/www\.gstatic\.com\/firebasejs\/([^/]+)\/([^"\s]+)/g)];
  const hasModulosCompletos = modulos.length === MODULOS_WEB.size &&
    new Set(modulos.map(modulo => modulo[2])).size === MODULOS_WEB.size;
  if (!hasModulosCompletos || modulos.some(modulo => modulo[1] !== firebase || !MODULOS_WEB.has(modulo[2]))) {
    throw new TypeError("El SDK web no coincide con la versión cubierta por las pruebas.");
  }
  const pdf = [...html.matchAll(/https:\/\/cdn\.jsdelivr\.net\/npm\/jspdf@([^/]+)\/\+esm/g)];
  if (pdf.length !== 1 || pdf[0][1] !== jspdf) {
    throw new TypeError("El generador PDF web no coincide con la versión probada.");
  }
  return { firebase, jspdf };
}

function leerEntradasLocales() {
  const paquete = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));
  const lock = JSON.parse(readFileSync(new URL("../package-lock.json", import.meta.url), "utf8"));
  const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
  const versiones = validarVersionesWeb(html, paquete);
  const fijadas = lock.packages?.[""]?.devDependencies;
  if (!isObjeto(fijadas) || Object.entries(paquete.devDependencies).some(([nombre, version]) => fijadas[nombre] !== version)) {
    throw new TypeError("El lockfile no refleja las versiones de herramientas declaradas.");
  }
  return { lock, versiones };
}

function ejecutarAudit() {
  const npm = process.env.npm_execpath;
  const argumentos = ["audit", "--json", "--ignore-scripts"];
  const comando = npm ? process.execPath : (process.platform === "win32" ? "npm.cmd" : "npm");
  const resultado = spawnSync(comando, npm ? [npm, ...argumentos] : argumentos, {
    cwd: ROOT, encoding: "utf8", timeout: TIMEOUT_AUDIT_MS, maxBuffer: MAX_AUDIT_BYTES,
    windowsHide: true
  });
  if (resultado.error || ![0, 1].includes(resultado.status)) {
    throw new Error("No se pudo completar npm audit. Revisa la conexión y vuelve a ejecutar.");
  }
  try { return JSON.parse(resultado.stdout); }
  catch (error) { throw new Error("npm audit devolvió un informe no válido.", { cause: error }); }
}

function main() {
  try {
    const { lock, versiones } = leerEntradasLocales();
    console.log(`Versiones web y pruebas coincidentes: Firebase ${versiones.firebase}, jsPDF ${versiones.jspdf}.`);
    const resultado = analizarAuditoria(ejecutarAudit(), lock);
    for (const aviso of [...resultado.conocidas, ...resultado.nuevas]) {
      console.log(`${aviso.gravedad} · ${aviso.paquete} · ${aviso.avisos.join(", ")}`);
    }
    if (resultado.nuevas.length) {
      console.error(`Bloqueado: ${resultado.nuevas.length} entradas nuevas o fuera del alcance revisado.`);
      process.exitCode = 1;
      return;
    }
    console.log(resultado.conocidas.length
      ? `${resultado.conocidas.length} entradas conocidas siguen abiertas en herramientas. Cero entradas nuevas; no es una auditoría sin vulnerabilidades.`
      : "Sin avisos npm pendientes.");
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
