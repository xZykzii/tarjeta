import { crearSuscripcionPendientes } from "./repositorio-pendientes.mjs";
import { abrirRevisionCompra, nodo, mensajeErrorRevision } from "./ui-revision-compra.mjs";

class BandejaCompras {
  constructor(opciones) {
    Object.assign(this, opciones);
    this.vista = { lista: [], hasConexion: false };
    this.revisionAbierta = null;
    this.isOperando = false;
    this.generacion = 0;
    this.crearPanel();
    this.suscripcion = crearSuscripcionPendientes({ escuchar: this.escuchar, alCambiar: (vista) => this.recibir(vista) });
    this.recargar.onclick = () => this.suscripcion.reintentar();
  }

  crearPanel() {
    const panel = nodo("section", "compras-pendientes");
    panel.setAttribute("aria-labelledby", "pendientes-titulo");
    const cabecera = nodo("div", "revision-head");
    const titulo = nodo("h2", "", "Compras sin asignar");
    titulo.id = "pendientes-titulo";
    this.contador = nodo("span", "pendientes-contador", "0");
    this.contador.setAttribute("aria-label", "Avisos cargados por revisar");
    this.recargar = nodo("button", "btn btn-sm", "Actualizar");
    this.recargar.type = "button";
    cabecera.append(titulo, this.contador, this.recargar);
    const ayuda = nodo("p", "revision-help", "Revisa cada aviso antes de convertirlo en deuda. Aquí no se suma a tus cuotas, saldos ni reportes.");
    this.estado = nodo("p", "revision-help");
    this.estado.setAttribute("role", "status");
    this.lista = nodo("div", "pendientes-lista");
    panel.append(cabecera, ayuda, this.estado, this.lista);
    this.contenedor.append(panel);
  }

  puedeResolver(aviso) {
    return this.vista.hasConexion && !this.isOperando && this.puedeModificar() &&
      this.vista.lista.some((actual) => JSON.stringify(actual) === JSON.stringify(aviso));
  }

  revisar(aviso) {
    if (!this.puedeResolver(aviso)) return;
    this.revisionAbierta = abrirRevisionCompra({
      aviso, catalogo: this.catalogo, puedeResolver: (actual) => this.puedeResolver(actual), confirmar: this.confirmar,
      alCerrar: () => { this.revisionAbierta = null; }
    });
  }

  descartarAviso(aviso, tarjeta) {
    if (!this.puedeResolver(aviso)) return;
    const aceptar = nodo("button", "btn", "Sí, descartar este aviso");
    const volver = nodo("button", "btn", "Volver");
    aceptar.type = volver.type = "button";
    const acciones = nodo("div", "revision-actions");
    acciones.append(nodo("p", "", "Descartar no cambia tus deudas y evita reenviar este aviso."), aceptar, volver);
    tarjeta.append(acciones);
    volver.onclick = () => this.renderLista();
    aceptar.onclick = () => this.ejecutarDescarte(aviso, aceptar, volver);
  }

  async ejecutarDescarte(aviso, aceptar, volver) {
    if (!this.puedeResolver(aviso)) return;
    this.isOperando = true;
    const actual = this.generacion;
    aceptar.disabled = volver.disabled = true;
    try { await this.descartar(aviso); }
    catch (error) {
      if (this.generacion === actual) this.estado.textContent = mensajeErrorRevision(error);
    } finally {
      if (this.generacion === actual) { this.isOperando = false; this.renderLista(); }
    }
  }

  tarjetaAviso(aviso) {
    const tarjeta = nodo("article", "pendiente-tarjeta");
    const monto = aviso.montoOriginal === null ? "Monto por completar" : `$${aviso.montoOriginal.toLocaleString("es-CL")}`;
    tarjeta.append(nodo("strong", "", `${monto} · ${aviso.comercio || "Comercio por completar"}`));
    const recibida = new Date(aviso.recibidaEn);
    const fecha = Number.isNaN(recibida.getTime()) ? "sin fecha de recepción utilizable" : recibida.toLocaleString("es-CL");
    tarjeta.append(nodo("p", "revision-help", `Recibido: ${fecha}. Terminación ${aviso.tarjetaUltimos4 || "sin informar"}. La recepción no es la fecha bancaria.`));
    const revisarBtn = nodo("button", "btn btn-primary", "Revisar compra");
    const descartarBtn = nodo("button", "btn", "Descartar");
    revisarBtn.type = descartarBtn.type = "button";
    revisarBtn.disabled = descartarBtn.disabled = !this.puedeResolver(aviso);
    revisarBtn.onclick = () => this.revisar(aviso);
    descartarBtn.onclick = () => { descartarBtn.disabled = true; this.descartarAviso(aviso, tarjeta); };
    const acciones = nodo("div", "revision-actions");
    acciones.append(revisarBtn, descartarBtn);
    tarjeta.append(acciones);
    return tarjeta;
  }

  renderLista() { this.lista.replaceChildren(...this.vista.lista.map((aviso) => this.tarjetaAviso(aviso))); }

  recibir(vista) {
    this.vista = vista;
    this.contador.textContent = `${vista.lista.length}${vista.hasLimite ? "+" : ""}`;
    this.estado.textContent = vista.hasError ? "No se pudo cargar la bandeja. Comprueba tu conexión y acceso, y vuelve a actualizar."
      : vista.hasCarga ? "Cargando avisos…"
      : !vista.hasConexion ? "Esperando confirmación del servidor. La revisión no se puede guardar sin conexión."
      : vista.hasLimite ? "Se muestran 100 avisos. Resuelve algunos para cargar los siguientes."
      : vista.lista.length ? "Avisos disponibles para revisar." : "No hay compras sin asignar.";
    this.recargar.disabled = vista.hasCarga || this.isOperando;
    this.renderLista();
    this.revisionAbierta?.actualizar();
  }

  iniciar(uid) {
    this.detener();
    this.suscripcion.iniciar(uid);
  }

  detener() {
    this.generacion++;
    this.revisionAbierta?.cerrar();
    this.revisionAbierta = null;
    this.isOperando = false;
    this.suscripcion.detener();
  }
}

export function crearBandejaCompras(opciones) {
  const bandeja = new BandejaCompras(opciones);
  return { iniciar: (uid) => bandeja.iniciar(uid), detener: () => bandeja.detener() };
}
