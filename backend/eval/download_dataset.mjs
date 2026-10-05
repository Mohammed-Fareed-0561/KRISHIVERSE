// Download a small labeled PlantVillage subset (6 classes x 5 images) for evaluation.
// Verifies each file is a valid JPEG (magic bytes) and non-empty.
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_ROOT = path.resolve(__dirname, 'dataset');
const REPO = 'spMohanty/PlantVillage-Dataset';
const API = `https://api.github.com/repos/${REPO}/contents/raw/color`;
const RAW = `https://raw.githubusercontent.com/${REPO}/master/raw/color`;

const CLASSES = [
  'Tomato___Early_blight',
  'Tomato___Late_blight',
  'Tomato___healthy',
  'Potato___Early_blight',
  'Potato___Late_blight',
  'Pepper,_bell___Bacterial_spot',
];

const PER_CLASS = 5;

async function listFiles(cls) {
  const url = `${API}/${encodeURIComponent(cls)}?per_page=100`;
  const res = await fetch(url, { headers: { 'User-Agent': 'krishiverse-eval' } });
  if (!res.ok) throw new Error(`list ${cls}: HTTP ${res.status}`);
  const entries = await res.json();
  return entries.filter((e) => /\.JPG$/i.test(e.name)).map((e) => e.name);
}

async function download(cls, name, outPath) {
  const res = await fetch(`${RAW}/${encodeURIComponent(cls)}/${encodeURIComponent(name)}`);
  if (!res.ok) throw new Error(`download ${name}: HTTP ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length < 1000) throw new Error(`download ${name}: file too small (${buf.length} bytes)`);
  if (buf[0] !== 0xff || buf[1] !== 0xd8) throw new Error(`download ${name}: not a JPEG`);
  await fs.writeFile(outPath, buf);
  return buf.length;
}

const summary = [];
for (const cls of CLASSES) {
  const dirName = cls.replace(/[,\s]+/g, '_');
  const dir = path.join(OUT_ROOT, dirName);
  await fs.mkdir(dir, { recursive: true });
  const files = await listFiles(cls);
  const pick = files.slice(0, PER_CLASS);
  let ok = 0;
  for (let i = 0; i < pick.length; i++) {
    const out = path.join(dir, `img${i + 1}.jpg`);
    try {
      const size = await download(cls, pick[i], out);
      summary.push({ class: dirName, file: `img${i + 1}.jpg`, source: pick[i], bytes: size, status: 'ok' });
      ok++;
    } catch (e) {
      summary.push({ class: dirName, file: `img${i + 1}.jpg`, source: pick[i], bytes: 0, status: `ERR: ${e.message}` });
    }
  }
  console.log(`${cls}: downloaded ${ok}/${PER_CLASS}`);
}

console.log('\n=== DOWNLOAD SUMMARY ===');
let totalOk = 0;
for (const row of summary) {
  if (row.status === 'ok') totalOk++;
  console.log(`${row.status === 'ok' ? 'OK ' : 'ERR'} ${row.class}/${row.file} <- ${row.source} (${row.bytes} bytes) ${row.status === 'ok' ? '' : row.status}`);
}
console.log(`\nTotal images ready: ${totalOk}/${summary.length}`);
await fs.writeFile(path.join(OUT_ROOT, 'manifest.json'), JSON.stringify(summary, null, 2));