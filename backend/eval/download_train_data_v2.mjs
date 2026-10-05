// Download expanded PlantVillage training subsets: 800 images per class.
// Excludes eval images by SOURCE FILENAME (not by index), guaranteeing zero overlap
// regardless of listing order changes.  Programmatic overlap check included.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_ROOT = path.join(__dirname, 'train_data_v2');
const PER_CLASS = 800;
const CONCURRENCY = 12;

const REPO = 'spMohanty/PlantVillage-Dataset';
const RAW = `https://raw.githubusercontent.com/${REPO}/master/raw/color`;

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
  const headers = { 'User-Agent': 'krishiverse-eval' };
  if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  const root = await getTree('master', headers);
  const raw = root.tree.find(t => t.path === 'raw');
  const rawTree = await getTree(raw.sha, headers);
  const color = rawTree.tree.find(t => t.path === 'color');
  const colorTree = await getTree(color.sha, headers);
  const byClass = {};
  for (const cls of CLASSES) {
    const entry = colorTree.tree.find(t => t.path === cls);
    if (!entry) throw new Error(`class dir missing: raw/color/${cls}`);
    const clsTree = await getTree(entry.sha, headers);
    byClass[cls] = clsTree.tree
      .filter(t => t.type === 'blob' && /\.JPG$/i.test(t.path))
      .map(t => t.path)
      .sort();
  }
  return byClass;
}

async function download(cls, name, outPath) {
  const res = await fetch(`${RAW}/${encodeURIComponent(cls)}/${encodeURIComponent(name)}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length < 1000) throw new Error(`too small (${buf.length})`);
  if (buf[0] !== 0xff || buf[1] !== 0xd8) throw new Error('not JPEG');
  fs.writeFileSync(outPath, buf);
  return buf.length;
}

async function worker(pool) {
  while (pool.length) {
    const item = pool.shift();
    try {
      await download(item.cls, item.name, item.file);
      process.stdout.write('.');
    } catch (e) {
      process.stdout.write('x');
      if (fs.existsSync(item.file)) fs.rmSync(item.file);
    }
  }
}

async function main() {
  // Load eval manifest — these source filenames MUST NOT appear in training
  const evalManifest = JSON.parse(fs.readFileSync(path.join(__dirname, 'dataset', 'manifest.json'), 'utf8'));
  const evalByClass = {};
  for (const row of evalManifest) {
    evalByClass[row.class] = evalByClass[row.class] || new Set();
    evalByClass[row.class].add(row.source);
  }

  // Also load old training manifest to know what's already been downloaded
  const oldManifestPath = path.join(__dirname, 'train_data', 'train_manifest.json');
  const haveOld = fs.existsSync(oldManifestPath);

  const listings = await fetchClassListings();
  const summary = [];

  for (const cls of CLASSES) {
    const dirName = cls.replace(/[,\s]+/g, '_');
    const dir = path.join(OUT_ROOT, dirName);
    fs.mkdirSync(dir, { recursive: true });

    const allNames = listings[cls];
    console.log(`${cls}: ${allNames.length} total JPGs in PlantVillage`);

    // Filter OUT eval images by source filename (not by position)
    const evalSet = evalByClass[dirName] || new Set();
    const available = allNames.filter(name => !evalSet.has(name));
    console.log(`  After excluding ${evalSet.size} eval images: ${available.length} available for training`);

    if (available.length < PER_CLASS) {
      console.error(`  FATAL: only ${available.length} available, need ${PER_CLASS}. Aborting.`);
      process.exit(1);
    }

    // Take first PER_CLASS from the filtered list (sorted, deterministic)
    const trainNames = available.slice(0, PER_CLASS);

    // Programmatic zero-overlap verification
    const trainSet = new Set(trainNames);
    let overlapCount = 0;
    for (const s of evalSet) {
      if (trainSet.has(s)) overlapCount++;
    }
    if (overlapCount > 0) {
      console.error(`  FATAL: ${overlapCount} overlaps detected! Aborting.`);
      process.exit(1);
    }
    console.log(`  VERIFIED: 0 overlap between ${trainNames.length} training and ${evalSet.size} eval images`);

    // Download
    const pool = [];
    for (let i = 0; i < trainNames.length; i++) {
      pool.push({
        cls,
        name: trainNames[i],
        file: path.join(dir, `img${i + 1}.jpg`),
      });
    }
    const procs = Array.from({ length: CONCURRENCY }, () => worker(pool));
    await Promise.all(procs);

    const ok = fs.readdirSync(dir).filter(f => f.endsWith('.jpg')).length;
    summary.push({ dir: dirName, sourceClass: cls, ok, fail: trainNames.length - ok, totalAvailable: allNames.length, evalHeldOut: evalSet.size });
    console.log(`  Downloaded: ${ok}/${trainNames.length}`);
  }

  fs.writeFileSync(
    path.join(OUT_ROOT, 'train_manifest.json'),
    JSON.stringify({ runAt: new Date().toISOString(), perClass: PER_CLASS, summary }, null, 2)
  );

  console.log('\n=== EXPANSION SUMMARY ===');
  for (const s of summary) {
    console.log(`${s.dir}: ${s.ok}/${PER_CLASS} (${s.totalAvailable} in PlantVillage, ${s.evalHeldOut} eval held out)`);
  }
  console.log('DONE.');
}

main().catch(e => { console.error(e); process.exit(1); });
