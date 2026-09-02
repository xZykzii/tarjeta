const PDF_ORIENTATION = "landscape";
const PDF_UNIT = "mm";
const PDF_FORMAT = "a4";
const PAGE_MARGIN = 12;
const CONTENT_WIDTH = 273;
const HEADER_HEIGHT = 12;
const ROW_HEIGHT = 10;
const FOOTER_Y_OFFSET = 7;
const BODY_FONT_SIZE = 8;
const CELL_PADDING = 2;
const TEXT_COLOR = [24, 24, 27];
const MUTED_COLOR = [99, 99, 110];
const BRAND_COLOR = [98, 125, 0];
const HEADER_FILL = [36, 45, 0];
const ROW_ALT_FILL = [246, 246, 247];
const BORDER_COLOR = [212, 212, 216];
const MAX_FILENAME_LENGTH = 48;

function textoPdf(value) {
  return String(value ?? "-")
    .normalize("NFC")
    .replace(/[^\x20-\x7E\u00A0-\u00FF]/g, "-");
}

function moneda(value) {
  return `$${(Number(value) || 0).toLocaleString("es-CL")}`;
}

function fechaPdf(value) {
  if (!(value instanceof Date) || Number.isNaN(value.getTime())) return "Sin fecha";
  return new Intl.DateTimeFormat("es-CL", {
    day: "2-digit", month: "2-digit", year: "numeric"
  }).format(value);
}

function fechaGeneracion() {
  return new Intl.DateTimeFormat("es-CL", {
    day: "2-digit", month: "long", year: "numeric",
    hour: "2-digit", minute: "2-digit"
  }).format(new Date());
}

function nombreArchivo(value) {
  const limpio = String(value || "reporte")
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase().replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "").slice(0, MAX_FILENAME_LENGTH);
  return limpio || "reporte";
}

function estadoTexto(fila) {
  if (fila.estado === "atrasado") return `Atrasado (${moneda(fila.montoAtrasado)})`;
  if (fila.estado === "proximo") return "Vence pronto";
  if (fila.estado === "sinfecha") return "Sin fecha";
  if (fila.estado === "completo") return "Pagado";
  return "Al día";
}

function progresoTexto(fila) {
  if (fila.tipo === "Pago único") return fila.cuotasPagadas ? "Pagado" : "Pendiente";
  return `${fila.cuotasPagadas}/${fila.cuotasTotales}`;
}

function crearDocumento(JsPdf, titulo, subtitulo) {
  const doc = new JsPdf({ orientation: PDF_ORIENTATION, unit: PDF_UNIT, format: PDF_FORMAT });
  doc.setProperties({ title: textoPdf(titulo), subject: textoPdf(subtitulo), creator: "Control de cuotas" });
  doc.setTextColor(...TEXT_COLOR);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text(textoPdf(titulo), PAGE_MARGIN, 18);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...MUTED_COLOR);
  doc.text(textoPdf(subtitulo), PAGE_MARGIN, 25);
  doc.text(textoPdf(`Generado el ${fechaGeneracion()}`), PAGE_MARGIN, 30);
  doc.setDrawColor(...BRAND_COLOR);
  doc.setLineWidth(0.8);
  doc.line(PAGE_MARGIN, 32, PAGE_MARGIN + 24, 32);
  return doc;
}

function dibujarResumen(doc, resumen, etiquetas) {
  let x = PAGE_MARGIN;
  etiquetas.forEach(({ label, key, width }) => {
    doc.setFillColor(246, 246, 247);
    doc.roundedRect(x, 35, width - 3, 18, 2, 2, "F");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(...MUTED_COLOR);
    doc.text(textoPdf(label.toUpperCase()), x + 3, 41);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(...TEXT_COLOR);
    doc.text(moneda(resumen[key]), x + 3, 49);
    x += width;
  });
}

function dibujarCabeceraTabla(doc, columnas, y) {
  doc.setFillColor(...HEADER_FILL);
  doc.rect(PAGE_MARGIN, y, CONTENT_WIDTH, HEADER_HEIGHT, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.setTextColor(255, 255, 255);
  let x = PAGE_MARGIN;
  columnas.forEach((columna) => {
    const textX = columna.align === "right" ? x + columna.width - CELL_PADDING : x + CELL_PADDING;
    doc.text(textoPdf(columna.label), textX, y + 7.5, { align: columna.align || "left" });
    x += columna.width;
  });
  return y + HEADER_HEIGHT;
}

function recortarCelda(doc, valor, ancho) {
  const lineas = doc.splitTextToSize(textoPdf(valor), ancho);
  if (lineas.length <= 1) return lineas[0] || "";
  return `${lineas[0].slice(0, -3)}...`;
}

function dibujarFila(doc, columnas, fila, y, indice) {
  if (indice % 2) {
    doc.setFillColor(...ROW_ALT_FILL);
    doc.rect(PAGE_MARGIN, y, CONTENT_WIDTH, ROW_HEIGHT, "F");
  }
  doc.setDrawColor(...BORDER_COLOR);
  doc.line(PAGE_MARGIN, y + ROW_HEIGHT, PAGE_MARGIN + CONTENT_WIDTH, y + ROW_HEIGHT);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(BODY_FONT_SIZE);
  doc.setTextColor(...TEXT_COLOR);
  let x = PAGE_MARGIN;
  columnas.forEach((columna) => {
    const ancho = columna.width - (CELL_PADDING * 2);
    const corto = recortarCelda(doc, fila[columna.key], ancho);
    const textX = columna.align === "right" ? x + columna.width - CELL_PADDING : x + CELL_PADDING;
    doc.text(corto, textX, y + 6.5, { align: columna.align || "left" });
    x += columna.width;
  });
}

function dibujarTabla(doc, columnas, filas, mensajeVacio) {
  let y = dibujarCabeceraTabla(doc, columnas, 59);
  const pageHeight = doc.internal.pageSize.getHeight();
  filas.forEach((fila, indice) => {
    if (y + ROW_HEIGHT > pageHeight - PAGE_MARGIN) {
      doc.addPage();
      y = dibujarCabeceraTabla(doc, columnas, PAGE_MARGIN);
    }
    dibujarFila(doc, columnas, fila, y, indice);
    y += ROW_HEIGHT;
  });
  if (!filas.length) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(...MUTED_COLOR);
    doc.text(textoPdf(mensajeVacio), PAGE_MARGIN + 2, y + 8);
  }
}

function agregarPaginacion(doc) {
  const totalPaginas = doc.getNumberOfPages();
  for (let pagina = 1; pagina <= totalPaginas; pagina++) {
    doc.setPage(pagina);
    const pageHeight = doc.internal.pageSize.getHeight();
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(...MUTED_COLOR);
    doc.text(`Página ${pagina} de ${totalPaginas}`, PAGE_MARGIN + CONTENT_WIDTH, pageHeight - FOOTER_Y_OFFSET, { align: "right" });
  }
}

function filasPersona(reporte) {
  return reporte.filas.map((fila) => ({
    item: fila.item,
    tipo: fila.tipo === "Pago único" ? "Pago único" : `${moneda(fila.montoCuota)} x ${fila.cuotasTotales}`,
    progreso: progresoTexto(fila),
    vencimiento: fechaPdf(fila.vencimiento),
    estado: estadoTexto(fila),
    total: moneda(fila.totalContrato),
    pagado: moneda(fila.pagado),
    pendiente: moneda(fila.pendiente)
  }));
}

function filasGenerales(reporte) {
  return reporte.filas.map((fila) => ({
    persona: fila.persona,
    tarjeta: fila.tarjeta,
    item: fila.item,
    cuota: moneda(fila.montoCuota),
    progreso: progresoTexto(fila),
    vencimiento: `${fechaPdf(fila.vencimiento)} · ${estadoTexto(fila)}`,
    total: moneda(fila.totalContrato),
    pagado: moneda(fila.pagado),
    pendiente: moneda(fila.pendiente)
  }));
}

const COLUMNAS_PERSONA = [
  { key: "item", label: "Compra", width: 48 },
  { key: "tipo", label: "Plan", width: 38 },
  { key: "progreso", label: "Progreso", width: 24 },
  { key: "vencimiento", label: "Próximo pago", width: 32 },
  { key: "estado", label: "Estado", width: 41 },
  { key: "total", label: "Total", width: 28, align: "right" },
  { key: "pagado", label: "Pagado", width: 28, align: "right" },
  { key: "pendiente", label: "Pendiente", width: 34, align: "right" }
];

const COLUMNAS_GENERALES = [
  { key: "persona", label: "Persona", width: 30 },
  { key: "tarjeta", label: "Tarjeta", width: 29 },
  { key: "item", label: "Compra", width: 42 },
  { key: "cuota", label: "Cuota", width: 25, align: "right" },
  { key: "progreso", label: "Progreso", width: 20 },
  { key: "vencimiento", label: "Próximo pago / estado", width: 40 },
  { key: "total", label: "Total", width: 28, align: "right" },
  { key: "pagado", label: "Pagado", width: 28, align: "right" },
  { key: "pendiente", label: "Pendiente", width: 31, align: "right" }
];

const RESUMEN_PERSONA = [
  { label: "Pendiente", key: "pendiente", width: 55 },
  { label: "Cuota mensual", key: "mensual", width: 55 },
  { label: "Atrasado", key: "atrasado", width: 55 },
  { label: "Pagado", key: "pagado", width: 55 }
];

const RESUMEN_GENERAL = [
  { label: "Total comprometido", key: "totalContrato", width: 55 },
  { label: "Pagado", key: "pagado", width: 55 },
  { label: "Pendiente", key: "pendiente", width: 55 },
  { label: "Atrasado", key: "atrasado", width: 55 }
];

export function generarPdfPersona(JsPdf, reporte) {
  if (typeof JsPdf !== "function") throw new TypeError("El generador de PDF no está disponible.");
  const titulo = `Estado de deuda - ${reporte.persona || "Sin nombre"}`;
  const doc = crearDocumento(JsPdf, titulo, `Documento personal: solo incluye los compromisos de ${reporte.persona || "esta persona"}.`);
  dibujarResumen(doc, reporte.resumen, RESUMEN_PERSONA);
  dibujarTabla(doc, COLUMNAS_PERSONA, filasPersona(reporte), "No hay deudas pendientes para mostrar.");
  agregarPaginacion(doc);
  return { doc, filename: `deuda-${nombreArchivo(reporte.persona)}.pdf` };
}

export function generarPdfGeneral(JsPdf, reporte) {
  if (typeof JsPdf !== "function") throw new TypeError("El generador de PDF no está disponible.");
  const doc = crearDocumento(JsPdf, "Reporte general de cuotas", "Incluye todas las personas y tarjetas registradas.");
  dibujarResumen(doc, reporte.resumen, RESUMEN_GENERAL);
  dibujarTabla(doc, COLUMNAS_GENERALES, filasGenerales(reporte), "No hay registros para mostrar.");
  agregarPaginacion(doc);
  return { doc, filename: "reporte-general-cuotas.pdf" };
}
