import { crearRepartoIgual, previsualizarReparto, MAX_PERSONAS_REPARTO } from "./reparto-compras.mjs";
import { validarRevisionCompra } from "./confirmacion-compras.mjs";
import { solicitarPlanCuotas, descripcionPlanCuotas } from "./ui-plan-cuotas.mjs";

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
    <p class="revision-help">El aviso original se conserva. Las correcciones solo se aplican a la compra al confirmar. No se deducen cuotas ni fecha bancaria.</p>
    <div class="revision-grid">
      <label>Descripción o comercio<input name="item" maxlength="200" autocomplete="off"></label>
      <label>Fecha de compra<input name="fechaCompra" type="date"></label>
      <label data-tarjeta>Tarjeta de tu registro</label>
    </div>
    <div class="revision-plan"><button class="btn" data-plan type="button">Configurar cuotas</button><p data-plan-text>Selecciona explícitamente la modalidad y el monto original.</p></div>
    <div class="revision-head"><h3>Reparto entre personas</h3><button class="btn btn-sm" data-agregar type="button">＋ Persona</button></div>
    <p class="revision-help">Puedes asignar el total a una persona o elegir importes libres. Las partes deben sumar el total final, incluidos los intereses que ingreses.</p>
    <div data-partes class="revision-partes"></div>
    <div class="revision-actions"><button class="btn" data-igual type="button">Dividir en partes iguales</button><button class="btn" data-preview type="button">Verificar reparto y cuotas</button></div>
    <p data-total aria-live="polite"></p><div data-preview-list class="revision-preview"></div>
    <p data-estado class="revision-help" role="status"></p><p data-error class="revision-error" role="alert"></p>
    <div class="revision-actions revision-footer"><button class="btn" type="button" data-cancelar>Volver sin guardar</button><button class="btn btn-primary" type="submit" data-confirmar>Confirmar compra</button></div>
    </form>`;
  return dialog;
}

function filaPersona(catalogo, alCambiar, alEliminar) {
  const fila = nodo("div", "revision-parte");
  const persona = selector(catalogo, "Selecciona persona");
  const monto = nodo("input");
  monto.inputMode = "numeric";
  monto.placeholder = "Importe en pesos";
  monto.setAttribute("aria-label", "Importe de esta persona");
  const eliminar = nodo("button", "btn", "Quitar");
  eliminar.type = "button";
  eliminar.onclick = () => { fila.remove(); alEliminar(); };
  persona.onchange = alCambiar;
  monto.oninput = alCambiar;
  fila.append(persona, monto, eliminar);
  return fila;
}

function camposRevision(dialog, plan) {
  return {
    item: dialog.querySelector('[name="item"]').value,
    fechaCompra: dialog.querySelector('[name="fechaCompra"]').value,
    tarjeta: dialog.querySelector("[data-tarjeta] select").value,
    planCuotas: plan,
    asignaciones: [...dialog.querySelectorAll(".revision-parte")].map((fila) => ({
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
    this.q('[name="item"]').value = this.aviso.comercio || "";
    this.q('[name="fechaCompra"]').value = this.aviso.fechaCompra || "";
    const original = this.aviso.montoOriginal === null ? "importe no informado" : `$${this.aviso.montoOriginal.toLocaleString("es-CL")}`;
    this.q("[data-origen]").textContent = `Aviso original: ${original} · ${this.aviso.comercio || "comercio no informado"} · terminación ${this.aviso.tarjetaUltimos4 || "no informada"}.`;
    this.enlazar();
    document.body.append(this.dialog);
    this.agregar();
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
    this.dialog.querySelectorAll("[data-cerrar], [data-cancelar]").forEach((btn) => {
      btn.onclick = () => this.dialog.close();
    });
    this.dialog.addEventListener("cancel", (event) => { if (this.hasGuardado) event.preventDefault(); });
    this.dialog.addEventListener("close", () => { this.dialog.remove(); this.alCerrar(); }, { once: true });
  }

  actualizar() {
    if (!this.dialog.isConnected) return;
    const puede = this.puedeResolver(this.aviso) && !this.hasGuardado;
    this.q("[data-confirmar]").disabled = !puede || !this.hasPreview;
    this.estado.textContent = this.hasGuardado ? "Guardando la compra completa…" : !puede
      ? "Conecta y actualiza la bandeja para confirmar. Si el aviso fue resuelto, vuelve a la lista."
      : this.hasPreview ? "Reparto verificado. Confirmar guardará la compra completa."
      : "Verifica el reparto antes de confirmar. Hasta entonces no se crea deuda.";
    this.q("[data-agregar]").disabled = this.hasGuardado || this.partes.children.length >= MAX_PERSONAS_REPARTO;
    this.dialog.querySelectorAll("[data-cerrar], [data-cancelar]").forEach((btn) => { btn.disabled = this.hasGuardado; });
  }

  invalidar() {
    this.hasPreview = false;
    this.error.textContent = "";
    this.q("[data-preview-list]").replaceChildren();
    this.q("[data-total]").textContent = this.plan ? descripcionPlanCuotas(this.plan) : "Configura primero las cuotas.";
    this.actualizar();
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
      const elegido = await solicitarPlanCuotas({ planInicial: this.plan, montoInicial: this.aviso.montoOriginal, debeElegirModalidad: true });
      if (!elegido || !this.dialog.isConnected || this.hasGuardado) return;
      this.plan = elegido;
      this.q("[data-plan-text]").textContent = descripcionPlanCuotas(this.plan);
      if (this.partes.children.length === 1) this.partes.querySelector("input").value = this.plan.totalFinal;
      this.invalidar();
    } catch (error) { this.error.textContent = mensajeErrorRevision(error); }
  }

  igualar() {
    try {
      if (!this.plan) throw new TypeError("Configura primero las cuotas.");
      const filas = [...this.partes.children];
      const reparto = crearRepartoIgual(this.plan.totalFinal, filas.map((fila) => fila.querySelector("select").value));
      reparto.forEach((parte, indice) => { filas[indice].querySelector("input").value = parte.monto; });
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
