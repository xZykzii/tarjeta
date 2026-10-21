import { readFileSync, writeFileSync, renameSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const PLAN = "docs/seguimiento/plan.json";
const TEMPLATE = "docs/seguimiento/plantilla.html";
const TOTAL_WEIGHT = 100;
const VALID_STATES = new Set(["pendiente", "en_curso", "completada", "bloqueada"]);
const args = process.argv.slice(2);
const hasCheck = args.includes("--check");
const plan = JSON.parse(readFileSync(resolve(ROOT, PLAN), "utf8"));
const tasks = plan.fases.flatMap((fase) => fase.tareas);
const byId = new Map(tasks.map((tarea) => [tarea.id, tarea]));

function validateTask(tarea) {
  if (!VALID_STATES.has(tarea.estado)) throw Error(`Estado inválido: ${tarea.id}`);
  if (!Number.isInteger(tarea.peso) || tarea.peso <= 0) throw Error("Peso inválido");
  if (!tarea.criterio?.trim()) throw Error(`Falta criterio: ${tarea.id}`);
  if (tarea.estado === "completada" && !tarea.evidencia?.trim()) {
    throw Error(`Falta evidencia: ${tarea.id}`);
  }
  for (const dep of tarea.dependencias) {
    if (!byId.has(dep)) throw Error(`Dependencia inexistente: ${dep}`);
    if (tarea.estado === "completada" && byId.get(dep).estado !== "completada") {
      throw Error(`Completada con dependencia pendiente: ${tarea.id} → ${dep}`);
    }
  }
}

function validateCycles(id, path = new Set(), visited = new Set()) {
  if (path.has(id)) throw Error(`Ciclo de dependencias: ${id}`);
  if (visited.has(id)) return;
  path.add(id);
  for (const dep of byId.get(id).dependencias) validateCycles(dep, path, visited);
  path.delete(id);
  visited.add(id);
}

function validate() {
  if (plan.version !== 1 || !Array.isArray(plan.fases)) throw Error("Plan incompatible");
  if (byId.size !== tasks.length) throw Error("IDs duplicados");
  if (tasks.reduce((sum, t) => sum + t.peso, 0) !== TOTAL_WEIGHT) {
    throw Error("Los pesos deben sumar 100");
  }
  tasks.forEach(validateTask);
  tasks.forEach((tarea) => validateCycles(tarea.id));
  if (!byId.has(plan.actual)) throw Error("Tarea actual inexistente");
}

function progress(list) {
  const weight = list.reduce((sum, tarea) => sum + tarea.peso, 0);
  const done = list.filter((tarea) => tarea.estado === "completada")
    .reduce((sum, tarea) => sum + tarea.peso, 0);
  return { weight, done, percent: Number((done / weight * TOTAL_WEIGHT).toFixed(1)) };
}

function blockers(tarea) {
  return tarea.dependencias.filter((dep) => byId.get(dep).estado !== "completada");
}

function state(tarea) {
  if (tarea.estado === "completada") return tarea.estado;
  return blockers(tarea).length ? "bloqueada" : tarea.estado;
}

function cell(value) {
  return String(value).replaceAll("|", "\\|").replaceAll("\n", " ");
}

function list(values) {
  return values.length ? values.map((value) => `- ${value}`).join("\n") : "- Ninguno registrado.";
}

function taskSection(fase) {
  const summary = progress(fase.tareas);
  const rows = fase.tareas.map((tarea) => [
    tarea.id, tarea.titulo, state(tarea), `${tarea.peso} pt`,
    tarea.dependencias.join(", ") || "—", tarea.criterio, tarea.evidencia || "Pendiente"
  ].map(cell).join(" | "));
  return [
    `## Fase ${fase.id} — ${fase.titulo} · ${summary.percent}%`, "",
    `Aceptación: ${summary.done}/${summary.weight} puntos.`, "",
    "ID | Tarea | Estado efectivo | Peso | Dependencias | Criterio de finalización | Evidencia",
    "--- | --- | --- | --- | --- | --- | ---", ...rows, ""
  ].join("\n");
}

function roadmap() {
  const summary = progress(tasks);
  return [
    "<!-- GENERADO: editar docs/seguimiento/plan.json y ejecutar node scripts/seguimiento.mjs -->",
    "# Roadmap — Compras automáticas de Banco Falabella", "",
    `Actualizado: ${plan.fecha}. Base: \`${plan.base}\`.`, "",
    `**Avance global: ${summary.percent}% (${summary.done}/${TOTAL_WEIGHT} puntos verificados).**`, "",
    `**Tarea actual: ${plan.actual} — ${byId.get(plan.actual).titulo}.**`, "",
    "[Abrir roadmap visual](docs/seguimiento/roadmap.html) · [Estado para continuar](ESTADO_PROYECTO.md)", "",
    "## Cómo se mide y actualiza", "",
    "Solo las tareas completadas con criterio verificado y evidencia suman su peso. En curso suma cero hasta verificarse. El porcentaje mide aceptación, no tiempo transcurrido ni restante. El Gantt muestra orden lógico, no fechas estimadas. Bloqueada por dependencia se deriva automáticamente, sin modificar el estado persistido.", "",
    "Editar la fuente única `docs/seguimiento/plan.json`. Registrar pruebas, archivos, decisiones y la tarea siguiente. Ejecutar `node scripts/seguimiento.mjs` y después `node scripts/seguimiento.mjs --check`. No editar las vistas generadas. Revisar el diff y hacer commits pequeños sin publicar.", "",
    ...plan.fases.map(taskSection),
    "## Problemas y dependencias externas", "", list(plan.problemas), "",
    "## Funcionalidades completadas", "",
    list(tasks.filter((t) => t.estado === "completada").map((t) => `${t.id} ${t.titulo}: ${t.evidencia}`)), "",
    "## Funcionalidades pendientes", "",
    list(tasks.filter((t) => t.estado !== "completada").map((t) => `${t.id} ${t.titulo} (${state(t)})`)), "",
    "## Esfuerzo restante", "",
    "Sin estimación fiable: depende del formato auténtico, configuración de Firebase y validación física Android. Los pesos no son horas.", ""
  ].join("\n");
}

function recovery() {
  const current = byId.get(plan.actual);
  return [
    "<!-- GENERADO: editar docs/seguimiento/plan.json y ejecutar node scripts/seguimiento.mjs -->",
    "# Estado del proyecto", "",
    `Snapshot: ${plan.fecha} · Base: \`${plan.base}\` · Rama: \`codex/compras-falabella\`.`, "",
    "## Objetivo", "", plan.objetivo, "",
    "## Arquitectura comprobada", "", list(plan.arquitectura), "",
    "## Decisiones técnicas", "", list(plan.decisiones), "",
    "## Punto exacto de continuidad", "",
    `Tarea actual: **${current.id} — ${current.titulo}**. Estado efectivo: **${state(current)}**.`, "",
    `Criterio de cierre: ${current.criterio}`, "",
    `Última tarea terminada: **${plan.ultimaTerminada} — ${byId.get(plan.ultimaTerminada).titulo}**.`, "",
    `Avance verificado: **${progress(tasks).percent}%**.`, "",
    "## Archivos creados o modificados en esta iniciativa", "", list(plan.archivos.map((p) => `\`${p}\``)), "",
    "## Implementaciones incompletas", "", list(plan.incompletas), "",
    "## Pruebas y resultados", "", list(plan.pruebas), "",
    "## Errores conocidos, riesgos y requisitos externos", "", list(plan.problemas), "",
    "## Próximos pasos en orden de prioridad", "",
    ...nextTasks().map((t, i) => `${i + 1}. ${t.id} — ${t.titulo} (${state(t)}).`), "",
    "## Instrucciones concretas para retomar", "", list(plan.continuar), "",
    "La persistencia es el repositorio, no el chat, el almacenamiento del navegador ni una promesa de detectar créditos. Si la sesión se corta durante una edición, revisar el diff y regenerar antes de confiar en las vistas. Las operaciones Git remotas y el despliegue requieren autorización explícita.", ""
  ].join("\n");
}

function nextTasks() {
  const pending = tasks.filter((t) => t.estado !== "completada");
  const current = pending.find((t) => t.id === plan.actual);
  const available = pending.filter((t) => t.id !== plan.actual && state(t) !== "bloqueada");
  return [...(current ? [current] : []), ...available].slice(0, 6);
}

function writeAtomic(path, contents) {
  const target = resolve(ROOT, path);
  const temporary = `${target}.tmp`;
  writeFileSync(temporary, contents, "utf8");
  renameSync(temporary, target);
}

function html() {
  const template = readFileSync(resolve(ROOT, TEMPLATE), "utf8");
  const safeJson = JSON.stringify(plan).replaceAll("<", "\\u003c");
  return template.replace("/*__PLAN__*/null", safeJson);
}

function generate() {
  const outputs = new Map([
    ["ROADMAP.md", roadmap()], ["ESTADO_PROYECTO.md", recovery()],
    ["docs/seguimiento/roadmap.html", html()]
  ]);
  for (const [path, contents] of outputs) {
    if (!hasCheck) {
      writeAtomic(path, contents);
      continue;
    }
    if (!existsSync(resolve(ROOT, path)) || readFileSync(resolve(ROOT, path), "utf8") !== contents) {
      throw Error(`Vista desactualizada: ${path}. Ejecutar node scripts/seguimiento.mjs`);
    }
  }
}

try {
  validate();
  generate();
  console.log(`${hasCheck ? "Verificado" : "Generado"}: ${progress(tasks).percent}% · ${tasks.length} tareas · fuente única ${PLAN}`);
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
