export function proximaFechaDia(hoy, dia) {
  const fecha = new Date(hoy.getFullYear(), hoy.getMonth(), dia);
  fecha.setHours(0, 0, 0, 0);
  const base = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
  if (fecha < base) fecha.setMonth(fecha.getMonth() + 1);
  return fecha;
}

export function proximosHitosCiclo(hoy, diaFacturacion, diaPago) {
  return {
    cierre: proximaFechaDia(hoy, diaFacturacion),
    pago: proximaFechaDia(hoy, diaPago)
  };
}

export function crearAgenda(items, estadoDe, limite = 3) {
  return items
    .map((item) => ({ item, estado: estadoDe(item) }))
    .filter(({ estado }) => estado.venc && estado.estado !== "completo")
    .sort((a, b) => {
      const aAtrasado = a.estado.estado === "atrasado" ? 0 : 1;
      const bAtrasado = b.estado.estado === "atrasado" ? 0 : 1;
      return aAtrasado - bAtrasado || a.estado.venc - b.estado.venc;
    })
    .slice(0, limite);
}

export function filtrarItems(items, texto, estado, estadoDe) {
  const termino = String(texto || "").toLowerCase().trim();
  return items.filter((item) => {
    const coincideTexto = !termino || `${item.persona} ${item.item} ${item.tarjeta}`.toLowerCase().includes(termino);
    const coincideEstado = !estado || estadoDe(item).estado === estado;
    return coincideTexto && coincideEstado;
  });
}

export function calcularMontoExigibleMes(item, hoy, vencimientoDe) {
  const monto = Math.max(0, Number(item.monto) || 0);
  const totales = Math.max(1, Number(item.totales) || 1);
  const pagadas = Math.max(0, Math.min(totales, Number(item.pagadas) || 0));
  const abonadoRegistrado = Number(item.abonado) || 0;
  const abonado = abonadoRegistrado > 0 && abonadoRegistrado < monto
    ? abonadoRegistrado
    : 0;
  if (pagadas >= totales || monto === 0) return 0;

  const fechaReferencia = hoy instanceof Date && !Number.isNaN(hoy.getTime())
    ? hoy
    : new Date();
  const finDeMes = new Date(
    fechaReferencia.getFullYear(),
    fechaReferencia.getMonth() + 1,
    0
  );
  let cuotasExigibles = 0;

  for (let numero = 1; numero <= totales; numero++) {
    const vencimiento = vencimientoDe(item.fechaCompra, numero);
    if (!(vencimiento instanceof Date) || Number.isNaN(vencimiento.getTime())) {
      return Math.max(0, monto - abonado);
    }
    if (vencimiento > finDeMes) break;
    cuotasExigibles = numero;
  }

  const cuotasPendientes = Math.max(0, cuotasExigibles - pagadas);
  return Math.max(0, cuotasPendientes * monto - abonado);
}

export function resumirTarjeta(items, estadoDe, pagadoDe) {
  return items.reduce((resumen, item) => {
    const totalContrato = Number(item.monto || 0) * Number(item.totales || 0);
    const pagado = pagadoDe(item);
    const pendiente = Math.max(0, Number(item.total) || 0);
    const estado = estadoDe(item);
    const completo = Number(item.pagadas || 0) >= Number(item.totales || 0);

    resumen.totalContrato += totalContrato;
    resumen.pagado += pagado;
    resumen.pendiente += pendiente;
    if (!completo) {
      const montoExigible = Number(estado.montoExigibleMes);
      resumen.mensual += Number.isFinite(montoExigible)
        ? Math.max(0, montoExigible)
        : Number(item.monto) || 0;
    }
    if (estado.estado === "atrasado") {
      resumen.atrasado += estado.montoAtrasado;
      resumen.itemsAtrasados++;
    }
    return resumen;
  }, {
    totalContrato: 0,
    pagado: 0,
    pendiente: 0,
    mensual: 0,
    atrasado: 0,
    itemsAtrasados: 0
  });
}

function crearFilaReporte(item, estadoDe, pagadoDe, incluyeIdentidad) {
  const estado = estadoDe(item);
  const totalContrato = Number(item.monto || 0) * Number(item.totales || 0);
  const fila = {
    item: String(item.item || "-"),
    tipo: item.pagoUnico ? "Pago único" : "Cuotas",
    montoCuota: Number(item.monto) || 0,
    cuotasPagadas: Number(item.pagadas) || 0,
    cuotasTotales: Number(item.totales) || 1,
    totalContrato,
    pagado: pagadoDe(item),
    pendiente: Math.max(0, Number(item.total) || 0),
    estado: estado.estado,
    vencimiento: estado.venc || null,
    montoAtrasado: Number(estado.montoAtrasado) || 0
  };
  if (incluyeIdentidad) {
    fila.persona = String(item.persona || "-");
    fila.tarjeta = String(item.tarjeta || "-");
  }
  return fila;
}

export function crearReportePersona(items, persona, estadoDe, pagadoDe) {
  const nombre = String(persona || "").trim();
  const pendientes = items.filter((item) => (
    item.persona === nombre && Math.max(0, Number(item.total) || 0) > 0
  ));
  return {
    persona: nombre,
    filas: pendientes.map((item) => crearFilaReporte(item, estadoDe, pagadoDe, false)),
    resumen: resumirTarjeta(pendientes, estadoDe, pagadoDe)
  };
}

export function crearReporteGeneral(items, estadoDe, pagadoDe) {
  return {
    filas: items.map((item) => crearFilaReporte(item, estadoDe, pagadoDe, true)),
    resumen: resumirTarjeta(items, estadoDe, pagadoDe)
  };
}
