// Необязательный мини-сервер для виджета.
// Нужен, только если OBS блокирует запросы к OpenDota из file://.
//
//   node serve.mjs            → http://127.0.0.1:8787
//   node serve.mjs 9000       → свой порт
//
// Если порт занят — сервер сам возьмёт следующий свободный и напишет верный адрес.
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));
const types = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
};

const startPort = Number(process.argv[2] || process.env.PORT || 8787);
const maxTries = 20;

const server = http.createServer((req, res) => {
  const url = decodeURIComponent((req.url || "/").split("?")[0]);
  const file = path.join(root, url === "/" ? "index.html" : url);
  if (!file.startsWith(root) || !fs.existsSync(file) || !fs.statSync(file).isFile()) {
    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    return res.end("not found");
  }
  res.writeHead(200, { "Content-Type": types[path.extname(file)] || "application/octet-stream", "Cache-Control": "no-store" });
  fs.createReadStream(file).pipe(res);
});

function hint(port) {
  console.log("");
  console.log(`  Виджет:      http://127.0.0.1:${port}/index.html`);
  console.log(`  Демо-данные: http://127.0.0.1:${port}/index.html?mock=1`);
  console.log("");
  console.log(`  В OBS → Источник → Браузер → URL:`);
  console.log(`  http://127.0.0.1:${port}/index.html?id=ВАШ_STEAM_ID&refresh=30&matches=10`);
  console.log("");
  console.log("  Не закрывайте это окно, пока OBS использует виджет. Ctrl+C — остановить.");
}

server.on("error", (err) => {
  if (err.code === "EADDRINUSE") {
    const next = port + 1;
    if (next >= startPort + maxTries) {
      console.error(`Не нашёл свободный порт в диапазоне ${startPort}–${next - 1}.`);
      console.error("Закройте прошлый serve.mjs (это же окно консоли) или задайте порт сам: node serve.mjs 9000");
      process.exit(1);
    }
    console.log(`Порт ${port} занят — пробую ${next}…`);
    port = next;
    server.listen(port, "127.0.0.1");
    return;
  }
  console.error("Ошибка запуска сервера:", err.message);
  console.error("Если Node.js требует разрешение брандмауэра — нажмите «Разрешить» (только для локального 127.0.0.1).");
  process.exit(1);
});

let port = startPort;
server.listen(port, "127.0.0.1");
server.on("listening", () => hint(port));
