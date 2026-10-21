package cl.controlcuotas.companion

import android.app.Notification
import android.service.notification.NotificationListenerService
import android.service.notification.StatusBarNotification
import android.util.Log
import cl.controlcuotas.core.MAX_TEXTO_NOTIFICACION
import cl.controlcuotas.core.PAQUETE_BANCO
import cl.controlcuotas.core.TextoNotificacion
import cl.controlcuotas.core.procesarNotificacion

/** Servicio real, enlazado únicamente por Android tras autorización en Ajustes. */
class ListenerFalabella : NotificationListenerService() {
    override fun onListenerConnected() {
        EstadoDiagnostico.conexion(true)
        // No consultar activeNotifications: no recuperar avisos anteriores al consentimiento.
    }

    override fun onListenerDisconnected() { EstadoDiagnostico.conexion(false) }

    override fun onDestroy() {
        EstadoDiagnostico.conexion(false)
        super.onDestroy()
    }

    override fun onNotificationPosted(sbn: StatusBarNotification?) {
        if (sbn == null || sbn.packageName != PAQUETE_BANCO) return
        if (!ConsentimientoLocal.hasConsentimiento(this)) return
        val notification = sbn.notification
        val isResumen = notification.flags and Notification.FLAG_GROUP_SUMMARY != 0
        if (isResumen) return
        try {
            val resultado = procesarNotificacion(sbn.packageName, isResumen, true) {
                TextoNotificacion(
                    campo(notification, Notification.EXTRA_TITLE),
                    campo(notification, Notification.EXTRA_TEXT),
                    campo(notification, Notification.EXTRA_BIG_TEXT)
                )
            }
            EstadoDiagnostico.registrar(resultado)
        } catch (error: RuntimeException) {
            // El mensaje de una excepción de extras podría contener información bancaria.
            Log.w(TAG, "No se pudo leer un aviso del paquete permitido; contenido omitido.")
            EstadoDiagnostico.errorLectura()
        }
    }

    private fun campo(notification: Notification, nombre: String): String {
        val texto = notification.extras.getCharSequence(nombre) ?: return ""
        require(texto.length <= MAX_TEXTO_NOTIFICACION) { "Texto fuera de límite" }
        return texto.toString()
    }

    companion object { private const val TAG = "CuotasListener" }
}
