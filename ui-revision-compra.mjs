import { crearRepartoIgual, previsualizarReparto, MAX_PERSONAS_REPARTO } from "./reparto-compras.mjs";
import { validarRevisionCompra } from "./confirmacion-compras.mjs";
import { solicitarPlanCuotas, descripcionPlanCuotas } from "./ui-plan-cuotas.mjs";

const TARJETA_PREDETERMINADA = "Papá";
const ZONA_FECHA_DETECCION = "America/Santiago";

export function valoresInicialesRevision(aviso, tarjetas) {
  const fecha = aviso.fechaCompra;
  const parsed = typeof fecha === "string" && /^\d{4}-\d{2}-\d{2}$/.test(fecha)
    ? new Date(`${fecha}T00:00:00Z`) : null;
  const hasFechaBancaria = parsed && Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === fecha;
  let fechaCompra = hasFechaBancaria ? fecha : "";
  if (!hasFechaBancaria && Number.isSafeInteger(aviso.recibidaEn) && aviso.recibidaEn > 0) {
    const deteccion = new Date(aviso.recibidaEn);
    if (Number.isFinite(deteccion.getTime())) {
      const partes = Object.fromEntries(new Intl.DateTimeFormat("en-CA", {
        timeZone: ZONA_FECHA_DETECCION, year: "numeric", month: "2-digit", day: "2-digit"
      }).formatToParts(deteccion).map(({ type, value }) => [type, value]));
      fechaCompra = `${partes.year}-${partes.month}-${partes.day}`;
    }
  }
  return { fechaCompra, hasFechaBancaria: Boolean(hasFechaBancaria),
    tarjeta: tarjetas.includes(TARJETA_PREDETERMINADA) ? TARJETA_PREDETERMINADA : "",
    monto: Number.isSafeInteger(aviso.montoOriginal) && aviso.montoOriginal > 0 ? String(aviso.montoOriginal) : "" };
}

export function importeSugerido(actual, plan, hasEdicionManual) {
  return hasEdicionManual || !plan ? actual : String(plan.totalFinal);
}

export function nodo(tag, clase = "", texto = "") {
  const elemento = document.createElement(tag);
  elemento.className = clase;
  elemento.textContent = texto;
  return elemento;
}

export function mensajeErrorRevision(error) {
  if (error instanceof TypeError || error instanceof RangeError) return error.message;
  if (error?.code === "conflicto_guardado") return "Los datos cambiaron en otro dispositivo. Recarga y revisa de nuevo.";
  return "No se pudo completar la operación. Conserva esta revisión y comprueba la conexión o recarga los datos.";
}

function selector(opciones, etiqueta) {
  const select = nodo("select");
  select.setAttribute("aria-label", etiqueta);
  select.append(new Option(etiqueta, ""));
  opciones.forEach((opcion) => select.append(new Option(opcion, opcion)));
  return select;
}

function pesos(texto) {
  if (!/^\d+$/.test(texto)) throw new TypeError("Escribe importes enteros sin puntos ni separadores.");
  const valor = Number(texto);
  if (!Number.isSafeInteger(valor) || valor <= 0) throw new TypeError("Cada asignación debe ser un entero positivo.");
  return valor;
}

function plantilla() {
  const dialog = nodo("dialog", "revision-dialog");
  dialog.setAttribute("aria-labelledby", "revision-titulo");
  // Plantilla constante. Datos bancarios, catálogos y errores se insertan con textContent.
  dialog.innerHTML = `<form novalidate>
    <div class="revision-head"><div><p class="section-label">COMPRA POR REVISAR</p><h2 id="revision-titulo">Revisar y asignar</h2></div><button type="button" data-cerrar aria-label="Cerrar revisión">×</button></div>
    <p class="revision-origen" data-origen></p>
    <p class="revision-help">El aviso original se conserva. Las correcciones solo se aplican a la compra al confirmar.</p>
    <div class="revision-grid">
      <label>Descripción o comercio<input name="item" maxlength="200" autocomplete="off"></label>
      <label>Fecha de compra<input name="fechaCompra" type="date"></label>
      <label data-tarjeta>Tarjeta de tu registro</label>
    </div>
    <p class="revision-help" data-fecha-ayuda></p>
    <div class="revision-plan"><button class="btn" data-plan type="button">Configurar cuotas</button><p data-plan-text>Selecciona explícitamente la modalidad y el monto original.</p></div>
    <section data-individual class="revision-individual"><h3>Asignar a una persona</h3>
      <p class="revision-help">Asigna el total final a una persona. Puedes corregir el importe.</p>
      <div data-persona-unica class="revision-partes"></div></section>
    <details data-reparto class="revision-reparto"><summary>Repartir entre varias personas</summary>
      <div class="revision-head"><h3>Reparto entre personas</h3><button class="btn btn-sm" data-agregar type="button">＋ Persona</button></div>
      <p class="revision-help">Las partes deben sumar el total final, incluidos los intereses configurados. Al cerrar esta opción vuelves a una sola persona; tu reparto se conserva mientras esta revisión esté abierta.</p>
      <div data-partes class="revision-partes"></div>
      <div class="revision-actions"><button class="btn" data-igual type="button">Dividir en partes iguales</button><button class="btn" data-preview type="button">Verificar reparto y cuotas</button></div>
    </details>
    <p data-total aria-live="polite"></p><div data-preview-list class="revision-preview"></div>
    <p data-estado class="revision-help" role="status"></p><p data-error class="revision-error" role="alert"></p>
    <div class="revision-actions revision-footer"><button class="btn" type="button" data-cancelar>Volver sin guardar</button><button class="btn btn-primary" type="submit" data-confirmar>Confirmar compra</button></div>
    </form>`;
  return dialog;
}

function filaPersona(catalogo, alCambiar, alEliminar, isIndividual = false) {
  const fila = nodo("div", "revision-parte");
  const persona = selector(catalogo, "Selecciona persona");
  const monto = nodo("input");
  monto.inputMode = "numeric";
  monto.placeholder = "Importe en pesos";
  monto.setAttribute("aria-label", isIndividual ? "Importe en pesos" : "Importe de esta persona");
  const eliminar = nodo("button", "btn", "Quitar");
  eliminar.type = "button";
  eliminar.hidden = isIndividual;
  eliminar.onclick = () => { fila.remove(); alEliminar(); };
  persona.onchange = alCambiar;
  monto.oninput = () => { monto.dataset.hasEdicionManual = "true"; alCambiar(); };
  const etiquetaPersona = nodo("label", "", "Persona");
  const etiquetaMonto = nodo("label", "", "Importe en pesos");
  etiquetaPersona.append(persona);
  etiquetaMonto.append(monto);
  fila.append(etiquetaPersona, etiquetaMonto, eliminar);
  return fila;
}

function camposRevision(dialog, plan) {
  const contenedor = dialog.querySelector(dialog.querySelector("[data-reparto]").open ? "[data-partes]" : "[data-persona-unica]");
  return {
    item: dialog.querySelector('[name="item"]').value,
    fechaCompra: dialog.querySelector('[name="fechaCompra"]').value,
    tarjeta: dialog.querySelector("[data-tarjeta] select").value,
    planCuotas: plan,
    asignaciones: [...contenedor.querySelectorAll(".revision-parte")].map((fila) => ({
      persona: fila.querySelector("select").value, monto: pesos(fila.querySelector("input").value.trim())
    }))
  };
}

function mostrarCuotas(dialog, revision) {
  const lista = dialog.querySelector("[data-preview-list]");
  lista.replaceChildren();
  previsualizarReparto(revision.planCuotas, revision.asignaciones).forEach((parte) => {
    const fila = nodo("div", "revision-cuotas");
    fila.append(nodo("strong", "", `${parte.persona} · $${parte.monto.toLocaleString("es-CL")}`),
      nodo("p", "", `Cuotas: ${parte.cuotas.map((valor) => `$${valor.toLocaleString("es-CL")}`).join(" · ")}`));
    lista.append(fila);
  });
}

class RevisionCompra {
  constructor(opciones) {
    Object.assign(this, opciones);
    this.dialog = plantilla();
    this.plan = null;
    this.hasGuardado = false;
    this.hasPreview = false;
    this.error = this.q("[data-error]");
    this.estado = this.q("[data-estado]");
    this.partes = this.q("[data-partes]");
    this.iniciar();
  }

  q(selector) { return this.dialog.querySelector(selector); }

  iniciar() {
    this.q("[data-tarjeta]").append(selector(this.catalogo().tarjetas, "Selecciona tarjeta"));
    const iniciales = valoresInicialesRevision(this.aviso, this.catalogo().tarjetas);
    this.q('[name="item"]').value = this.aviso.comercio || "";
    this.q('[name="fechaCompra"]').value = iniciales.fechaCompra;
    this.q("[data-tarjeta] select").value = iniciales.tarjeta;
    this.q("[data-fecha-ayuda]").textContent = iniciales.hasFechaBancaria
      ? "Fecha informada por el aviso. Puedes corregirla."
      : "Fecha sugerida según la detección del aviso en horario de Chile. Puedes corregirla.";
    const original = this.aviso.montoOriginal === null ? "importe no informado" : `$${this.aviso.montoOriginal.toLocaleString("es-CL")}`;
    this.q("[data-origen]").textContent = `Aviso original: ${original} · ${this.aviso.comercio || "comercio no informado"} · terminación ${this.aviso.tarjetaUltimos4 || "no informada"}.`;
    this.enlazar();
    document.body.append(this.dialog);
    const individual = filaPersona(this.catalogo().personas, () => this.invalidar(), () => {}, true);
    individual.querySelector("input").value = iniciales.monto;
    this.q("[data-persona-unica]").append(individual);
    this.invalidar();
    this.dialog.showModal();
    this.q('[name="item"]').focus();
  }

  enlazar() {
    this.q("form").addEventListener("input", () => this.invalidar());
    this.q("form").addEventListener("change", () => this.invalidar());
    this.q("form").addEventListener("submit", (event) => this.guardar(event));
    this.q("[data-agregar]").onclick = () => this.agregar();
    this.q("[data-plan]").onclick = () => this.configurar();
    this.q("[data-igual]").onclick = () => this.igualar();
    this.q("[data-preview]").onclick = () => this.preview();
    this.q("[data-reparto]").ontoggle = () => this.cambiarReparto();
    this.dialog.querySelectorAll("[data-cerrar], [data-cancelar]").forEach((btn) => {
      btn.onclick = () => this.dialog.close();
    });
    this.dialog.addEventListener("cancel", (event) => { if (this.hasGuardado) event.preventDefault(); });
    this.dialog.addEventListener("close", () => { this.dialog.remove(); this.alCerrar(); }, { once: true });
  }

  actualizar() {
    if (!this.dialog.isConnected) return;
    const puede = this.puedeResolver(this.aviso) && !this.hasGuardado;
    const validado = this.q("[data-reparto]").open ? "Reparto verificado." : "Datos y cuotas verificados.";
    this.q("[data-confirmar]").disabled = !puede || !this.hasPreview;
    this.estado.textContent = this.hasGuardado ? "Guardando la compra completa…" : !puede
      ? "Conecta y actualiza la bandeja para confirmar. Si el aviso fue resuelto, vuelve a la lista."
      : this.hasPreview ? `${validado} Confirmar guardará la compra completa.`
      : this.q("[data-reparto]").open ? "Verifica el reparto antes de confirmar. Hasta entonces no se crea deuda."
      : "Selecciona la persona y configura las cuotas. Confirma solo cuando los datos estén correctos.";
    this.q("[data-agregar]").disabled = this.hasGuardado || this.partes.children.length >= MAX_PERSONAS_REPARTO;
    this.dialog.querySelectorAll("[data-cerrar], [data-cancelar]").forEach((btn) => { btn.disabled = this.hasGuardado; });
  }

  invalidar() {
    this.hasPreview = false;
    this.error.textContent = "";
    this.q("[data-preview-list]").replaceChildren();
    this.q("[data-total]").textContent = this.plan ? descripcionPlanCuotas(this.plan) : "Configura primero las cuotas.";
    if (!this.q("[data-reparto]").open && this.plan) this.validarIndividual();
    this.actualizar();
  }

  validarIndividual() {
    try {
      const revision = validarRevisionCompra(camposRevision(this.dialog, this.plan), this.catalogo());
      mostrarCuotas(this.dialog, revision);
      this.hasPreview = true;
    } catch (error) {
      this.error.textContent = mensajeErrorRevision(error);
    }
  }

  cambiarReparto() {
    const isMultiple = this.q("[data-reparto]").open;
    this.q("[data-individual]").hidden = isMultiple;
    if (isMultiple && !this.partes.children.length) {
      this.agregar();
      this.partes.querySelector("select").value = this.q("[data-persona-unica] select").value;
      const monto = this.partes.querySelector("input");
      const individual = this.q("[data-persona-unica] input");
      monto.value = individual.value;
      monto.dataset.hasEdicionManual = individual.dataset.hasEdicionManual || "false";
    }
    this.actualizarImportes();
    this.invalidar();
  }

  actualizarImportes() {
    for (const contenedor of [this.q("[data-persona-unica]"), this.partes]) {
      if (contenedor.children.length !== 1) continue;
      const monto = contenedor.querySelector("input");
      monto.value = importeSugerido(monto.value, this.plan, monto.dataset.hasEdicionManual === "true");
    }
  }

  agregar() {
    if (this.partes.children.length >= MAX_PERSONAS_REPARTO || this.hasGuardado) return;
    this.partes.append(filaPersona(this.catalogo().personas, () => this.invalidar(), () => this.invalidar()));
    this.invalidar();
  }

  preview() {
    this.invalidar();
    try {
      if (!this.plan) throw new TypeError("Configura explícitamente las cuotas antes de confirmar.");
      const revision = validarRevisionCompra(camposRevision(this.dialog, this.plan), this.catalogo());
      mostrarCuotas(this.dialog, revision);
      this.hasPreview = true;
      this.actualizar();
      return revision;
    } catch (error) { this.error.textContent = mensajeErrorRevision(error); return null; }
  }

  async configurar() {
    try {
      const textoMonto = this.q("[data-persona-unica] input").value.trim();
      const montoInicial = !this.plan && !this.q("[data-reparto]").open
        ? textoMonto ? pesos(textoMonto) : null : this.aviso.montoOriginal;
      const elegido = await solicitarPlanCuotas({ planInicial: this.plan, montoInicial, debeElegirModalidad: true });
      if (!elegido || !this.dialog.isConnected || this.hasGuardado) return;
      this.plan = elegido;
      this.q("[data-plan-text]").textContent = descripcionPlanCuotas(this.plan);
      this.actualizarImportes();
      this.invalidar();
    } catch (error) { this.error.textContent = mensajeErrorRevision(error); }
  }

  igualar() {
    try {
      if (!this.plan) throw new TypeError("Configura primero las cuotas.");
      const filas = [...this.partes.children];
      const reparto = crearRepartoIgual(this.plan.totalFinal, filas.map((fila) => fila.querySelector("select").value));
      reparto.forEach((parte, indice) => {
        filas[indice].querySelector("input").value = parte.monto;
        filas[indice].querySelector("input").dataset.hasEdicionManual = "true";
      });
      this.invalidar();
    } catch (error) { this.error.textContent = mensajeErrorRevision(error); }
  }

  async guardar(event) {
    event.preventDefault();
    if (this.hasGuardado || !this.puedeResolver(this.aviso)) return;
    const revision = this.preview();
    if (!revision) return;
    this.hasGuardado = true;
    this.q("form").inert = true;
    this.actualizar();
    try { await this.confirmar(this.aviso, revision); this.dialog.close(); }
    catch (error) { this.error.textContent = mensajeErrorRevision(error); }
    finally { this.hasGuardado = false; this.q("form").inert = false; this.actualizar(); }
  }
}

export function abrirRevisionCompra(opciones) {
  document.querySelector(".revision-dialog")?.close();
  const revision = new RevisionCompra(opciones);
  return { actualizar: () => revision.actualizar(), cerrar: () => revision.dialog.close() };
}
