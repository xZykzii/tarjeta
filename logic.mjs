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
    if (!completo) resumen.mensual += Number(item.monto) || 0;
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
