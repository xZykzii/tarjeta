package cl.controlcuotas.companion

import android.content.Context
import cl.controlcuotas.core.CompraDetectada
import cl.controlcuotas.core.MotivoIgnorado
import cl.controlcuotas.core.ResultadoNotificacion

/** Única preferencia persistida: consentimiento. No se guardan textos ni compras. */
object ConsentimientoLocal {
    private const val PREFERENCIAS = "control_diagnostico"
    private const val CONSENTIMIENTO = "has_consentimiento_local"

    fun hasConsentimiento(context: Context): Boolean =
        context.getSharedPreferences(PREFERENCIAS, Context.MODE_PRIVATE).getBoolean(CONSENTIMIENTO, false)

    fun cambiar(context: Context, hasConsentimiento: Boolean) {
        context.getSharedPreferences(PREFERENCIAS, Context.MODE_PRIVATE)
            .edit().putBoolean(CONSENTIMIENTO, hasConsentimiento).apply()
        if (!hasConsentimiento) {
            EstadoDiagnostico.limpiar()
            DestinoCompras.destino?.pausar()
        }
    }
}

data class VistaDiagnostico(
    val isConectado: Boolean = false,
    val callbacks: Long = 0,
    val reconocidos: Long = 0,
    val ultimaCompra: CompraDetectada? = null,
    val ultimoMotivo: MotivoIgnorado? = null,
    val hasErrorLectura: Boolean = false
)

/** Se modifica/observa desde el hilo principal; nada se escribe en disco o red. */
object EstadoDiagnostico {
    var vista = VistaDiagnostico()
        private set
    private val observadores = mutableSetOf<() -> Unit>()

    fun observar(observer: () -> Unit) { observadores.add(observer) }
    fun dejarDeObservar(observer: () -> Unit) { observadores.remove(observer) }

    fun conexion(isConectado: Boolean) {
        vista = vista.copy(isConectado = isConectado)
        notificar()
    }

    fun registrar(resultado: ResultadoNotificacion) {
        val compra = (resultado as? ResultadoNotificacion.Compra)?.datos
        vista = vista.copy(
            callbacks = vista.callbacks + 1,
            reconocidos = vista.reconocidos + if (compra != null) 1 else 0,
            ultimaCompra = compra,
            ultimoMotivo = (resultado as? ResultadoNotificacion.Ignorada)?.motivo,
            hasErrorLectura = false
        )
        notificar()
    }

    fun errorLectura() {
        vista = vista.copy(ultimaCompra = null, hasErrorLectura = true)
        notificar()
    }

    fun limpiar() {
        vista = VistaDiagnostico(isConectado = vista.isConectado)
        notificar()
    }

    private fun notificar() { observadores.toList().forEach { it() } }
}
