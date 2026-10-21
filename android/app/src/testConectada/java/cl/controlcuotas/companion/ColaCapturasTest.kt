package cl.controlcuotas.companion

import androidx.room.Room
import com.google.firebase.Timestamp
import org.junit.After
import org.junit.Assert.*
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.RuntimeEnvironment
import org.robolectric.annotation.Config

@RunWith(RobolectricTestRunner::class)
@Config(sdk = [35])
class ColaCapturasTest {
    private lateinit var db: ColaDatabase

    @Before
    fun iniciar() {
        db = Room.inMemoryDatabaseBuilder(RuntimeEnvironment.getApplication(), ColaDatabase::class.java)
            .allowMainThreadQueries().build()
    }

    @After
    fun cerrar() { db.close() }

    private fun captura(id: String = "evento_prueba_0001", uid: String = "A", clave: String = "hash_clave",
                        postTime: Long = 100L, monto: Long = 1000L) =
        ColaDatabase.Captura(id, uid, clave, "huella_$monto", postTime, 200L, monto,
            "COMERCIO DE PRUEBA", "0000", "fixture-v1", "pendiente")

    @Test
    fun callbackRepetidoConservaIdentidadYDosComprasIgualesNoSeFusionan() {
        val dao = db.capturas()
        assertTrue(dao.encolar(captura(), 10) > 0)
        assertEquals(-1L, dao.encolar(captura(id = "evento_prueba_0002"), 10))
        dao.encolar(captura(id = "evento_prueba_0003", clave = "otra_clave"), 10)
        dao.encolar(captura(id = "evento_prueba_0004", postTime = 101L), 10)
        dao.encolar(captura(id = "evento_prueba_0005", monto = 2000L), 10)
        assertEquals(4, dao.pendientes("A"))
        assertEquals("evento_prueba_0001", dao.lote("A", 10).first().eventId)
    }

    @Test
    fun cuentaDistintaNoLeeReasignaNiLimpiaLaColaAnterior() {
        val dao = db.capturas()
        dao.encolar(captura(), 10)
        dao.encolar(captura(id = "evento_cuenta_b_0001", uid = "B"), 10)
        assertEquals(1, dao.pendientes("A"))
        assertEquals(1, dao.pendientes("B"))
        assertEquals(0, dao.pendientes("A' OR 1=1"))
        assertEquals(0, dao.enviada("B", "evento_prueba_0001"))
        assertEquals(1, dao.pendientes("A"))
    }

    @Test
    fun envioConfirmadoBorraDatosFinancierosLocalesYConservaTombstone() {
        val dao = db.capturas()
        dao.encolar(captura(), 10)
        assertEquals(1, dao.enviada("A", "evento_prueba_0001"))
        assertEquals(0, dao.pendientes("A"))
        assertEquals(1, dao.cantidad("A"))
        assertEquals(-1L, dao.encolar(captura(id = "reintento_con_otro_uuid"), 10))
        val cursor = db.openHelper.readableDatabase.query("SELECT montoOriginal, comercio, tarjetaUltimos4 FROM capturas")
        cursor.use {
            assertTrue(it.moveToFirst())
            assertEquals(0L, it.getLong(0))
            assertEquals("", it.getString(1))
            assertEquals("", it.getString(2))
        }
    }

    @Test
    fun limiteNoEliminaRegistrosYNoRechazaUnCallbackYaConocido() {
        val dao = db.capturas()
        dao.encolar(captura(), 1)
        assertEquals(-1L, dao.encolar(captura(id = "otro_uuid"), 1))
        try {
            dao.encolar(captura(id = "otra_compra", postTime = 101L), 1)
            fail("Debió rechazar una cola llena")
        } catch (error: IllegalStateException) {
            assertEquals(1, dao.cantidad("A"))
        }
    }

    @Test
    fun envioRepetidoAceptaResolucionTerminalSinReabrirla() {
        val payload = payloadDeCaptura(captura())
        val remoto = payload + mapOf("creadaEn" to Timestamp.now(), "estado" to "confirmada",
            "compraId" to "auto_evento_prueba_0001", "resueltaEn" to Timestamp.now())
        assertTrue(hasMismaCaptura(remoto, payload))
        assertFalse(hasMismaCaptura(remoto + ("montoOriginal" to 2000L), payload))
        assertFalse(hasMismaCaptura(remoto + ("compraId" to "otra_compra"), payload))
        assertFalse(hasMismaCaptura(remoto + ("textoBruto" to "no admitir"), payload))
        assertFalse(payload.containsKey("persona"))
        assertNull(payload["fechaCompra"])
    }

    @Test
    fun cerrarYReabrirLaBaseConservaElIdOriginal() {
        val context = RuntimeEnvironment.getApplication()
        val nombre = "cola-unitaria-persistencia.db"
        context.deleteDatabase(nombre)
        val primera = Room.databaseBuilder(context, ColaDatabase::class.java, nombre).allowMainThreadQueries().build()
        primera.capturas().encolar(captura(), 10)
        primera.close()
        val segunda = Room.databaseBuilder(context, ColaDatabase::class.java, nombre).allowMainThreadQueries().build()
        try { assertEquals("evento_prueba_0001", segunda.capturas().lote("A", 10).single().eventId) }
        finally { segunda.close(); context.deleteDatabase(nombre) }
    }

    @Test
    fun colisionDeIdNoSeConfundeConCallbackRepetidoNiMueveLaCompraDeCuenta() {
        val dao = db.capturas()
        dao.encolar(captura(), 10)
        try {
            dao.encolar(captura(uid = "B", clave = "otra_clave"), 10)
            fail("Debió informar una colisión de identidad")
        } catch (error: IllegalStateException) {
            assertEquals(1, dao.pendientes("A"))
            assertEquals(0, dao.pendientes("B"))
        }
    }
}
