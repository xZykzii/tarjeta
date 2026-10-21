package cl.controlcuotas.core

import org.json.JSONObject
import org.junit.Assert.*
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.Parameterized

@RunWith(Parameterized::class)
class CorpusNotificacionesTest(private val id: String, private val caso: JSONObject) {
    @Test
    fun conservaContratoDelCorpusCompartido() {
        val resultado = procesarNotificacion(
            caso.getString("paquete"), caso.getBoolean("isResumenGrupo"), true
        ) {
            TextoNotificacion(caso.optString("titulo"), caso.optString("texto"), caso.optString("textoAmpliado"))
        }
        if (caso.isNull("compra")) {
            assertTrue(id, resultado is ResultadoNotificacion.Ignorada)
            return
        }
        assertTrue(id, resultado is ResultadoNotificacion.Compra)
        val datos = (resultado as ResultadoNotificacion.Compra).datos
        val esperado = caso.getJSONObject("compra")
        assertEquals(id, esperado.getLong("montoOriginal"), datos.montoOriginal)
        assertEquals(id, esperado.getString("comercio"), datos.comercio)
        assertEquals(id, esperado.getString("tarjetaUltimos4"), datos.tarjetaUltimos4)
    }

    companion object {
        @JvmStatic
        @Parameterized.Parameters(name = "{0}")
        fun casos(): Collection<Array<Any>> {
            val stream = requireNotNull(CorpusNotificacionesTest::class.java.getResourceAsStream("/notificaciones-falabella.json"))
            val corpus = stream.bufferedReader(Charsets.UTF_8).use { JSONObject(it.readText()) }
            require(corpus.getInt("version") == 1)
            val casos = corpus.getJSONArray("casos")
            return (0 until casos.length()).map { index ->
                val caso = casos.getJSONObject(index)
                arrayOf<Any>(caso.getString("id"), caso)
            }
        }
    }
}
