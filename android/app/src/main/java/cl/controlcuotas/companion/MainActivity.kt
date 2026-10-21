package cl.controlcuotas.companion

import android.app.Activity
import android.app.NotificationManager
import android.content.ComponentName
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import android.os.Bundle
import android.provider.Settings
import android.service.notification.NotificationListenerService
import android.util.Log
import android.view.WindowInsets
import android.widget.Button
import android.widget.Switch
import android.widget.TextView
import android.widget.Toast
import cl.controlcuotas.core.MotivoIgnorado
import cl.controlcuotas.core.PAQUETE_BANCO
import java.text.NumberFormat
import java.util.Locale

/** Pantalla local de consentimiento/diagnóstico; no hay inicio de sesión ni red. */
class MainActivity : Activity() {
    private lateinit var consentimiento: Switch
    private val cambioEstado: () -> Unit = { render() }
    private var isRenderizando = false

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)
        ajustarInsets()
        consentimiento = findViewById(R.id.consent)
        consentimiento.setOnCheckedChangeListener { _, hasConsentimiento ->
            if (!isRenderizando) {
                ConsentimientoLocal.cambiar(this, hasConsentimiento)
                render()
            }
        }
        findViewById<Button>(R.id.settings).setOnClickListener { abrirAjustes() }
        findViewById<Button>(R.id.rebind).setOnClickListener {
            if (hasAcceso() && ConsentimientoLocal.hasConsentimiento(this)) {
                NotificationListenerService.requestRebind(componente())
                Toast.makeText(this, "Reconexión solicitada. Android decide cuándo enlazar el servicio.", Toast.LENGTH_LONG).show()
            }
        }
        findViewById<Button>(R.id.clear).setOnClickListener { EstadoDiagnostico.limpiar() }
        findViewById<Button>(R.id.connection).apply {
            visibility = if (BuildConfig.IS_CONECTADA) android.view.View.VISIBLE else android.view.View.GONE
            setOnClickListener { startActivity(Intent().setClassName(context, "cl.controlcuotas.companion.ConexionActivity")) }
        }
    }

    override fun onStart() {
        super.onStart()
        EstadoDiagnostico.observar(cambioEstado)
    }

    override fun onResume() {
        super.onResume()
        render()
    }

    override fun onStop() {
        EstadoDiagnostico.dejarDeObservar(cambioEstado)
        super.onStop()
    }

    private fun componente() = ComponentName(this, ListenerFalabella::class.java)

    private fun hasAcceso(): Boolean =
        getSystemService(NotificationManager::class.java).isNotificationListenerAccessGranted(componente())

    @Suppress("DEPRECATION")
    private fun hasBancoInstalado(): Boolean {
        return try {
            packageManager.getApplicationInfo(PAQUETE_BANCO, 0)
            true
        } catch (error: PackageManager.NameNotFoundException) {
            false
        }
    }

    private fun render() {
        val hasBanco = hasBancoInstalado()
        val hasConsentimiento = ConsentimientoLocal.hasConsentimiento(this)
        val hasPermiso = hasAcceso()
        val vista = EstadoDiagnostico.vista
        isRenderizando = true
        consentimiento.isChecked = hasConsentimiento
        consentimiento.isEnabled = hasBanco || hasConsentimiento
        isRenderizando = false
        findViewById<Button>(R.id.settings).isEnabled = hasPermiso || (hasConsentimiento && hasBanco)
        findViewById<Button>(R.id.rebind).isEnabled = hasPermiso && hasConsentimiento && hasBanco && !vista.isConectado
        findViewById<TextView>(R.id.status).text = estadoTexto(hasBanco, hasConsentimiento, hasPermiso, vista)
        findViewById<TextView>(R.id.result).text = resultadoTexto(vista)
    }

    private fun estadoTexto(hasBanco: Boolean, hasConsentimiento: Boolean, hasPermiso: Boolean, vista: VistaDiagnostico): String {
        val filas = listOf(
            if (hasBanco) "Paquete cl.android instalado." else "No se encontró la app Banco Falabella Chile (cl.android).",
            if (hasConsentimiento) "Diagnóstico local autorizado." else "Diagnóstico pausado: no se leen textos.",
            if (hasPermiso) "Acceso de Android concedido." else "Acceso de Android pendiente en Ajustes.",
            if (vista.isConectado) "Servicio conectado al sistema." else "Servicio sin conexión al sistema.",
            "Avisos individuales recibidos: ${vista.callbacks}.",
            "Callbacks con formato reconocido: ${vista.reconocidos}."
        )
        return filas.joinToString("\n")
    }

    private fun resultadoTexto(vista: VistaDiagnostico): String {
        if (vista.hasErrorLectura) return "No se pudo leer el aviso. No se creó ningún registro."
        val compra = vista.ultimaCompra
        if (compra != null) {
            val monto = NumberFormat.getIntegerInstance(Locale.forLanguageTag("es-CL")).format(compra.montoOriginal)
            val estadoEnvio = if (BuildConfig.IS_CONECTADA) "Revisa el estado en Cuenta y sincronización. No se creó deuda."
                else "No se registró deuda ni se envió información."
            return "Formato reconocido para revisión local.\n\n$$monto · ${compra.comercio}\nTarjeta terminada en ${compra.tarjetaUltimos4}.\n\n$estadoEnvio"
        }
        return when (vista.ultimoMotivo) {
            MotivoIgnorado.TEXTO_INVALIDO -> "Texto no utilizable. Aviso ignorado."
            MotivoIgnorado.CONTENIDO_AMBIGUO -> "El texto tiene datos contradictorios. Aviso ignorado."
            MotivoIgnorado.FORMATO_NO_RECONOCIDO -> "Formato desconocido o aviso sin compra reconocida. No se creó ningún registro."
            else -> "Sin un resultado local. Espera un nuevo aviso del banco con el diagnóstico autorizado."
        }
    }

    private fun abrirAjustes() {
        if (!hasAcceso() && (!ConsentimientoLocal.hasConsentimiento(this) || !hasBancoInstalado())) return
        val intent = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            Intent(Settings.ACTION_NOTIFICATION_LISTENER_DETAIL_SETTINGS)
                .putExtra(Settings.EXTRA_NOTIFICATION_LISTENER_COMPONENT_NAME, componente().flattenToString())
        } else Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS)
        try {
            startActivity(intent)
        } catch (error: android.content.ActivityNotFoundException) {
            Log.w(TAG, "No se pudo abrir la pantalla de acceso del sistema.")
            Toast.makeText(this, "Abre Ajustes y busca Acceso a notificaciones para autorizar Cuotas.", Toast.LENGTH_LONG).show()
        }
    }

    @Suppress("DEPRECATION")
    private fun ajustarInsets() {
        findViewById<android.view.View>(R.id.root).setOnApplyWindowInsetsListener { view, insets ->
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                val barras = insets.getInsets(WindowInsets.Type.systemBars())
                view.setPadding(barras.left, barras.top, barras.right, barras.bottom)
            } else view.setPadding(insets.systemWindowInsetLeft, insets.systemWindowInsetTop, insets.systemWindowInsetRight, insets.systemWindowInsetBottom)
            insets
        }
    }

    companion object { private const val TAG = "CuotasActivity" }
}
