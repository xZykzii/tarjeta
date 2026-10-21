import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { analizarNotificacionFalabella } from "../falabella-notificaciones.mjs";

const corpus = JSON.parse(readFileSync(new URL("./fixtures/notificaciones-falabella.json", import.meta.url), "utf8"));
assert.equal(corpus.version, 1);
const config = { paqueteAutorizado:"cl.android", hasPaqueteVerificado:true };

for (const caso of corpus.casos) {
  test(`corpus compartido JS/Kotlin: ${caso.id}`, () => {
    const resultado = analizarNotificacionFalabella(caso, config);
    if (!caso.compra) {
      assert.equal(resultado.resultado, "ignorada");
      return;
    }
    assert.equal(resultado.resultado, "compra");
    const { montoOriginal, comercio, tarjetaUltimos4 } = resultado.datos;
    assert.deepEqual({ montoOriginal, comercio, tarjetaUltimos4 }, caso.compra);
    assert.equal(resultado.datos.fechaCompra, null);
    assert.equal(resultado.datos.horaCompra, null);
  });
}
