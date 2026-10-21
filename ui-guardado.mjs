import { crearColaGuardado, validarDocumento } from "./persistencia-segura.mjs";
import { crearBackup } from "./datos-compras.mjs";

class ControlGuardado {
  constructor({ guardar, recargar, confirmarDescartar, alReintentarGuardado }) {
    this.guardarRemoto = guardar;
    this.recargar = recargar;
    this.confirmarDescartar = confirmarDescartar;
    this.alReintentarGuardado = alReintentarGuardado;
    this.contenido = document.getElementById("contenido");
    this.panel = document.getElementById("sync-panel");
    this.mensaje = document.getElementById("sync-message");
    this.detalle = document.getElementById("sync-detail");
    this.descargar = document.getElementById("sync-download");
    this.reintentar = document.getElementById("sync-retry");
    this.recargarBtn = document.getElementById("sync-reload");
    this.borradores = new Map();
    this.erroresPropios = new WeakSet();
    this.uidActivo = null;
    this.cola = null;
    this.generacion = 0;
    this.pendientes = 0;
    this.hasCarga = false;
    this.hasError = false;
    this.hasConflicto = false;
    this.debeDescartarAlCargar = false;
    this.descargar.addEventListener("click", () => this.descargarBorrador());
    this.reintentar.addEventListener("click", () => this.reintentarGuardado());
    this.recargarBtn.addEventListener("click", () => this.recargarGuardado());
    window.addEventListener("beforeunload", (event) => this.avisarCierre(event));
    window.addEventListener("unhandledrejection", (event) => this.capturarRechazo(event));
  }

  borradorActual() { return this.borradores.get(this.uidActivo); }

  actualizar() {
    const borrador = this.borradorActual();
    this.contenido.inert = this.hasCarga || this.hasError || this.pendientes > 0;
    this.panel.classList.toggle("hidden", !this.uidActivo || (!this.hasError && !borrador));
    this.descargar.disabled = !borrador;
    this.reintentar.disabled = !borrador || this.hasConflicto || this.pendientes > 0 || this.hasCarga;
    this.recargarBtn.disabled = this.pendientes > 0 || this.hasCarga;
    this.mensaje.textContent = this.hasConflicto
      ? "Hay cambios guardados en otro dispositivo."
      : this.hasError ? "No se pudieron guardar los cambios." : "Guardando cambios…";
    this.detalle.textContent = borrador
      ? "El borrador sigue en esta pestaña. Descárgalo antes de cerrar o recargar. No se ha confirmado su guardado."
      : "Puedes volver a cargar los datos cuando tengas conexión y una sesión válida.";
  }

  iniciar(uid) {
    this.cola?.invalidar();
    this.generacion++;
    this.uidActivo = uid;
    this.pendientes = 0;
    this.hasCarga = Boolean(uid);
    this.hasError = Boolean(this.borradorActual());
    this.hasConflicto = this.hasError;
    this.debeDescartarAlCargar = false;
    this.cola = uid ? crearColaGuardado((base, datos) => this.guardarRemoto(base, datos, uid)) : null;
    this.actualizar();
  }

  cargar(datos) {
    if (!this.cola) throw new Error("Inicia sesión antes de cargar los datos.");
    this.cola.cargar(datos);
    if (this.debeDescartarAlCargar) this.borradores.delete(this.uidActivo);
    this.debeDescartarAlCargar = false;
    this.hasCarga = false;
    this.hasError = Boolean(this.borradorActual());
    this.hasConflicto = this.hasError;
    this.actualizar();
  }

  registrarError(error, generacion = this.generacion) {
    if (error && typeof error === "object") this.erroresPropios.add(error);
    if (generacion !== this.generacion) return;
    this.hasCarga = false;
    this.hasError = true;
    this.debeDescartarAlCargar = false;
    this.hasConflicto = this.hasConflicto || error?.code === "conflicto_guardado";
    console.warn("No se guardaron los cambios de cuotas.", error?.code || error?.name || "error");
    this.actualizar();
  }

  async ejecutarGuardado(datos, isReintento = false) {
    if (!this.uidActivo || !this.cola) throw new Error("Inicia sesión antes de guardar.");
    if (this.hasError && !isReintento) throw new Error("Resuelve el guardado pendiente antes de continuar.");
    const uid = this.uidActivo;
    const generacion = this.generacion;
    const cola = this.cola;
    let borrador;
    try { borrador = { datos: validarDocumento(datos) }; }
    catch (error) { this.registrarError(error); throw error; }
    this.borradores.set(uid, borrador);
    this.pendientes++;
    this.actualizar();
    try {
      if (isReintento) await cola.reintentar(borrador.datos);
      else await cola.encolar(borrador.datos);
      if (generacion !== this.generacion) return;
      if (this.borradores.get(uid) === borrador) this.borradores.delete(uid);
      this.hasError = false;
      this.hasConflicto = false;
    } catch (error) {
      this.registrarError(error, generacion);
      throw error;
    } finally {
      if (generacion === this.generacion) { this.pendientes--; this.actualizar(); }
    }
  }

  descargarBorrador() {
    const borrador = this.borradorActual();
    if (!borrador) return;
    const contenido = JSON.stringify({ ...crearBackup(borrador.datos), esBorrador: true }, null, 2);
    const url = URL.createObjectURL(new Blob([contenido], { type: "application/json" }));
    const enlace = document.createElement("a");
    enlace.href = url;
    enlace.download = `cuotas-borrador-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.append(enlace);
    enlace.click();
    enlace.remove();
    URL.revokeObjectURL(url);
  }

  async recargarGuardado() {
    if (this.pendientes || this.hasCarga) return;
    if (this.borradorActual() && !await this.confirmarDescartar()) return;
    this.debeDescartarAlCargar = true;
    this.hasCarga = true;
    this.hasError = false;
    this.hasConflicto = false;
    this.actualizar();
    try { await this.recargar(); }
    catch (error) { this.registrarError(error); }
  }

  async reintentarGuardado() {
    const borrador = this.borradorActual();
    if (!borrador || this.hasConflicto || this.pendientes || this.hasCarga) return;
    try {
      await this.ejecutarGuardado(borrador.datos, true);
      this.alReintentarGuardado();
    }
    catch (error) { this.registrarError(error); }
  }

  async puedeCerrarSesion() {
    if (this.pendientes) return false;
    if (!this.borradorActual()) return true;
    if (!await this.confirmarDescartar()) return false;
    this.borradores.delete(this.uidActivo);
    return true;
  }

  async ejecutarOperacion(operacion) {
    if (!this.puedeModificar()) throw new Error("Resuelve el guardado pendiente antes de continuar.");
    const generacion = this.generacion;
    this.pendientes++;
    this.actualizar();
    try { return await this.cola.ejecutar(operacion); }
    catch (error) {
      this.registrarError(error, generacion);
      throw error;
    } finally {
      if (generacion === this.generacion) { this.pendientes--; this.actualizar(); }
    }
  }

  avisarCierre(event) {
    if (!this.borradores.size && !this.pendientes) return;
    event.preventDefault();
    event.returnValue = "";
  }

  capturarRechazo(event) {
    // save() lanza para impedir que las acciones continúen mostrando éxito.
    if (event.reason && this.erroresPropios.has(event.reason)) event.preventDefault();
  }

  puedeModificar() {
    return Boolean(this.uidActivo) && !this.hasCarga && !this.hasError && this.pendientes === 0;
  }
}

export function crearControlGuardado(opciones) {
  const control = new ControlGuardado(opciones);
  return {
    iniciar: (uid) => control.iniciar(uid),
    cargar: (datos) => control.cargar(datos),
    guardar: (datos) => control.ejecutarGuardado(datos),
    ejecutar: (operacion) => control.ejecutarOperacion(operacion),
    registrarError: (error) => control.registrarError(error),
    puedeModificar: () => control.puedeModificar(),
    puedeCerrarSesion: () => control.puedeCerrarSesion()
  };
}

// Los borradores se conservan solo en memoria y por cuenta. Nunca se escriben
// automáticamente en localStorage ni en un disco compartido. La descarga es
// explícita y queda identificada como borrador, compatible con backup v6.
// Un cambio de cuenta invalida la cola e impide mostrar el borrador a otro UID.
// Una recarga o cierre del navegador requiere exportar el borrador primero.
// La serialización local y las reglas de revisión son defensas complementarias:
// la cola ordena el mismo navegador; la transacción protege entre dispositivos.
