package cl.controlcuotas.companion

import android.app.Application
import android.util.Log
import cl.controlcuotas.core.CompraDetectada
import cl.controlcuotas.core.VERSION_ANALIZADOR
import java.util.UUID

private const val MAX_CLAVE_NOTIFICACION = 2000
private const val MAX_REGISTROS_LOCALES = 50000

class AplicacionConectada : Application() {
    override fun onCreate() {
        super.onCreate()
        if (!ConexionFirebase.iniciar(this)) return
        DestinoCompras.destino = ColaDeCapturas(this)
        ConexionFirebase.auth().addAuthStateListener {
            ConexionFirebase.uid()?.let { uid ->
                if (ConexionFirebase.puedeEnviar(this, uid)) TrabajoCapturas.solicitar(this, uid)
            }
        }
    }
}

/** Recibe solo la compra tipada. Nunca accede a extras ni nombres del adicional. */
class ColaDeCapturas(private val context: android.content.Context) : DestinoCapturas {
    override fun recibir(compra: CompraDetectada, clave: String, postTime: Long, recibidaEn: Long) {
        val uid = ConexionFirebase.uid() ?: return
        if (!ConexionFirebase.puedeEnviar(context, uid)) return
        if (clave.isEmpty() || clave.length > MAX_CLAVE_NOTIFICACION || postTime <= 0 || recibidaEn <= 0) {
            ConexionFirebase.error(context, uid, "identidad_no_utilizable")
            return
        }
        if (postTime < ConexionFirebase.autorizadaDesde(context, uid)) return
        val identidad = ConexionFirebase.hash("$uid\u0000$clave")
        val huella = ConexionFirebase.hash("${compra.montoOriginal}\u0000${compra.comercio}\u0000${compra.tarjetaUltimos4}")
        val captura = ColaDatabase.Captura(UUID.randomUUID().toString(), uid, identidad, huella,
            postTime, recibidaEn, compra.montoOriginal, compra.comercio, compra.tarjetaUltimos4,
            VERSION_ANALIZADOR, "pendiente")
        ConexionFirebase.executor.execute {
            if (!ConexionFirebase.puedeEnviar(context, uid)) return@execute
            try {
                ConexionFirebase.db(context).capturas().encolar(captura, MAX_REGISTROS_LOCALES)
                TrabajoCapturas.solicitar(context, uid)
            } catch (error: RuntimeException) {
                Log.w("CuotasCola", "No se pudo conservar un aviso; contenido omitido.")
                ConexionFirebase.error(context, uid, "no_guardado_local")
            }
        }
    }

    override fun pausar() {
        val uid = ConexionFirebase.uid() ?: return
        ConexionFirebase.consentir(context, uid, false)
    }
}
