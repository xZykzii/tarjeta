package cl.controlcuotas.core

import org.junit.Assert.*
import org.junit.Test

class PrivacidadNotificacionesTest {
    private fun verificarSinLectura(paquete: String, isResumen: Boolean, hasConsentimiento: Boolean) {
        var hasLeidoTexto = false
        val resultado = procesarNotificacion(paquete, isResumen, hasConsentimiento) {
            hasLeidoTexto = true
            error("No debe acceder a extras")
        }
        assertFalse(hasLeidoTexto)
        assertTrue(resultado is ResultadoNotificacion.Ignorada)
    }

    @Test fun otraAplicacionNoExponeTextos() = verificarSinLectura("cl.ejemplo.otra", false, true)
    @Test fun resumenNoExponeTextos() = verificarSinLectura(PAQUETE_BANCO, true, true)
    @Test fun sinConsentimientoNoExponeTextos() = verificarSinLectura(PAQUETE_BANCO, false, false)

    @Test
    fun descartaTextosExcesivosYControles() {
        for (texto in listOf("x".repeat(MAX_TEXTO_NOTIFICACION + 1), "texto\u0000oculto")) {
            val resultado = AnalizadorFalabella.analizar(TextoNotificacion(texto = texto))
            assertEquals(ResultadoNotificacion.Ignorada(MotivoIgnorado.TEXTO_INVALIDO), resultado)
        }
    }
}
