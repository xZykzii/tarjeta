package cl.controlcuotas.companion

import cl.controlcuotas.core.CompraDetectada

/** El flavor diagnóstico no instala destino, no persiste ni tiene permiso de red. */
interface DestinoCapturas {
    fun recibir(compra: CompraDetectada, clave: String, postTime: Long, recibidaEn: Long)
    fun pausar()
}

object DestinoCompras {
    var destino: DestinoCapturas? = null
}
