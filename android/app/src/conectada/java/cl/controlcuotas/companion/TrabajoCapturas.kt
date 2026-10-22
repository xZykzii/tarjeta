package cl.controlcuotas.companion

import android.content.Context
import android.util.Log
import androidx.work.BackoffPolicy
import androidx.work.Constraints
import androidx.work.Data
import androidx.work.ExistingWorkPolicy
import androidx.work.NetworkType
import androidx.work.OneTimeWorkRequestBuilder
import androidx.work.OneTimeWorkRequest
import androidx.work.Operation
import androidx.work.WorkManager
import androidx.work.Worker
import androidx.work.WorkerParameters
import com.google.android.gms.tasks.Tasks
import com.google.firebase.firestore.FieldValue
import com.google.firebase.firestore.FirebaseFirestoreException
import java.util.concurrent.TimeUnit

private const val MAX_LOTE_ENVIO = 10
private const val TIMEOUT_ENVIO_SEGUNDOS = 20L
private const val BACKOFF_SEGUNDOS = 30L
private const val INPUT_UID = "uid_propietario"
private val ESTADOS_SERVIDOR = setOf("sin_asignar", "confirmada", "descartada")

class TrabajoCapturas(context: Context, params: WorkerParameters) : Worker(context, params) {
    override fun doWork(): Result {
        val uid = inputData.getString(INPUT_UID) ?: return Result.failure()
        if (!ConexionFirebase.iniciar(applicationContext) ||
            !ConexionFirebase.puedeEnviar(applicationContext, uid)) return Result.failure()
        return try {
            val dao = ConexionFirebase.db(applicationContext).capturas()
            for (captura in dao.lote(uid, MAX_LOTE_ENVIO)) {
                if (isStopped || !ConexionFirebase.puedeEnviar(applicationContext, uid)) return Result.failure()
                enviar(captura)
                dao.enviada(uid, captura.eventId)
                if (!ConexionFirebase.puedeEnviar(applicationContext, uid)) return Result.failure()
            }
            ConexionFirebase.error(applicationContext, uid, "")
            if (dao.pendientes(uid) > 0 && ConexionFirebase.puedeEnviar(applicationContext, uid)) {
                solicitar(applicationContext, uid)
            }
            Result.success()
        } catch (error: Exception) {
            tratarError(uid, error)
        }
    }

    private fun enviar(captura: ColaDatabase.Captura) {
        val ref = ConexionFirebase.remoto().collection("users").document(captura.uid)
            .collection("comprasPendientes").document(captura.eventId)
        val payload = payloadDeCaptura(captura)
        val tarea = ConexionFirebase.remoto().runTransaction { tx ->
            check(ConexionFirebase.puedeEnviar(applicationContext, captura.uid)) { "sesion_no_disponible" }
            val actual = tx.get(ref)
            if (actual.exists()) {
                check(hasMismaCaptura(actual.data ?: emptyMap(), payload)) { "identidad_en_conflicto" }
            } else tx.set(ref, payload)
            true
        }
        Tasks.await(tarea, TIMEOUT_ENVIO_SEGUNDOS, TimeUnit.SECONDS)
    }

    private fun tratarError(uid: String, error: Exception): Result {
        val causa = error.cause ?: error
        val codigo = (causa as? FirebaseFirestoreException)?.code
        val isPermanente = codigo in setOf(FirebaseFirestoreException.Code.PERMISSION_DENIED,
            FirebaseFirestoreException.Code.UNAUTHENTICATED, FirebaseFirestoreException.Code.INVALID_ARGUMENT)
            || causa is IllegalStateException
        ConexionFirebase.error(applicationContext, uid, if (isPermanente) "revisar_acceso_o_identidad" else "envio_pendiente")
        Log.w("CuotasEnvio", "No se confirmó el envío; contenido omitido.")
        return if (isPermanente) Result.failure() else Result.retry()
    }

    companion object {
        private fun nombre(uid: String) = "compras_${ConexionFirebase.hash(uid)}"

        fun solicitar(context: Context, uid: String) {
            val datos = Data.Builder().putString(INPUT_UID, uid).build()
            val solicitud = OneTimeWorkRequestBuilder<TrabajoCapturas>().setInputData(datos)
                .setConstraints(Constraints.Builder().setRequiredNetworkType(NetworkType.CONNECTED).build())
                .setBackoffCriteria(BackoffPolicy.EXPONENTIAL, BACKOFF_SEGUNDOS, TimeUnit.SECONDS).build()
            encolar(WorkManager.getInstance(context), uid, solicitud)
        }

        // Cada señal deja un sucesor durable, incluso después del último conteo
        // del worker anterior. KEEP descartaría esa señal mientras sigue activo.
        internal fun encolar(manager: WorkManager, uid: String, solicitud: OneTimeWorkRequest): Operation =
            manager.enqueueUniqueWork(nombre(uid), ExistingWorkPolicy.APPEND_OR_REPLACE, solicitud)

        fun cancelar(context: Context, uid: String) { WorkManager.getInstance(context).cancelUniqueWork(nombre(uid)) }
    }
}

/** No contiene nombre del adicional, texto original, fecha supuesta ni datos de otras apps. */
fun payloadDeCaptura(captura: ColaDatabase.Captura): Map<String, Any?> = mapOf(
    "schemaVersion" to 1L, "eventId" to captura.eventId, "estado" to "sin_asignar",
    "origen" to "automatico", "moneda" to "CLP", "montoOriginal" to captura.montoOriginal,
    "comercio" to captura.comercio, "fechaCompra" to null, "horaCompra" to null,
    "tarjetaUltimos4" to captura.tarjetaUltimos4, "referenciaHash" to null,
    "recibidaEn" to captura.recibidaEn, "parserVersion" to captura.parserVersion,
    "compraId" to null, "creadaEn" to FieldValue.serverTimestamp()
)

/** Un reintento acepta también una resolución terminal; jamás la reabre o sobrescribe. */
fun hasMismaCaptura(actual: Map<String, Any?>, payload: Map<String, Any?>): Boolean {
    if (actual.keys.any { it !in payload.keys && it != "resueltaEn" } ||
        actual["creadaEn"] !is com.google.firebase.Timestamp) return false
    val mutables = setOf("estado", "compraId", "creadaEn")
    val hasMismosDatos = payload.filterKeys { it !in mutables }.all { (campo, valor) -> actual[campo] == valor }
    val estado = actual["estado"]
    val compraId = if (estado == "confirmada") "auto_${payload["eventId"]}" else null
    return hasMismosDatos && estado in ESTADOS_SERVIDOR && actual["compraId"] == compraId
}
