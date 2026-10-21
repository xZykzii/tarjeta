package cl.controlcuotas.core

import java.text.Normalizer

const val PAQUETE_BANCO = "cl.android"
const val VERSION_ANALIZADOR = "captura-20261021-v1"
const val MAX_TEXTO_NOTIFICACION = 2000
private const val MAX_COMERCIO = 200
private const val MAX_ENTERO_JS = 9_007_199_254_740_991L
private const val ETIQUETA_BANCO = "Banco Falabella"

/** Los textos solo se mantienen durante el callback. Nunca se registran en logs. */
data class TextoNotificacion(
    val titulo: String = "",
    val texto: String = "",
    val textoAmpliado: String = ""
)

/** La hora de recepción no se interpreta como fecha bancaria ni como cuotas. */
data class CompraDetectada(
    val montoOriginal: Long,
    val comercio: String,
    val tarjetaUltimos4: String
)

enum class MotivoIgnorado {
    SIN_CONSENTIMIENTO,
    OTRA_APLICACION,
    RESUMEN_GRUPO,
    TEXTO_INVALIDO,
    FORMATO_NO_RECONOCIDO,
    CONTENIDO_AMBIGUO
}

sealed interface ResultadoNotificacion {
    data class Ignorada(val motivo: MotivoIgnorado) : ResultadoNotificacion
    data class Compra(val datos: CompraDetectada) : ResultadoNotificacion
}

/**
 * Filtra antes de ejecutar leerTexto: la función no accede siquiera a extras
 * de otras apps, resúmenes ni avisos recibidos sin consentimiento local.
 * El permiso Android es independiente y lo concede el titular en Ajustes.
 */
fun procesarNotificacion(
    paquete: String,
    isResumenGrupo: Boolean,
    hasConsentimiento: Boolean,
    leerTexto: () -> TextoNotificacion
): ResultadoNotificacion {
    val motivo = when {
        !hasConsentimiento -> MotivoIgnorado.SIN_CONSENTIMIENTO
        paquete != PAQUETE_BANCO -> MotivoIgnorado.OTRA_APLICACION
        isResumenGrupo -> MotivoIgnorado.RESUMEN_GRUPO
        else -> null
    }
    if (motivo != null) return ResultadoNotificacion.Ignorada(motivo)
    return AnalizadorFalabella.analizar(leerTexto())
}

/**
 * Puerto conservador del prototipo JS. El corpus compartido garantiza paridad
 * para la gramática observada; no demuestra entrega ni cobertura del banco.
 * Los formatos desconocidos se rechazan en lugar de buscar subcadenas.
 */
object AnalizadorFalabella {
    private val controles = Regex("[\\u0000-\\u0008\\u000b\\u000c\\u000e-\\u001f\\u007f]")
    private val espacios = Regex("[\\s\\p{Z}]+")
    private val compra = Regex(
        "^Compraste \\$((?:[1-9]\\d{0,2}(?:\\.\\d{3})+)|(?:[1-9]\\d*)) en (.+?) " +
            "Con tu CMR Mastercard Elite terminada en (\\d{4})\\. " +
            "Si no la realizaste tú, revisa los movimientos de tus adicionales en tu app\\.$"
    )

    fun analizar(aviso: TextoNotificacion): ResultadoNotificacion {
        val campos = listOf(aviso.titulo, aviso.texto, aviso.textoAmpliado)
        if (campos.any { it.length > MAX_TEXTO_NOTIFICACION || controles.containsMatchIn(it) }) {
            return ResultadoNotificacion.Ignorada(MotivoIgnorado.TEXTO_INVALIDO)
        }
        val normalizados = campos.map { normalizar(it) }
        val resultados = candidatos(normalizados).mapNotNull { datosDeTexto(it) }.distinct()
        if (resultados.isEmpty()) return ResultadoNotificacion.Ignorada(MotivoIgnorado.FORMATO_NO_RECONOCIDO)
        if (resultados.size > 1) return ResultadoNotificacion.Ignorada(MotivoIgnorado.CONTENIDO_AMBIGUO)
        return ResultadoNotificacion.Compra(resultados.single())
    }

    private fun normalizar(texto: String): String =
        Normalizer.normalize(texto, Normalizer.Form.NFC).replace(espacios, " ").trim()

    private fun candidatos(campos: List<String>): Set<String> {
        val titulo = campos[0].takeUnless { it == ETIQUETA_BANCO } ?: ""
        return linkedSetOf(
            campos[1], campos[2],
            "$titulo ${campos[1]}".trim(), "$titulo ${campos[2]}".trim()
        ).filterTo(linkedSetOf()) { it.isNotEmpty() }
    }

    private fun datosDeTexto(texto: String): CompraDetectada? {
        val match = compra.matchEntire(texto) ?: return null
        val monto = match.groupValues[1].replace(".", "").toLongOrNull() ?: return null
        val comercio = match.groupValues[2].trim()
        if (monto <= 0 || monto > MAX_ENTERO_JS || comercio.isEmpty() || comercio.length > MAX_COMERCIO) return null
        return CompraDetectada(monto, comercio, match.groupValues[3])
    }
}
