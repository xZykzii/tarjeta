package cl.controlcuotas.companion

import android.content.Context
import androidx.room.Room
import androidx.work.Configuration
import androidx.work.Data
import androidx.work.ListenableWorker
import androidx.work.OneTimeWorkRequest
import androidx.work.OneTimeWorkRequestBuilder
import androidx.work.WorkInfo
import androidx.work.WorkManager
import androidx.work.Worker
import androidx.work.WorkerParameters
import androidx.work.testing.SynchronousExecutor
import androidx.work.testing.WorkManagerTestInitHelper
import org.junit.After
import org.junit.Assert.*
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.RuntimeEnvironment
import org.robolectric.annotation.Config
import java.util.concurrent.TimeUnit
import java.util.concurrent.Executors
import org.robolectric.Shadows.shadowOf
import android.os.Looper

private const val UID_PRUEBA = "cuenta_a"
private const val UID_OTRA = "cuenta_b"
private const val ESPERA_SEGUNDOS = 10L
private const val DEMORA_HORAS = 1L
private const val INTERVALO_MS = 10L

/** Room y WorkManager reales; el único puerto sustituido es el envío de red. */
@RunWith(RobolectricTestRunner::class)
@Config(sdk = [35], application = android.app.Application::class)
class ProgramacionCapturasTest {
    private lateinit var db: ColaDatabase
    private lateinit var manager: WorkManager
    private val workers = Executors.newSingleThreadExecutor()

    @Before
    fun iniciar() {
        val context = RuntimeEnvironment.getApplication()
        db = Room.inMemoryDatabaseBuilder(context, ColaDatabase::class.java)
            .allowMainThreadQueries().build()
        val config = Configuration.Builder().setExecutor(workers)
            .setTaskExecutor(SynchronousExecutor()).build()
        WorkManagerTestInitHelper.initializeTestWorkManager(context, config)
        manager = WorkManager.getInstance(context)
        SondaEnvio.dao = db.capturas()
        SondaEnvio.despuesDeVacio = null
        SondaEnvio.isAutorizado = true
        SondaEnvio.isFalloPermanente = false
        SondaEnvio.ejecuciones = 0
    }

    @After
    fun cerrar() {
        manager.cancelAllWork().result.get(ESPERA_SEGUNDOS, TimeUnit.SECONDS)
        WorkManagerTestInitHelper.closeWorkDatabase()
        workers.shutdownNow()
        db.close()
        SondaEnvio.despuesDeVacio = null
    }

    private fun solicitud(uid: String = UID_PRUEBA): OneTimeWorkRequest =
        OneTimeWorkRequestBuilder<SondaEnvio>()
            .setInputData(Data.Builder().putString("uid", uid).build())
            .setInitialDelay(DEMORA_HORAS, TimeUnit.HOURS).build()

    private fun encolar(uid: String, solicitud: OneTimeWorkRequest) {
        TrabajoCapturas.encolar(manager, uid, solicitud).result.get(ESPERA_SEGUNDOS, TimeUnit.SECONDS)
    }

    private fun ejecutar(solicitud: OneTimeWorkRequest) {
        val driver = requireNotNull(WorkManagerTestInitHelper.getTestDriver(RuntimeEnvironment.getApplication()))
        driver.setInitialDelayMet(solicitud.id)
        val limite = System.nanoTime() + TimeUnit.SECONDS.toNanos(ESPERA_SEGUNDOS)
        while (!estado(solicitud).isFinished && System.nanoTime() < limite) {
            shadowOf(Looper.getMainLooper()).idle()
            Thread.sleep(INTERVALO_MS)
        }
        assertTrue("El trabajo termina dentro del plazo", estado(solicitud).isFinished)
    }

    private fun estado(solicitud: OneTimeWorkRequest): WorkInfo.State =
        requireNotNull(manager.getWorkInfoById(solicitud.id).get(ESPERA_SEGUNDOS, TimeUnit.SECONDS)).state

    private fun captura(id: String, uid: String = UID_PRUEBA) = ColaDatabase.Captura(
        id, uid, "clave_$id", "huella_$id", 100L, 200L, 1000L,
        "COMERCIO FICTICIO", "0000", "fixture", "pendiente")

    @Test
    fun capturaTrasConteoCeroDejaSucesorAunqueElTrabajoAnteriorSigaEjecutandose() {
        val primera = solicitud()
        val siguiente = solicitud()
        encolar(UID_PRUEBA, primera)
        SondaEnvio.despuesDeVacio = {
            assertEquals(WorkInfo.State.RUNNING, estado(primera))
            db.capturas().encolar(captura("captura_en_ventana_final"), 10)
            encolar(UID_PRUEBA, siguiente)
            assertEquals(WorkInfo.State.BLOCKED, estado(siguiente))
        }
        ejecutar(primera)
        assertEquals(WorkInfo.State.SUCCEEDED, estado(primera))
        assertEquals(1, db.capturas().pendientes(UID_PRUEBA))
        ejecutar(siguiente)
        assertEquals(WorkInfo.State.SUCCEEDED, estado(siguiente))
        assertEquals(0, db.capturas().pendientes(UID_PRUEBA))
        assertEquals(2, SondaEnvio.ejecuciones)
    }

    @Test
    fun capturaMientrasHayTrabajoProgramadoSeSerializaSinCancelarNiPerderRegistros() {
        val primera = solicitud()
        val siguiente = solicitud()
        db.capturas().encolar(captura("primera_captura"), 10)
        encolar(UID_PRUEBA, primera)
        db.capturas().encolar(captura("segunda_captura"), 10)
        encolar(UID_PRUEBA, siguiente)
        assertEquals(WorkInfo.State.BLOCKED, estado(siguiente))
        ejecutar(primera)
        ejecutar(siguiente)
        assertEquals(0, db.capturas().pendientes(UID_PRUEBA))
        assertEquals(2, db.capturas().cantidad(UID_PRUEBA))
        assertEquals(WorkInfo.State.SUCCEEDED, estado(primera))
        assertEquals(WorkInfo.State.SUCCEEDED, estado(siguiente))
    }

    @Test
    fun reintentoTrasFalloPermanenteNoHeredaUnPrerequisitoFallido() {
        val fallida = solicitud()
        db.capturas().encolar(captura("captura_reintento"), 10)
        SondaEnvio.isFalloPermanente = true
        encolar(UID_PRUEBA, fallida)
        ejecutar(fallida)
        assertEquals(WorkInfo.State.FAILED, estado(fallida))
        assertEquals(1, db.capturas().pendientes(UID_PRUEBA))
        SondaEnvio.isFalloPermanente = false
        val nueva = solicitud()
        encolar(UID_PRUEBA, nueva)
        ejecutar(nueva)
        assertEquals(WorkInfo.State.SUCCEEDED, estado(nueva))
        assertEquals(0, db.capturas().pendientes(UID_PRUEBA))
    }

    @Test
    fun cancelarPorPausaConservaLaColaYUnaNuevaSenalPuedeReanudarla() {
        val primera = solicitud()
        db.capturas().encolar(captura("captura_pausada"), 10)
        encolar(UID_PRUEBA, primera)
        TrabajoCapturas.cancelar(RuntimeEnvironment.getApplication(), UID_PRUEBA)
        manager.getWorkInfoById(primera.id).get(ESPERA_SEGUNDOS, TimeUnit.SECONDS)
        assertEquals(WorkInfo.State.CANCELLED, estado(primera))
        assertEquals(1, db.capturas().pendientes(UID_PRUEBA))
        val reanudada = solicitud()
        encolar(UID_PRUEBA, reanudada)
        ejecutar(reanudada)
        assertEquals(WorkInfo.State.SUCCEEDED, estado(reanudada))
        assertEquals(0, db.capturas().pendientes(UID_PRUEBA))
    }

    @Test
    fun cuentaDistintaTieneSuPropiaCadenaYNoConsumePendientesAjenos() {
        val primera = solicitud()
        val otra = solicitud(UID_OTRA)
        db.capturas().encolar(captura("captura_a"), 10)
        db.capturas().encolar(captura("captura_b", UID_OTRA), 10)
        encolar(UID_PRUEBA, primera)
        encolar(UID_OTRA, otra)
        ejecutar(otra)
        assertEquals(1, db.capturas().pendientes(UID_PRUEBA))
        assertEquals(0, db.capturas().pendientes(UID_OTRA))
        ejecutar(primera)
        assertEquals(0, db.capturas().pendientes(UID_PRUEBA))
    }

    @Test
    fun consentimientoRevocadoAntesDeEnviarNoLimpiaLaCaptura() {
        val primera = solicitud()
        db.capturas().encolar(captura("captura_sin_consentimiento"), 10)
        encolar(UID_PRUEBA, primera)
        SondaEnvio.isAutorizado = false
        ejecutar(primera)
        assertEquals(WorkInfo.State.FAILED, estado(primera))
        assertEquals(1, db.capturas().pendientes(UID_PRUEBA))
        assertEquals(1000L, db.capturas().lote(UID_PRUEBA, 10).single().montoOriginal)
    }
}

class SondaEnvio(context: Context, params: WorkerParameters) : Worker(context, params) {
    override fun doWork(): ListenableWorker.Result {
        ejecuciones++
        if (!isAutorizado || isFalloPermanente) return Result.failure()
        val uid = requireNotNull(inputData.getString("uid"))
        dao.lote(uid, 10).forEach { dao.enviada(uid, it.eventId) }
        if (dao.pendientes(uid) == 0) {
            val callback = despuesDeVacio
            despuesDeVacio = null
            callback?.invoke()
        }
        return Result.success()
    }

    companion object {
        lateinit var dao: ColaDatabase.CapturasDao
        var despuesDeVacio: (() -> Unit)? = null
        var isAutorizado = true
        var isFalloPermanente = false
        var ejecuciones = 0
    }
}
