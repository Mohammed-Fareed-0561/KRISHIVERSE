// Task 1 runner: sends every dataset image through the REAL Llama 4 Scout Vision
// Groq call (scout_classifier.mjs), records per-image predictions vs ground truth,
// and computes accuracy, per-class precision/recall, and a confusion matrix.
// Every image is logged individually; errors are logged, not dropped.
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { classifyImage, SCOUT_MODEL } from './scout_classifier.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATASET = path.resolve(__dirname, 'dataset');

// directory name -> ground-truth class label (PlantVillage folder names)
const GT_BY_DIR = {
  Tomato___Early_blight: 'Tomato Early Blight',
  Tomato___Late_blight: 'Tomato Late Blight',
  Tomato___healthy: 'Tomato Healthy',
  Potato___Early_blight: 'Potato Early Blight',
  Potato___Late_blight: 'Potato Late Blight',
  Pepper__bell___Bacterial_spot: 'Pepper Bell Bacterial Spot',
};

async function collectImages() {
  const dirs = await fs.readdir(DATASET, { withFileTypes: true });
  const images = [];
  for (const d of dirs.filter((x) => x.isDirectory())) {
    const files = (await fs.readdir(path.join(DATASET, d.name))).filter((f) => /\.jpe?g$/i.test(f));
    for (const f of files) {
      images.push({ path: path.join(DATASET, d.name, f), gt: GT_BY_DIR[d.name], dir: d.name, file: f });
    }
  }
  return images;
}

function confusionMatrix(rows, labels) {
  const mat = {};
  for (const r of rows) mat[`${r.gt}||${r.pred}`] = (mat[`${r.gt}||${r.pred}`] || 0) + 1;
  const out = [];
  for (const a of labels) {
    const row = labels.map((b) => mat[`${a}||${b}`] || 0);
    out.push({ actual: a, row });
  }
  return { labels, matrix: out };
}

const images = await collectImages();
console.log(`Model under test: ${SCOUT_MODEL}`);
console.log(`Total images: ${images.length}`);
console.log(`Run started: ${new Date().toISOString()}`);
console.log('');

const rows = [];
const errors = [];
let i = 0;
for (const img of images) {
  i++;
  const b64 = (await fs.readFile(img.path)).toString('base64');
  const t0 = Date.now();
  try {
    const res = await classifyImage(b64);
    const ms = Date.now() - t0;
    const ok = res.predicted === img.gt ? 'CORRECT' : 'WRONG';
    rows.push({ ...img, predicted: res.predicted, correct: res.predicted === img.gt, ms });
    console.log(`[${i}/${images.length}] ${ok}  gt="${img.gt}"  pred="${res.predicted}"  (${ms}ms)  ${img.dir}/${img.file}`);
  } catch (e) {
    const ms = Date.now() - t0;
    errors.push({ ...img, error: e.message, ms });
    console.log(`[${i}/${images.length}] ERROR  gt="${img.gt}"  (${ms}ms)  ${img.dir}/${img.file}: ${e.message}`);
  }
}

const labels = Object.values(GT_BY_DIR);
const good = rows.filter((r) => r.correct);
const accuracy = rows.length ? good.length / rows.length : 0;

console.log('\n=== AGGREGATE ===');
console.log(`Total images: ${images.length}`);
console.log(`Successfully classified: ${rows.length}`);
console.log(`Failed / errored: ${errors.length}`);
console.log(`Overall accuracy: ${(accuracy * 100).toFixed(2)}% (${good.length}/${rows.length} of classified; ${good.length}/${images.length} of all)`);

console.log('\n=== PER-CLASS PRECISION / RECALL ===');
for (const lab of labels) {
  const tp = rows.filter((r) => r.gt === lab && r.pred === lab).length;
  const fp = rows.filter((r) => r.gt !== lab && r.pred === lab).length;
  const fn = rows.filter((r) => r.gt === lab && r.pred !== lab).length;
  const p = tp + fp ? tp / (tp + fp) : 0;
  const r = tp + fn ? tp / (tp + fn) : 0;
  const f1 = p + r ? (2 * p * r) / (p + r) : 0;
  console.log(`${lab}: precision=${(p * 100).toFixed(1)}% recall=${(r * 100).toFixed(1)}% f1=${f1.toFixed(3)} (tp=${tp} fp=${fp} fn=${fn})`);
}

console.log('\n=== CONFUSION MATRIX ===');
const { labels: clabels, matrix } = confusionMatrix(rows, labels);
console.log('actual \\ predicted' + clabels.map((c) => `| ${c}`).join(''));
for (const row of matrix) {
  console.log(row.actual.padEnd(26) + row.row.map((v) => `| ${String(v).padEnd(24, ' ')}`).join(''));
}

if (errors.length) {
  console.log('\n=== ERRORS (NOT DROPPED) ===');
  for (const e of errors) console.log(`- ${e.dir}/${e.file} (gt=${e.gt}): ${e.error}`);
}

await fs.writeFile(
  path.join(__dirname, 'task1_results.json'),
  JSON.stringify({ model: SCOUT_MODEL, runAt: new Date().toISOString(), accuracy, total: images.length, classified: rows.length, errors: errors.length, rows, errors }, null, 2)
);
console.log('\nFull per-image log written to backend/eval/task1_results.json');