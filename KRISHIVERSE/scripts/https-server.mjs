// Local HTTPS static server for the built PWA (dist/), using a self-signed
// cert so WebGPU/secure-context features work in the browser.
// Usage: node scripts/https-server.mjs [port] [pfxPath] [passphrase]
import https from "node:https";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dist = path.resolve(__dirname, "..", "dist");
const port = Number(process.argv[2] || 4173);
const pfxPath = process.argv[3] || path.join(os.tmpdir(), "krishi-dev.pfx");
const passphrase = process.argv[4] || "krishi-dev";

if (!fs.existsSync(pfxPath)) {
  console.error("PFX not found at", pfxPath);
  console.error('Generate one:  $cert = New-SelfSignedCertificate -DnsName "localhost" -CertStoreLocation "Cert:\\CurrentUser\\My" -KeyExportPolicy Exportable; Export-PfxCertificate -Cert $cert -FilePath <path> -Password (ConvertTo-SecureString "krishi-dev" -Force -AsPlainText)');
  process.exit(1);
}

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

const server = https.createServer({ pfx: fs.readFileSync(pfxPath), passphrase }, (req, res) => {
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
      // SPA fallback -> index.html (works for /diagnose, /ask, ...)
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
});

server.listen(port, () => console.log(`HTTPS PWA server: https://localhost:${port}  (dist=${dist})`));