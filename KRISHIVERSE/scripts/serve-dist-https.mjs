// Self-contained HTTPS static server for the built PWA (dist/), bound to a
// specific LAN IP. Generates its own self-signed cert (SAN covers the host)
// using the repo's existing `selfsigned` dependency, so QA can test the real
// offline PWA against the production build over HTTPS without manual cert work.
// Usage: node scripts/serve-dist-https.mjs [host] [port]
import https from "node:https";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dist = path.resolve(__dirname, "..", "dist");
const host = process.argv[2] || "0.0.0.0";
const port = Number(process.argv[3] || 4173);

function detectLanIp() {
  const ifaces = os.networkInterfaces();
  const candidates = [];
  for (const name of Object.keys(ifaces)) {
    for (const iface of ifaces[name] || []) {
      if (iface.family === "IPv4" && !iface.internal) {
        candidates.push(iface.address);
      }
    }
  }
  const isPrivate = (ip) =>
    /^10\./.test(ip) || /^192\.168\./.test(ip) || /^172\.(1[6-9]|2\d|3[01])\./.test(ip);
  const isVirtualHost = (ip) =>
    /^169\.254\./.test(ip) || /^192\.168\.(5[6-9]|1[0-9]{2})\./.test(ip);
  // Prefer a real LAN address (skip link-local + common VirtualBox/VMware hosts).
  const lan = candidates.find((ip) => isPrivate(ip) && !isVirtualHost(ip));
  const fallback = candidates.find((ip) => !isVirtualHost(ip));
  return lan || fallback || "127.0.0.1";
}

// The IP that phones/servers should actually connect to. When the user asks to
// bind all interfaces ("0.0.0.0"), we still need a concrete IP cert SAN + URL.
const lanIp = detectLanIp();
const reachableIp = host === "0.0.0.0" || host === "::" ? lanIp : host;

const certPath = path.join(os.tmpdir(), "krishi-selfsigned.pem");

if (!fs.existsSync(certPath)) {
  const selfsigned = require("selfsigned");
  const pems = await selfsigned.generate(undefined, {
    days: 365,
    keySize: 2048,
    extensions: [
      {
        name: "subjectAltName",
        altNames: [
          { type: 2, value: reachableIp },
          { type: 2, value: "localhost" },
          { type: 2, value: "127.0.0.1" },
        ],
      },
    ],
  });
  fs.writeFileSync(certPath, `${pems.private}\n${pems.cert}\n`);
  console.error(`Wrote self-signed cert to ${certPath}`);
}

const httpsOpts = {
  key: fs.readFileSync(certPath),
  cert: fs.readFileSync(certPath),
};

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript",
  ".mjs": "application/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".webmanifest": "application/manifest+json",
  ".wasm": "application/wasm",
  ".onnx": "application/octet-stream",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ico": "image/x-icon",
};

const handler = (req, res) => {
  let urlPath;
  try {
    urlPath = decodeURIComponent(new URL(req.url, "https://localhost").pathname);
  } catch {
    res.writeHead(400);
    res.end("Bad request");
    return;
  }
  if (urlPath === "/") urlPath = "/index.html";

  const file = path.join(dist, urlPath);
  if (!file.startsWith(dist)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }

  fs.readFile(file, (err, data) => {
    if (err) {
      fs.readFile(path.join(dist, "index.html"), (e2, indexHtml) => {
        if (e2) {
          res.writeHead(404);
          res.end("Not found");
          return;
        }
        res.writeHead(200, { "Content-Type": MIME[".html"], "Cache-Control": "no-cache" });
        res.end(indexHtml);
      });
      return;
    }
    res.writeHead(200, {
      "Content-Type": MIME[path.extname(file)] || "application/octet-stream",
      "Cache-Control": "no-cache",
    });
    res.end(data);
  });
};

const server = https.createServer(httpsOpts, handler);
server.listen(port, host, () => {
  console.log(`[ready] HTTPS PWA server bound to ${host}:${port} (dist=${dist})`);
  console.log(`Phone URL: https://${reachableIp}:${port}/`);
});

server.on("error", (err) => {
  console.error("[error] Failed to start HTTPS server:", err.message);
  process.exit(1);
});
