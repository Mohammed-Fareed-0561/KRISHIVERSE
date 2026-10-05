// Serves ONLY the certificate (not the private key) over plain HTTP, so a
// phone can download and install it as a trusted CA without email/USB transfer.
// Usage: node scripts/serve-cert-http.mjs [host] [port]
import http from "node:http";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const host = process.argv[2] || "0.0.0.0";
const port = Number(process.argv[3] || 8080);
const certPath = path.join(os.tmpdir(), "krishi-selfsigned.pem");

// The HTTPS server (serve-dist-https.mjs) writes the cert (private key + cert
// concat) on first run, so it may not exist yet when we start. Poll for it
// instead of assuming it is ready.
const POLL_INTERVAL_MS = 500;
const POLL_TIMEOUT_MS = 15000;

function extractCert(pemText) {
  const m = pemText.match(/-----BEGIN CERTIFICATE-----[\s\S]*?-----END CERTIFICATE-----/);
  if (!m) throw new Error(`No CERTIFICATE block found in ${certPath}`);
  return m[0].replace(/\r\n/g, "\n") + "\n";
}

async function waitForCert() {
  const deadline = Date.now() + POLL_TIMEOUT_MS;
  while (Date.now() < deadline) {
    if (fs.existsSync(certPath)) {
      try {
        return extractCert(fs.readFileSync(certPath, "utf8"));
      } catch (e) {
        throw e;
      }
    }
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
  }
  const err = new Error(
    `Cert not found at ${certPath} after ${POLL_TIMEOUT_MS}ms. ` +
      "Is serve-dist-https.mjs running? It generates this cert on first start."
  );
  err.code = "ECERTTIMEOUT";
  throw err;
}

const cert = await waitForCert();

const server = http.createServer((req, res) => {
  if (req.url === "/" || req.url === "/krishi-selfsigned.pem") {
    res.writeHead(200, {
      "Content-Type": "application/x-pem-file",
      "Content-Disposition": 'attachment; filename="krishi-selfsigned.pem"',
      "Cache-Control": "no-store",
    });
    res.end(cert);
    return;
  }  res.writeHead(404);
  res.end("Not found. Download the cert at /krishi-selfsigned.pem");
});

server.listen(port, host, () => {
  console.log(`[ready] Cert HTTP server bound to ${host}:${port}`);
  console.log(`Phone cert URL: http://${host === "0.0.0.0" ? "<LAN-IP>" : host}:${port}/krishi-selfsigned.pem`);
});

server.on("error", (err) => {
  console.error("[error] Failed to start cert server:", err.message);
  process.exit(1);
});
