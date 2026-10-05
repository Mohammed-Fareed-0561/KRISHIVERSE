// Download PlantVillage training subsets for the 6 disease classes the on-device
// classifier will support. Skips the first 5 files per class (the held-out eval
// images in backend/eval/dataset) to avoid train/eval leakage.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_ROOT = path.join(__dirname, 'train_data');
const PER_CLASS = 300;
const SKIP_FIRST = 5;
const CONCURRENCY = 12;

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

async function listFiles(cls) {
  const res = await fetch(`${API}/${encodeURIComponent(cls)}?per_page=1000`, {
    headers: { 'User-Agent': 'krishiverse-eval' },
  });
  if (!res.ok) throw new Error(`list ${cls}: HTTP ${res.status}`);
  const entries = await res.json();
  return entries.filter((e) => /\.JPG$/i.test(e.name)).map((e) => e.name);
}

async function worker(pool) {
  while (pool.length) {
    const { url, file } = pool.shift();
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const buf = Buffer.from(await res.arrayBuffer());
      if (buf.length < 1000 || buf[0] !== 0xff || buf[1] !== 0xd8) throw new Error('bad jpeg');
      fs.writeFileSync(file, buf);
      process.stdout.write('.');
    } catch (e) {
      process.stdout.write('x');
      if (fs.existsSync(file)) fs.rmSync(file);
    }
  }
}

async function main() {
  const summary = [];
  for (const cls of CLASSES) {
    const dirName = cls.replace(/[,\s]+/g, '_');
    const dir = path.join(OUT_ROOT, dirName);
    fs.mkdirSync(dir, { recursive: true });
    const files = await listFiles(cls);
    const pick = files.slice(SKIP_FIRST, SKIP_FIRST + PER_CLASS);
    const pool = [];
    pick.forEach((name, i) => {
      pool.push({ url: `${RAW}/${encodeURIComponent(cls)}/${encodeURIComponent(name)}`, file: path.join(dir, `img${i + 1}.jpg`) });
    });
    const procs = Array.from({ length: CONCURRENCY }, () => worker(pool));
    await Promise.all(procs);
    const ok = fs.readdirSync(dir).filter((f) => f.endsWith('.jpg')).length;
    summary.push({ dir: dirName, sourceClass: cls, ok, fail: pick.length - ok, files: pick.length });
    console.log(`\n${dirName}: ${ok}/${pick.length}`);
  }
  fs.writeFileSync(path.join(OUT_ROOT, 'train_manifest.json'), JSON.stringify({ runAt: new Date().toISOString(), perClass: PER_CLASS, summary }, null, 2));
  console.log('\nDONE. manifest at', path.join(OUT_ROOT, 'train_manifest.json'));
}

main().catch((e) => { console.error(e); process.exit(1); });
