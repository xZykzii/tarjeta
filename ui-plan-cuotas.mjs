import { crearPlanCuotas, validarPlanCuotas, MAX_CUOTAS } from "./planes-cuotas.mjs";

const MAX_CUOTAS_TEXT = 6000;
const INPUTS = ["modalidad", "montoOriginal", "numeroCuotas", "valorCuota", "cuotasTexto"];

function enteroDeTexto(value, nombre) {
  const texto = String(value ?? "").trim();
  if (!/^\d+$/.test(texto)) throw new TypeError(`${nombre}: usa pesos enteros sin puntos ni separadores de miles.`);
  const numero = Number(texto);
  if (!Number.isSafeInteger(numero) || numero <= 0) throw new TypeError(`${nombre}: ingresa un entero positivo.`);
  return numero;
}

/** Puerto puro para validar la entrada completa antes de crear deuda. */
export function planDesdeEntrada(entrada) {
  if (!entrada || typeof entrada !== "object") throw new TypeError("Completa el plan de cuotas.");
  const modalidad = entrada.modalidad;
  const config = {
    modalidad,
    montoOriginal: enteroDeTexto(entrada.montoOriginal, "Monto original"),
    numeroCuotas: modalidad === "una_cuota" ? 1 : enteroDeTexto(entrada.numeroCuotas, "Número de cuotas")
  };
  if (modalidad === "interes_manual") config.valorCuota = enteroDeTexto(entrada.valorCuota, "Valor por cuota");
  if (modalidad === "personalizadas") config.cuotas = importesDeTexto(entrada.cuotasTexto);
  return crearPlanCuotas(config);
}

function importesDeTexto(value) {
  if (typeof value !== "string" || value.length > MAX_CUOTAS_TEXT || !value.trim()) {
    throw new TypeError("Escribe los importes de todas las cuotas.");
  }
  return value.trim().split(/[,;\n]+/).map((texto) => enteroDeTexto(texto, "Cuota"));
}

function moneda(value) { return `$${value.toLocaleString("es-CL")}`; }

export function descripcionPlanCuotas(value) {
  const plan = validarPlanCuotas(value);
  return `Original ${moneda(plan.montoOriginal)} · total final ${moneda(plan.totalFinal)} · diferencia por financiamiento ${moneda(plan.interesesTotales)}.`;
}

function elemento(tag, clase = "", texto = "") {
  const node = document.createElement(tag);
  node.className = clase;
  node.textContent = texto;
  return node;
}

function crearDialogo() {
  const dialog = elemento("dialog", "plan-dialog");
  dialog.setAttribute("aria-labelledby", "plan-titulo");
  // Plantilla estática: todos los importes y mensajes se asignan con textContent/value.
  dialog.innerHTML = `
    <form novalidate>
      <h2 id="plan-titulo">Total y plan de cuotas</h2>
      <p class="plan-intro">Revisa todos los importes antes de usarlos. Configurar el plan todavía no registra la compra.</p>
      <div class="plan-controls">
        <label>Modalidad<select name="modalidad" class="modal-input">
          <option value="una_cuota">Una cuota</option>
          <option value="sin_interes" selected>Cuotas sin interés</option>
          <option value="interes_manual">Interés manual: valor por cuota</option>
          <option value="personalizadas">Cuotas de distinto valor</option>
        </select></label>
        <label>Monto original de la compra<input name="montoOriginal" class="modal-input" inputmode="numeric" autocomplete="off" placeholder="1000"></label>
        <label>Número de cuotas<input name="numeroCuotas" class="modal-input" type="number" min="1" step="1" value="3"></label>
        <label data-field="manual" hidden>Valor de cada cuota<input name="valorCuota" class="modal-input" inputmode="numeric" autocomplete="off" placeholder="400"></label>
        <label data-field="personalizadas" class="plan-span" hidden>Importes de las cuotas<textarea name="cuotasTexto" class="modal-input" rows="3" placeholder="400, 350, 300"></textarea>
          <small>En orden de vencimiento, separados por coma o salto de línea. Sin puntos de miles.</small></label>
      </div>
      <p class="plan-intro" data-note></p>
      <p class="plan-error" data-error role="status"></p>
      <section class="plan-preview" aria-label="Previsualización del plan">
        <p data-summary></p><ol data-installments aria-label="Importes por cuota"></ol>
      </section>
      <div class="modal-actions"><button type="button" class="btn btn-ghost" data-cancel>Cancelar</button>
        <button type="submit" class="btn btn-primary" data-apply disabled>Usar este plan</button></div>
    </form>`;
  dialog.querySelector('[name="numeroCuotas"]').max = MAX_CUOTAS;
  dialog.querySelector('[name="cuotasTexto"]').maxLength = MAX_CUOTAS_TEXT;
  return dialog;
}

function rellenarPlan(dialog, input) {
  if (!input) return;
  const plan = validarPlanCuotas(input);
  const values = {
    modalidad: plan.modalidad, montoOriginal: plan.montoOriginal,
    numeroCuotas: plan.cuotas.length, valorCuota: plan.cuotas[0], cuotasTexto: plan.cuotas.join(", ")
  };
  for (const campo of INPUTS) dialog.querySelector(`[name="${campo}"]`).value = values[campo];
}

function entradaDeDialogo(dialog) {
  return Object.fromEntries(INPUTS.map((campo) => [campo, dialog.querySelector(`[name="${campo}"]`).value]));
}

function actualizarCampos(dialog) {
  const modalidad = dialog.querySelector('[name="modalidad"]').value;
  const numero = dialog.querySelector('[name="numeroCuotas"]');
  numero.disabled = modalidad === "una_cuota";
  if (numero.disabled) numero.value = "1";
  dialog.querySelector('[data-field="manual"]').hidden = modalidad !== "interes_manual";
  dialog.querySelector('[data-field="personalizadas"]').hidden = modalidad !== "personalizadas";
  dialog.querySelector("[data-note]").textContent = modalidad === "interes_manual"
    ? "Introduce el importe mensual informado. Se muestra la diferencia total; no se calcula ni se supone una tasa."
    : modalidad === "sin_interes"
      ? "Los pesos sobrantes se asignan a las primeras cuotas; la suma conserva el monto original."
      : "El total final debe cubrir el monto original. Las devoluciones se revisan por separado.";
}

function dibujarPlan(dialog, plan) {
  dialog.querySelector("[data-summary]").textContent = descripcionPlanCuotas(plan);
  const cuotas = plan.cuotas.map((monto, indice) => elemento("li", "", `Cuota ${indice + 1}: ${moneda(monto)}`));
  dialog.querySelector("[data-installments]").replaceChildren(...cuotas);
}

function actualizarPreview(dialog) {
  actualizarCampos(dialog);
  const errorNode = dialog.querySelector("[data-error]");
  const apply = dialog.querySelector("[data-apply]");
  try {
    const plan = planDesdeEntrada(entradaDeDialogo(dialog));
    dibujarPlan(dialog, plan);
    errorNode.textContent = "";
    apply.disabled = false;
    return plan;
  } catch (error) {
    errorNode.textContent = error instanceof TypeError || error instanceof RangeError
      ? error.message : "No se pudo calcular el plan. Revisa los importes.";
    if (!(error instanceof TypeError || error instanceof RangeError)) console.error("Falló el plan de cuotas:", error);
    apply.disabled = true;
    dialog.querySelector("[data-summary]").textContent = "Completa los campos para previsualizar.";
    dialog.querySelector("[data-installments]").replaceChildren();
    return null;
  }
}

/** Diálogo reutilizable por el alta manual y la futura revisión de pendientes. */
export function solicitarPlanCuotas({ planInicial = null, montoInicial = null } = {}) {
  if (document.querySelector(".plan-dialog")) return Promise.resolve(null);
  const dialog = crearDialogo();
  rellenarPlan(dialog, planInicial);
  if (!planInicial && Number.isSafeInteger(montoInicial) && montoInicial > 0) {
    dialog.querySelector('[name="montoOriginal"]').value = montoInicial;
  }
  document.body.append(dialog);
  actualizarPreview(dialog);
  return new Promise((resolve) => {
    let resultado = null;
    dialog.addEventListener("input", () => actualizarPreview(dialog));
    dialog.addEventListener("change", () => actualizarPreview(dialog));
    dialog.querySelector("[data-cancel]").addEventListener("click", () => dialog.close());
    dialog.querySelector("form").addEventListener("submit", (event) => {
      event.preventDefault();
      const plan = actualizarPreview(dialog);
      if (!plan) return;
      resultado = plan;
      dialog.close();
    });
    dialog.addEventListener("close", () => {
      dialog.remove();
      resolve(resultado);
    }, { once:true });
    dialog.showModal();
    dialog.querySelector('[name="montoOriginal"]').focus();
  });
}

// No se almacenan importes, no se crean personas ni se elige tarjeta aquí.
// El resultado se aplica al formulario y solo guardar crea la compra.
// Cancelar o Escape conserva el plan anterior y nunca persiste un borrador.
// Los registros históricos mantienen su entrada habitual por valor de cuota;
// esta interfaz exige introducir explícitamente el original y su modalidad.
