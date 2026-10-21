import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const HOST = "127.0.0.1";
const PORT = 8767;
const ROOT = new URL("../", import.meta.url);
const FILES = new Map([
  ["/docs/seguimiento/roadmap.html", "text/html; charset=utf-8"],
  ["/docs/seguimiento/plan.json", "application/json; charset=utf-8"],
  ["/ROADMAP.md", "text/plain; charset=utf-8"],
  ["/ESTADO_PROYECTO.md", "text/plain; charset=utf-8"]
]);

export function crearServidorRoadmap() {
  return createServer((request, response) => {
    servir(request, response).catch((error) => {
      console.error("No se pudo servir el seguimiento:", error.code || error.message);
      response.writeHead(500);
      response.end("No se pudo abrir el seguimiento.");
    });
  });
}

async function servir(request, response) {
  const allowedHosts = new Set([`${HOST}:${PORT}`, `localhost:${PORT}`]);
  // Los tests usan un puerto efímero; el Host sigue siendo el del servicio local.
  if (!allowedHosts.has(request.headers.host)) {
    response.writeHead(403).end("Acceso local requerido.");
    return;
  }
  if (!["GET", "HEAD"].includes(request.method)) {
    response.writeHead(405, { Allow: "GET, HEAD" }).end();
    return;
  }
  const path = new URL(request.url, `http://${HOST}:${PORT}`).pathname;
  if (path === "/") {
    response.writeHead(302, { Location: "/docs/seguimiento/roadmap.html" }).end();
    return;
  }
  if (!FILES.has(path)) {
    response.writeHead(404).end("Archivo no disponible.");
    return;
  }
  const contents = await readFile(new URL(`.${path}`, ROOT));
  response.writeHead(200, {
    "Content-Type": FILES.get(path), "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff", "Referrer-Policy": "no-referrer"
  });
  response.end(request.method === "HEAD" ? undefined : contents);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const server = crearServidorRoadmap();
  server.on("error", (error) => {
    console.error(error.code === "EADDRINUSE"
      ? `El puerto ${PORT} ya está ocupado. Comprueba el seguimiento existente.`
      : `No se pudo iniciar el seguimiento: ${error.code || "error local"}`);
    process.exitCode = 1;
  });
  server.listen(PORT, HOST, () => {
    console.log(`Roadmap: http://${HOST}:${PORT}/docs/seguimiento/roadmap.html`);
    console.log("Actualización automática desde plan.json. Ctrl+C para cerrar.");
  });
}
