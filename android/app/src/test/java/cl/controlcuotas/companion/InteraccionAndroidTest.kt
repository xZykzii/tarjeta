package cl.controlcuotas.companion

import android.app.Notification
import android.content.pm.ApplicationInfo
import android.content.pm.PackageInfo
import android.os.UserHandle
import android.provider.Settings
import android.service.notification.StatusBarNotification
import android.widget.Button
import android.widget.Switch
import android.widget.TextView
import cl.controlcuotas.core.PAQUETE_BANCO
import org.junit.Assert.*
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.Robolectric
import org.robolectric.RobolectricTestRunner
import org.robolectric.RuntimeEnvironment
import org.robolectric.Shadows.shadowOf
import org.robolectric.annotation.Config

/** Prueba de componentes bajo Robolectric, no entrega del sistema ni teléfono físico. */
@RunWith(RobolectricTestRunner::class)
@Config(sdk = [35])
class InteraccionAndroidTest {
    @Before
    fun reiniciar() {
        ConsentimientoLocal.cambiar(RuntimeEnvironment.getApplication(), false)
        EstadoDiagnostico.conexion(false)
        EstadoDiagnostico.limpiar()
    }

    @Test
    fun iniciaSinConsentimientoNiAcceso() {
        Robolectric.buildActivity(MainActivity::class.java).setup().use { controller ->
            val activity = controller.get()
            assertFalse(activity.findViewById<Switch>(R.id.consent).isChecked)
            assertFalse(activity.findViewById<Button>(R.id.settings).isEnabled)
            assertTrue(activity.findViewById<TextView>(R.id.status).text.contains("Diagnóstico pausado"))
        }
    }

    @Test
    fun consentimientoSoloAbreAjustesSinConcederPermiso() {
        instalarPaqueteFicticio()
        Robolectric.buildActivity(MainActivity::class.java).setup().use { controller ->
            val activity = controller.get()
            activity.findViewById<Switch>(R.id.consent).isChecked = true
            assertTrue(ConsentimientoLocal.hasConsentimiento(activity))
            assertTrue(activity.findViewById<Button>(R.id.settings).performClick())
            val intent = shadowOf(activity).nextStartedActivity
            assertEquals(Settings.ACTION_NOTIFICATION_LISTENER_DETAIL_SETTINGS, intent.action)
            assertTrue(activity.findViewById<TextView>(R.id.status).text.contains("Acceso de Android pendiente"))
        }
    }

    @Test
    fun callbackRealDelServicioFiltraYNormalizaSinPersistirCompras() {
        val app = RuntimeEnvironment.getApplication()
        val controller = Robolectric.buildService(ListenerFalabella::class.java).create()
        try {
            val service = controller.get()
            service.onListenerConnected()
            assertTrue(EstadoDiagnostico.vista.isConectado)
            service.onNotificationPosted(aviso(PAQUETE_BANCO))
            assertEquals(0L, EstadoDiagnostico.vista.callbacks)
            ConsentimientoLocal.cambiar(app, true)
            service.onNotificationPosted(aviso("cl.ejemplo.otraapp"))
            service.onNotificationPosted(aviso(PAQUETE_BANCO, true))
            assertEquals(0L, EstadoDiagnostico.vista.callbacks)
            service.onNotificationPosted(aviso(PAQUETE_BANCO))
            assertEquals(1L, EstadoDiagnostico.vista.callbacks)
            assertEquals(1000L, EstadoDiagnostico.vista.ultimaCompra?.montoOriginal)
            val prefs = app.getSharedPreferences("control_diagnostico", android.content.Context.MODE_PRIVATE)
            assertEquals(setOf("has_consentimiento_local"), prefs.all.keys)
            ConsentimientoLocal.cambiar(app, false)
            assertNull(EstadoDiagnostico.vista.ultimaCompra)
            service.onNotificationPosted(aviso(PAQUETE_BANCO))
            assertEquals(0L, EstadoDiagnostico.vista.callbacks)
        } finally { controller.destroy() }
    }

    private fun instalarPaqueteFicticio() {
        val info = PackageInfo().apply {
            packageName = PAQUETE_BANCO
            applicationInfo = ApplicationInfo().apply { packageName = PAQUETE_BANCO }
        }
        shadowOf(RuntimeEnvironment.getApplication().packageManager).installPackage(info)
    }

    @Suppress("DEPRECATION")
    private fun aviso(paquete: String, isResumen: Boolean = false): StatusBarNotification {
        val notification = Notification.Builder(RuntimeEnvironment.getApplication(), "prueba-local")
            .setContentTitle("Banco Falabella")
            .setContentText("Compraste $1.000 en COMERCIO DE EJEMPLO CHL Con tu CMR Mastercard Elite terminada en 0000. Si no la realizaste tú, revisa los movimientos de tus adicionales en tu app.")
            .build()
        if (isResumen) notification.flags = notification.flags or Notification.FLAG_GROUP_SUMMARY
        return StatusBarNotification(paquete, paquete, 1, null, 0, 0, 0, notification, UserHandle.getUserHandleForUid(0), 1L)
    }
}
