import { pendienteDesdeDocumento } from "./confirmacion-compras.mjs";

export const MAX_PENDIENTES_VISIBLES = 100;

export function escucharPendientes(sdk, uid, recibir, fallar) {
  if (typeof uid !== "string" || !uid || uid.includes("/")) throw new TypeError("Sesión inválida.");
  const consulta = sdk.query(sdk.collection(sdk.db, "users", uid, "comprasPendientes"),
    sdk.where("estado", "==", "sin_asignar"), sdk.limit(MAX_PENDIENTES_VISIBLES));
  return sdk.onSnapshot(consulta, { includeMetadataChanges: true }, recibir, fallar);
}

function leerSnapshot(snapshot) {
  if (!snapshot || !Array.isArray(snapshot.docs) || snapshot.docs.length > MAX_PENDIENTES_VISIBLES) {
    throw new TypeError("Respuesta de avisos inválida.");
  }
  const lista = snapshot.docs.map((doc) => pendienteDesdeDocumento(doc.id, doc.data()));
  if (lista.some((aviso) => aviso.estado !== "sin_asignar") ||
      new Set(lista.map((aviso) => aviso.eventId)).size !== lista.length) {
    throw new TypeError("Lista de avisos inconsistente.");
  }
  lista.sort((a, b) => b.recibidaEn - a.recibidaEn || a.eventId.localeCompare(b.eventId));
  return {
    lista, hasConexion: snapshot.metadata?.fromCache === false && snapshot.metadata?.hasPendingWrites === false,
    hasLimite: lista.length === MAX_PENDIENTES_VISIBLES, hasCarga: false, hasError: false
  };
}

/** Cada sesión tiene una generación; callbacks tardíos nunca cruzan cuentas. */
export function crearSuscripcionPendientes({ escuchar, alCambiar }) {
  let generacion = 0;
  let cancelar = null;
  let uidActivo = null;
  const vacio = () => ({ lista: [], hasCarga: false, hasConexion: false, hasError: false, hasLimite: false });

  function detener() {
    generacion++;
    cancelar?.();
    cancelar = null;
    uidActivo = null;
    alCambiar(vacio());
  }

  function iniciar(uid) {
    detener();
    if (!uid) return;
    uidActivo = uid;
    const actual = generacion;
    alCambiar({ ...vacio(), hasCarga: true });
    const fallar = (error) => {
      if (actual !== generacion) return;
      console.warn("No se pudo actualizar la bandeja de compras.", error?.code || error?.name || "error");
      alCambiar({ ...vacio(), hasError: true });
    };
    try {
      cancelar = escuchar(uid, (snapshot) => {
        if (actual !== generacion) return;
        try { alCambiar(leerSnapshot(snapshot)); }
        catch (error) { fallar(error); }
      }, fallar);
    } catch (error) { fallar(error); }
  }

  return { iniciar, detener, reintentar: () => iniciar(uidActivo) };
}
