import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { request } from "node:http";
import { once } from "node:events";
import { createContext, runInContext } from "node:vm";
import { crearServidorRoadmap } from "../scripts/roadmap-servidor.mjs";

const plan = JSON.parse(readFileSync(new URL("../docs/seguimiento/plan.json", import.meta.url)));
const template = readFileSync(new URL("../docs/seguimiento/plantilla.html", import.meta.url), "utf8");

function node(tag = "div") {
  return {
    tag, children:[], style:{}, dataset:{}, value:"", textContent:"", className:"",
    append(...children) { this.children.push(...children); },
    replaceChildren(...children) { this.children = children; },
    setAttribute(key, value) { this[key] = value; },
    addEventListener() {}, scrollIntoView() { this.hasScrolled = true; }
  };
}

function browser() {
  const nodes = new Map([...template.matchAll(/id="([^"]+)"/g)].map((match) => [match[1], node()]));
  nodes.get("filter").value = "todos";
  const find = (id) => {
    if (nodes.has(id)) return nodes.get(id);
    return nodes.get("rows").children.find((row) => row.id === id);
  };
  const errors = [];
  const context = createContext({
    document:{ createElement:node, getElementById:find },
    location:{ protocol:"file:" }, console:{ error:(...args) => errors.push(args) },
    AbortSignal, setInterval() {}
  });
  const source = template.match(/<script>([\s\S]*?)<\/script>/)[1]
    .replace("/*__PLAN__*/null", JSON.stringify(plan));
  runInContext(source, context);
  return { context, nodes, errors, run:(source) => runInContext(source, context) };
}

test("el roadmap recibe cambios sin perder filtro ni selección y retiene el último estado válido", async () => {
  const page = browser();
  const value = structuredClone(plan);
  value.fases[0].tareas[0].titulo = "Título actualizado";
  page.nodes.get("search").value = "cuotas";
  page.run(`showDetails(byId.get("0.1"));`);
  page.context.location.protocol = "http:";
  page.context.fetch = async () => ({ ok:true, json:async () => value });
  await page.run("refreshPlan()");
  assert.match(page.nodes.get("detail-title").textContent, /Título actualizado/);
  assert.equal(page.nodes.get("search").value, "cuotas");
  assert.equal(page.nodes.get("connection").dataset.state, "ok");
  page.context.fetch = async () => ({ ok:true, json:async () => ({ version:1 }) });
  await page.run("refreshPlan()");
  assert.match(page.nodes.get("detail-title").textContent, /Título actualizado/);
  assert.equal(page.nodes.get("connection").dataset.state, "error");
  page.context.fetch = async () => { throw Error("sin conexión"); };
  await page.run("refreshPlan()");
  assert.equal(page.errors.length, 2);
  assert.equal(page.nodes.get("global").textContent, `${page.run("progress(tasks).percent")}%`);
});

test("ir a actual abre su fase y el marcador no sigue a la tarea inspeccionada", () => {
  const page = browser();
  page.run('PLAN.fases.forEach((fase) => closed.add(fase.id)); showDetails(byId.get("0.1")); goToCurrent();');
  const row = page.nodes.get("rows").children.find((row) => row.id === `task-${plan.actual}`);
  assert.ok(row.hasScrolled);
  assert.match(row.className, /actual/);
  page.run('showDetails(byId.get("0.1")); closed.clear(); render();');
  const inspected = page.nodes.get("rows").children.find((row) => row.id === "task-0.1");
  assert.match(inspected.className, /selected/);
  assert.doesNotMatch(inspected.className, /actual/);
  for (const current of page.nodes.get("rows").children) {
    const track = current.children[1];
    const bar = track.children[0];
    assert.ok(parseFloat(bar.style.left) + parseFloat(bar.style.width) <= 100.00001);
  }
});

test("las dependencias pendientes se distinguen de impedimentos explícitos", () => {
  const page = browser();
  const states = page.run('tasks.map((t) => ({ id:t.id, source:t.estado, effective:state(t), deps:blockedBy(t).length }))');
  assert.ok(states.some((t) => t.effective === "en_espera"));
  assert.ok(states.every((t) => t.effective !== "bloqueada" || t.source === "bloqueada"));
  assert.ok(states.every((t) => !t.deps || ["bloqueada", "en_espera"].includes(t.effective)));
});

test("la actualización en vivo rechaza ciclos y aceptación con dependencias sin verificar", async () => {
  const page = browser();
  page.context.location.protocol = "http:";
  const invalid = structuredClone(plan);
  const task = invalid.fases.flatMap((fase) => fase.tareas).find((t) => t.estado === "pendiente" && t.dependencias.length);
  task.dependencias = [task.id];
  page.context.fetch = async () => ({ ok:true, json:async () => invalid });
  await page.run("refreshPlan()");
  assert.equal(page.nodes.get("connection").dataset.state, "error");
  const inconsistent = structuredClone(plan);
  const pending = inconsistent.fases.flatMap((fase) => fase.tareas).find((t) => t.estado === "pendiente" && t.dependencias.some((id) => plan.fases.flatMap((fase) => fase.tareas).find((d) => d.id === id).estado !== "completada"));
  pending.estado = "completada";
  pending.evidencia = "Declaración incompatible con sus dependencias";
  page.context.fetch = async () => ({ ok:true, json:async () => inconsistent });
  await page.run("refreshPlan()");
  assert.equal(page.nodes.get("connection").dataset.state, "error");
  assert.equal(page.errors.length, 2);
});

function get(port, path, options = {}) {
  return new Promise((resolve, reject) => {
    const req = request({ hostname:"127.0.0.1", port, path, headers:{ Host:"127.0.0.1:8767" }, ...options }, (res) => {
      let body = "";
      res.setEncoding("utf8");
      res.on("data", (chunk) => { body += chunk; });
      res.on("end", () => resolve({ status:res.statusCode, headers:res.headers, body }));
    });
    req.on("error", reject);
    req.end();
  });
}

test("el servidor permite solo el seguimiento local y lo entrega sin caché", async () => {
  const server = crearServidorRoadmap();
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  try {
    const port = server.address().port;
    const response = await get(port, "/docs/seguimiento/plan.json");
    assert.equal(response.status, 200);
    assert.equal(response.headers["cache-control"], "no-store");
    assert.equal(JSON.parse(response.body).actual, plan.actual);
    assert.equal((await get(port, "/index.html")).status, 404);
    assert.equal((await get(port, "/package-lock.json")).status, 404);
    assert.equal((await get(port, "/docs/seguimiento/plan.json", { method:"POST" })).status, 405);
    assert.equal((await get(port, "/", { headers:{ Host:"example.invalid" } })).status, 403);
    assert.equal((await get(port, "/")).status, 302);
  } finally { await new Promise((resolve) => server.close(resolve)); }
});
