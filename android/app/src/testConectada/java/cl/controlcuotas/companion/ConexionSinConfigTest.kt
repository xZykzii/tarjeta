package cl.controlcuotas.companion

import android.widget.Button
import android.widget.LinearLayout
import android.widget.ScrollView
import android.widget.TextView
import org.junit.Assert.*
import org.junit.Assume.assumeFalse
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.Robolectric
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config

@RunWith(RobolectricTestRunner::class)
@Config(sdk = [35])
class ConexionSinConfigTest {
    @Test
    fun sinConfiguracionNoOfreceLoginNiEnvio() {
        assumeFalse(ConexionFirebase.hasConfiguracion())
        Robolectric.buildActivity(ConexionActivity::class.java).setup().use { controller ->
            val root = controller.get().findViewById<android.view.ViewGroup>(android.R.id.content)
            val scroll = root.getChildAt(0) as ScrollView
            val layout = scroll.getChildAt(0) as LinearLayout
            val controles = (0 until layout.childCount).map { layout.getChildAt(it) }
            val login = controles.filterIsInstance<Button>().single { it.text == "Vincular mi Google" }
            val envio = controles.filterIsInstance<Button>().single { it.text == "Reintentar envío de mi cola" }
            assertFalse(login.isEnabled)
            assertFalse(envio.isEnabled)
            assertTrue(controles.filterIsInstance<TextView>().any { it.text.contains("aún no está habilitada") })
            assertNull(ConexionFirebase.uid())
        }
    }
}
