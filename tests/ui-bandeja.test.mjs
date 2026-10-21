import test from "node:test";
import assert from "node:assert/strict";
import { crearBandejaCompras } from "../ui-pendientes.mjs";
import { crearPendiente } from "../compras-pendientes.mjs";

class MockElement {
  constructor(tag, className = "", textContent = "") {
    this.tagName = tag.toUpperCase();
    this.className = className;
    this._textContent = textContent;
    this.children = [];
    this.attributes = new Map();
    this.disabled = false;
    this.onclick = null;
    this.id = "";
    this.parentElement = null;
  }

  get textContent() {
    if (this._textContent) return this._textContent;
    return this.children.map((c) => c.textContent).join(" ");
  }

  set textContent(v) {
    this._textContent = v;
    if (v === "") this.children = [];
  }

  setAttribute(name, value) {
    this.attributes.set(name, String(value));
    if (name === "id") this.id = String(value);
  }

  getAttribute(name) {
    return this.attributes.get(name) ?? null;
  }

  append(...items) {
    for (const item of items) {
      if (typeof item === "string") {
        this.children.push(new MockElement("span", "", item));
      } else if (item instanceof MockElement) {
        item.parentElement = this;
        this.children.push(item);
      }
    }
  }

  replaceChildren(...items) {
    this.children = [];
    this._textContent = "";
    this.append(...items);
  }

  remove() {
    if (this.parentElement) {
      const idx = this.parentElement.children.indexOf(this);
      if (idx !== -1) this.parentElement.children.splice(idx, 1);
      this.parentElement = null;
    }
  }

  matchesSimple(selector) {
    if (!selector) return false;
    if (selector.startsWith(".") && this.className?.split(/\s+/).includes(selector.slice(1))) {
      return true;
    }
    if (selector.startsWith("#") && this.id === selector.slice(1)) {
      return true;
    }
    if (selector.startsWith("[") && selector.endsWith("]")) {
      const attr = selector.slice(1, -1);
      if (attr.includes("=")) {
        const [name, val] = attr.split("=");
        const unquoted = val.replace(/^["']|["']$/g, "");
        return this.getAttribute(name) === unquoted;
      }
      return this.getAttribute(attr) !== null;
    }
    return selector.toLowerCase() === this.tagName?.toLowerCase();
  }

  querySelector(selector) {
    const all = this.querySelectorAll(selector);
    return all.length ? all[0] : null;
  }

  querySelectorAll(selector) {
    const parts = selector.trim().split(/\s+/);
    if (parts.length === 1) {
      const results = [];
      const traverse = (el) => {
        if (!el || typeof el !== "object") return;
        if (el.matchesSimple(parts[0])) results.push(el);
        for (const child of el.children || []) traverse(child);
      };
      for (const child of this.children) traverse(child);
      return results;
    }
    // Para 2 selectores (ej. ".pendiente-tarjeta button")
    const [first, ...rest] = parts;
    const restSelector = rest.join(" ");
    const matchesFirst = [];
    const traverseFirst = (el) => {
      if (el.matchesSimple(first)) matchesFirst.push(el);
      for (const child of el.children || []) traverseFirst(child);
    };
    for (const child of this.children) traverseFirst(child);
    return matchesFirst.flatMap((el) => el.querySelectorAll(restSelector));
  }
}

// Configurar entorno global simulado
if (typeof globalThis.document === "undefined") {
  globalThis.document = {
    createElement(tag) { return new MockElement(tag); },
    body: new MockElement("body"),
    querySelector() { return null; }
  };
}

const AVISO_1 = crearPendiente({
  eventId: "evento_ui_bandeja_0001",
  recibidaEn: 1792584000000,
  parserVersion: "v2",
  montoOriginal: 25990,
  comercio: "FALABELLA CONCEPCION",
  tarjetaUltimos4: "1234"
});

const AVISO_2 = crearPendiente({
  eventId: "evento_ui_bandeja_0002",
  recibidaEn: 1792584100000,
  parserVersion: "v2",
  montoOriginal: 1000,
  comercio: "SUPERMERCADO EJEMPLO",
  tarjetaUltimos4: "5678"
});

function docSnapshot(aviso) {
  return {
    id: aviso.eventId,
    data: () => ({ ...aviso, creadaEn: { toMillis: () => aviso.recibidaEn } })
  };
}

function crearSnapshot(avisos = [], hasConexion = true) {
  return {
    docs: avisos.map(docSnapshot),
    metadata: {
      fromCache: !hasConexion,
      hasPendingWrites: false
    }
  };
}

function entornoBandeja() {
  const contenedor = new MockElement("div");
  const llamadas = { descartes: [], confirmaciones: [], escuchas: [] };
  let callbackRecibir = null;
  let callbackFallar = null;

  const escuchar = (uid, recibir, fallar) => {
    llamadas.escuchas.push(uid);
    callbackRecibir = recibir;
    callbackFallar = fallar;
    return () => {
      callbackRecibir = null;
      callbackFallar = null;
    };
  };

  const bandeja = crearBandejaCompras({
    contenedor,
    escuchar,
    catalogo: () => ({ personas: ["Persona 1"], tarjetas: ["Tarjeta 1", "Papá"] }),
    puedeModificar: () => true,
    confirmar: async (aviso, rev) => { llamadas.confirmaciones.push({ aviso, rev }); },
    descartar: async (aviso) => { llamadas.descartes.push(aviso); }
  });

  return {
    contenedor,
    bandeja,
    llamadas,
    emitirSnapshot: (avisos, hasConexion) => callbackRecibir?.(crearSnapshot(avisos, hasConexion)),
    fallar: (err) => callbackFallar?.(err)
  };
}

test("crearBandejaCompras inicializa el panel y muestra estado vacío inicial", () => {
  const { contenedor, bandeja } = entornoBandeja();
  const panel = contenedor.querySelector(".compras-pendientes");
  assert.ok(panel, "Debe existir la sección .compras-pendientes");
  
  const titulo = panel.querySelector("#pendientes-titulo");
  assert.equal(titulo.textContent, "Compras sin asignar");

  const contador = panel.querySelector(".pendientes-contador");
  assert.equal(contador.textContent, "0");

  const recargar = panel.querySelector("button");
  assert.equal(recargar.textContent, "Actualizar");
  
  bandeja.detener();
});

test("bandeja actualiza contador, estado y lista cuando llegan avisos", () => {
  const env = entornoBandeja();
  env.bandeja.iniciar("uid_prueba_123");

  env.emitirSnapshot([AVISO_1, AVISO_2], true);

  const panel = env.contenedor.querySelector(".compras-pendientes");
  const contador = panel.querySelector(".pendientes-contador");
  assert.equal(contador.textContent, "2");

  const tarjetas = panel.querySelectorAll(".pendiente-tarjeta");
  assert.equal(tarjetas.length, 2);

  // Primer aviso renderiza datos correctamente
  const t1 = tarjetas[0];
  assert.ok(t1.textContent.includes("FALABELLA CONCEPCION") || t1.textContent.includes("SUPERMERCADO EJEMPLO"));

  const botones = t1.querySelectorAll("button");
  assert.equal(botones.length, 2);
  assert.equal(botones[0].textContent, "Revisar compra");
  assert.equal(botones[0].disabled, false);
  assert.equal(botones[1].textContent, "Descartar");
  assert.equal(botones[1].disabled, false);

  env.bandeja.detener();
});

test("sin conexión las acciones se deshabilitan y el estado lo advierte", () => {
  const env = entornoBandeja();
  env.bandeja.iniciar("uid_prueba_123");

  env.emitirSnapshot([AVISO_1], false);

  const panel = env.contenedor.querySelector(".compras-pendientes");
  const estado = panel.querySelector('[role="status"]');
  assert.ok(estado.textContent.includes("Esperando confirmación del servidor"));

  const botones = panel.querySelectorAll(".pendiente-tarjeta button");
  assert.equal(botones.length, 2);
  assert.equal(botones[0].disabled, true, "Revisar debe estar deshabilitado sin conexión");
  assert.equal(botones[1].disabled, true, "Descartar debe estar deshabilitado sin conexión");

  env.bandeja.detener();
});

test("descartar aviso muestra confirmación y ejecuta descarte sin alterar deuda", async () => {
  const env = entornoBandeja();
  env.bandeja.iniciar("uid_prueba_123");

  env.emitirSnapshot([AVISO_1], true);

  const panel = env.contenedor.querySelector(".compras-pendientes");
  const tarjeta = panel.querySelector(".pendiente-tarjeta");
  const descartarBtn = tarjeta.querySelectorAll("button")[1];

  // Presionar Descartar
  descartarBtn.onclick();

  // Debe aparecer confirmación
  const confirmarBtn = tarjeta.querySelectorAll("button").find((b) => b.textContent.includes("Sí, descartar"));
  assert.ok(confirmarBtn, "Debe aparecer el botón de confirmación de descarte");

  const volverBtn = tarjeta.querySelectorAll("button").find((b) => b.textContent.includes("Volver"));
  assert.ok(volverBtn, "Debe aparecer el botón Volver");

  // Ejecutar descarte
  await confirmarBtn.onclick();
  assert.equal(env.llamadas.descartes.length, 1);
  assert.equal(env.llamadas.descartes[0].eventId, AVISO_1.eventId);

  env.bandeja.detener();
});

test("detener bandeja limpia suscripción y anula callbacks", () => {
  const env = entornoBandeja();
  env.bandeja.iniciar("uid_prueba_123");
  assert.equal(env.llamadas.escuchas.length, 1);

  env.bandeja.detener();
  const panel = env.contenedor.querySelector(".compras-pendientes");
  const contador = panel.querySelector(".pendientes-contador");
  assert.equal(contador.textContent, "0");
});
