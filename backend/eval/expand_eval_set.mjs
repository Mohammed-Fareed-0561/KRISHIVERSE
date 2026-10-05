// Expand the held-out eval set from 5 to 20 images per class (120 total).
// Train data used PlantVillage listing indices [5:305] per class (download_train_data.mjs);
// the current 5 eval images are indices [0:5]. This script downloads indices [305:320]
// per class as img6..img20.jpg and VERIFIES zero filename overlap with:
//   - the reconstructed training file list ([5:305])
//   - the existing eval sources ([0:5], from dataset/manifest.json)
// Run: node expand_eval_set.mjs
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_ROOT = path.resolve(__dirname, 'dataset');
const REPO = 'spMohanty/PlantVillage-Dataset';
const API = `https://api.github.com/repos/${REPO}/contents/raw/color`;
const RAW = `https://raw.githubusercontent.com/${REPO}/master/raw/color`;

const TRAIN_SKIP_FIRST = 5; // [0:5] = existing eval
const TRAIN_PER_CLASS = 300; // [5:305] = training
const NEW_EVAL_START = 305; // first index after the training slice
const NEW_EVAL_COUNT = 15; // 15 new + 5 existing = 20 per class

const CLASSES = [
  'Tomato___Early_blight',
  'Tomato___Late_blight',
  'Tomato___healthy',
  'Potato___Early_blight',
  'Potato___Late_blight',
  'Pepper,_bell___Bacterial_spot',
];

async function getTree(ref, headers) {
  const res = await fetch(`https://api.github.com/repos/${REPO}/git/trees/${ref}`, { headers });
  if (!res.ok) throw new Error(`tree ${ref}: HTTP ${res.status}`);
  return res.json();
}

async function fetchClassListings() {
  // Walk master -> raw -> color -> <class> via the Git Trees API.
  // (A single ?recursive=1 call would be truncated: repo has >100k entries.)
  // Set GITHUB_TOKEN to raise the rate limit to 5000/hr (never logged).
  const headers = { 'User-Agent': 'krishiverse-eval' };
  if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  const root = await getTree('master', headers);
  const raw = root.tree.find((t) => t.path === 'raw');
  if (!raw) throw new Error('no raw/ in repo root tree');
  const color = await getTree(raw.sha, headers);
  const colorDir = color.tree.find((t) => t.path === 'color');
  if (!colorDir) throw new Error('no raw/color/ in raw tree');
  const colorTree = await getTree(colorDir.sha, headers);
  const byClass = {};
  for (const cls of CLASSES) {
    const entry = colorTree.tree.find((t) => t.path === cls);
    if (!entry) throw new Error(`class dir missing: raw/color/${cls}`);
    const clsTree = await getTree(entry.sha, headers);
    byClass[cls] = clsTree.tree
      .filter((t) => t.type === 'blob' && /\.JPG$/i.test(t.path))
      .map((t) => t.path)
      .sort();
  }
  return byClass;
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
const listings = await fetchClassListings();
for (const cls of CLASSES) {
  const dirName = cls.replace(/[,\s]+/g, '_');
  const dir = path.join(OUT_ROOT, dirName);
  await fs.mkdir(dir, { recursive: true });

  const names = listings[cls];
  if (names.length < NEW_EVAL_START + NEW_EVAL_COUNT) {
    throw new Error(`${cls}: only ${names.length} files listed, need ${NEW_EVAL_START + NEW_EVAL_COUNT}`);
  }

  // Ordering sanity check: our sorted listing must reproduce the exact first-5 sources
  // the original eval download recorded (proves sort order matches the original API order,
  // so the [5:305] training reconstruction is sound).
  const existingManifest = JSON.parse(await fs.readFile(path.join(OUT_ROOT, 'manifest.json'), 'utf8'));
  const existingEvalSources = existingManifest.filter((r) => r.class === dirName).map((r) => r.source);
  const first5 = names.slice(0, 5);
  for (let i = 0; i < 5; i++) {
    if (first5[i] !== existingEvalSources[i]) {
      throw new Error(`ORDER MISMATCH ${cls} idx${i}: sorted=${first5[i]} manifest=${existingEvalSources[i]}`);
    }
  }

  // Reconstruct the exact sets and verify zero overlap.
  const trainNames = names.slice(TRAIN_SKIP_FIRST, TRAIN_SKIP_FIRST + TRAIN_PER_CLASS);
  const newSources = names.slice(NEW_EVAL_START, NEW_EVAL_START + NEW_EVAL_COUNT);

  const check = new Set(trainNames);
  for (const s of existingEvalSources) {
    if (check.has(s)) throw new Error(`OVERLAP: existing eval source ${s} also in train list (${cls})`);
  }
  for (const s of newSources) {
    if (check.has(s)) throw new Error(`OVERLAP: new eval source ${s} also in train list (${cls})`);
    if (existingEvalSources.includes(s)) throw new Error(`OVERLAP: new eval source ${s} duplicates existing eval (${cls})`);
  }
  console.log(`${cls}: verified 0 overlap | train=${trainNames.length} existingEval=${existingEvalSources.length} newList=${newSources.length} (listing total ${names.length})`);

  // Download img6..img20.jpg.
  let ok = 0;
  for (let i = 0; i < newSources.length; i++) {
    const file = `img${TRAIN_SKIP_FIRST + 1 + i}.jpg`; // img6.jpg .. img20.jpg
    const out = path.join(dir, file);
    try {
      const size = await download(cls, newSources[i], out);
      summary.push({ class: dirName, file, source: newSources[i], bytes: size, status: 'ok', origin: 'expansion' });
      ok++;
    } catch (e) {
      summary.push({ class: dirName, file, source: newSources[i], bytes: 0, status: `ERR: ${e.message}`, origin: 'expansion' });
    }
  }
  console.log(`${cls}: downloaded ${ok}/${newSources.length}`);

  // Merge manifest: keep original rows, replace/add expansion rows for this class.
  const keptOld = existingManifest.filter((r) => r.class !== dirName || !summary.some((s) => s.class === r.class && s.file === r.file));
  summary.filter((s) => s.status !== 'ok').forEach(() => {}); // errors recorded but not merged into manifest rows
  const oldRowsForClass = existingManifest.filter((r) => r.class === dirName);
  const newRows = summary.filter((s) => s.class === dirName && s.status === 'ok');
  const mergedClassRows = [...oldRowsForClass, ...newRows].sort(
    (a, b) => Number(a.file.match(/\d+/)[0]) - Number(b.file.match(/\d+/)[0])
  );
  const otherRows = existingManifest.filter((r) => r.class !== dirName);
  await fs.writeFile(path.join(OUT_ROOT, 'manifest.json'), JSON.stringify([...otherRows, ...mergedClassRows], null, 2));
}

console.log('\n=== EXPANSION SUMMARY ===');
const okCount = summary.filter((r) => r.status === 'ok').length;
console.log(`New images ok: ${okCount}/${summary.length}`);
if (okCount !== summary.length) {
  console.error('Some downloads failed - see manifest-less rows above.');
  process.exit(1);
}
console.log('DONE.');
