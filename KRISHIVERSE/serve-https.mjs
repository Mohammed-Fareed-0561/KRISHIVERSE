// Generate a self-signed cert + serve the production build over HTTPS so PWA/WebGPU
// can be tested from a phone on the same LAN.  Run:  node serve-https.mjs
import { createServer } from "node:https";
import { readFileSync, existsSync, statSync } from "node:fs";
import { join, extname } from "node:path";
import { networkInterfaces } from "node:os";
import selfsigned from "selfsigned";

const PORT = Number(process.env.PORT) || 3000;
const DIST = new URL("./dist/", import.meta.url);

// ── MIME types ──────────────────────────────────────────────────────────────
const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".mjs": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".woff2": "font/woff2",
  ".wasm": "application/wasm",
  ".onnx": "application/octet-stream",
  ".ico": "image/x-icon",
  ".txt": "text/plain; charset=utf-8",
  ".webmanifest": "application/manifest+json",
};

// ── Self-signed certificate ─────────────────────────────────────────────────
// Gather all LAN IPs so the cert is valid for every network interface.
const lanIPs = Object.values(networkInterfaces())
  .flat()
  .filter((n) => n.family === "IPv4" && !n.internal)
  .map((n) => n.address);

const sanEntries = [
  { type: 2, value: "localhost" },
  { type: 7, ip: "127.0.0.1" },
  ...lanIPs.map((ip) => ({ type: 7, ip })),
];

const pems = await selfsigned.generate(
  [{ name: "commonName", value: "localhost" }],
  {
    days: 365,
    extensions: [
      {
        name: "subjectAltName",
        altNames: sanEntries,
      },
    ],
  }
);

// ── Static file server ──────────────────────────────────────────────────────
function serve(req, res) {
  let urlPath = new URL(req.url, "https://localhost").pathname;
  if (urlPath === "/") urlPath = "/index.html";

  const filePath = join(DIST.pathname, urlPath);

  // SPA fallback: if the path doesn't resolve to a file, serve index.html
  if (!existsSync(filePath) || !statSync(filePath).isFile()) {
    const fallback = join(DIST.pathname, "index.html");
    if (!existsSync(fallback)) {
      res.writeHead(404);
      res.end("Not found");
      return;
    }
    const body = readFileSync(fallback);
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(body);
    return;
  }

  const ext = extname(filePath).toLowerCase();
  const mime = MIME[ext] || "application/octet-stream";
  const body = readFileSync(filePath);
  res.writeHead(200, { "Content-Type": mime });
  res.end(body);
}

const server = createServer({ key: pems.private, cert: pems.cert }, serve);

server.listen(PORT, "0.0.0.0", () => {
  console.log("\nKrishiVerse HTTPS server running:\n");
  console.log(`  Local:   https://localhost:${PORT}`);
  for (const ip of lanIPs) {
    console.log(`  Phone:   https://${ip}:${PORT}`);
  }
  console.log("\nAccept the self-signed cert warning on your phone, then test the PWA.");
  console.log("Press Ctrl+C to stop.\n");
});
