import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
const sw = readFileSync(new URL("../sw.js", import.meta.url), "utf8");

test("los IDs del documento son únicos", () => {
  const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map((match) => match[1]);
  assert.equal(new Set(ids).size, ids.length);
});

test("las referencias getElementById apuntan a elementos existentes", () => {
  const ids = new Set([...html.matchAll(/\bid="([^"]+)"/g)].map((match) => match[1]));
  const refs = [...html.matchAll(/getElementById\("([^"]+)"\)/g)].map((match) => match[1]);
  const ausentes = [...new Set(refs.filter((id) => !ids.has(id)))];
  assert.deepEqual(ausentes, []);
});

test("todos los recursos locales precargados existen", () => {
  const rutas = [...sw.matchAll(/"\.\/([^"?]+)"/g)].map((match) => match[1] || "index.html");
  const ausentes = rutas
    .filter((ruta) => ruta && ruta !== "")
    .filter((ruta) => !existsSync(new URL(`../${ruta}`, import.meta.url)));
  assert.deepEqual(ausentes, []);
});

test("la publicación social y el formato de backup se conservan", () => {
  assert.match(html, /property="og:image" content="https:\/\/xzykzii\.github\.io\/tarjeta\/og\.png"/);
  assert.ok(existsSync(new URL("../og.png", import.meta.url)));
  assert.match(html, /JSON\.stringify\(\{ version: 6, items, tarjetas, personas, tarjetaActiva, saldos, historial \}/);
});
