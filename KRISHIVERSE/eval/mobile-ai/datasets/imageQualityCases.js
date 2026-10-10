/**
 * eval/mobile-ai/datasets/imageQualityCases.js — procedural synthetic images
 * for the image-quality gate benchmark.
 *
 * PROVENANCE: 100% synthetic (generated here, deterministic, seeded). These
 * measure gate behaviour on constructed signals ONLY. They are NOT field
 * images, NOT expert-labelled, and cannot support any claim about field
 * accuracy or false-diagnosis reduction on real photos.
 */

function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a += 0x6d2b79f5;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const W = 160;
const H = 160;

function buf() {
  return new Uint8ClampedArray(W * H * 4);
}

function setPx(d, x, y, r, g, b) {
  const i = (y * W + x) * 4;
  d[i] = r; d[i + 1] = g; d[i + 2] = b; d[i + 3] = 255;
}

function boxBlur(d, radius, passes) {
  for (let p = 0; p < passes; p++) {
    const src = Uint8ClampedArray.from(d);
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        let rs = 0; let gs = 0; let bs = 0; let n = 0;
        for (let dy = -radius; dy <= radius; dy++) {
          for (let dx = -radius; dx <= radius; dx++) {
            const xx = x + dx; const yy = y + dy;
            if (xx < 0 || yy < 0 || xx >= W || yy >= H) continue;
            const i = (yy * W + xx) * 4;
            rs += src[i]; gs += src[i + 1]; bs += src[i + 2]; n++;
          }
        }
        const i = (y * W + x) * 4;
        d[i] = rs / n; d[i + 1] = gs / n; d[i + 2] = bs / n;
      }
    }
  }
}

function soilBackground(d, rnd) {
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const n = rnd();
      setPx(d, x, y, 118 + n * 30, 86 + n * 24, 58 + n * 18);
    }
  }
}

function drawLeaf(d, cx, cy, rx, ry, rnd, withVeins = true) {
  for (let y = Math.max(0, cy - ry); y < Math.min(H, cy + ry); y++) {
    for (let x = Math.max(0, cx - rx); x < Math.min(W, cx + rx); x++) {
      const inLeaf = ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1;
      if (!inLeaf) continue;
      const vein = withVeins && (Math.abs((x - cx) % 7) < 1 || Math.abs((y - cy) % 11) < 1);
      const n = rnd() * 26;
      if (vein) setPx(d, x, y, 150 + n, 170 + n, 90);
      else setPx(d, x, y, 44 + n, 118 + n, 40 + n * 0.5);
    }
  }
}

/** Well-focused green leaf on soil, textured → expected USABLE control. */
export function sharpLeaf(seed = 1) {
  const rnd = mulberry32(seed);
  const d = buf();
  soilBackground(d, rnd);
  drawLeaf(d, 80, 80, 58, 46, rnd);
  return { data: d, width: W, height: H };
}

/** Same scene, heavy box blur → expected BLURRY. */
export function blurredLeaf(seed = 2) {
  const img = sharpLeaf(seed);
  boxBlur(img.data, 3, 3);
  return img;
}

/** Very dark exposure → expected TOO_DARK. */
export function darkLeaf(seed = 3) {
  const img = sharpLeaf(seed);
  for (let i = 0; i < img.data.length; i += 4) {
    img.data[i] *= 0.22; img.data[i + 1] *= 0.22; img.data[i + 2] *= 0.22;
  }
  return img;
}

/** Over-exposed → expected TOO_BRIGHT. */
export function brightLeaf(seed = 4) {
  const img = sharpLeaf(seed);
  for (let i = 0; i < img.data.length; i += 4) {
    img.data[i] = Math.min(255, img.data[i] * 1.55 + 70);
    img.data[i + 1] = Math.min(255, img.data[i + 1] * 1.55 + 70);
    img.data[i + 2] = Math.min(255, img.data[i + 2] * 1.55 + 70);
  }
  return img;
}

/** Leaf occupies ~1.5% of the frame → expected LEAF_TOO_SMALL. */
export function tinyLeaf(seed = 5) {
  const rnd = mulberry32(seed);
  const d = buf();
  soilBackground(d, rnd);
  drawLeaf(d, 80, 80, 13, 10, rnd, false);
  return { data: d, width: W, height: H };
}

/** No plant at all (uniform gray texture) → expected NO_PLANT. */
export function noPlant(seed = 6) {
  const rnd = mulberry32(seed);
  const d = buf();
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const n = rnd();
      setPx(d, x, y, 118 + n * 60, 116 + n * 60, 112 + n * 60);
    }
  }
  return { data: d, width: W, height: H };
}

/** Non-leaf object: paper/book-like lined texture → expected NO_PLANT. */
export function nonLeafObject(seed = 7) {
  const rnd = mulberry32(seed);
  const d = buf();
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const line = y % 12 < 2 && x % 40 < 34;
      const n = rnd() * 24;
      if (line) setPx(d, x, y, 40 + n, 40 + n, 44 + n);
      else setPx(d, x, y, 205 + n, 200 + n, 190 + n);
    }
  }
  return { data: d, width: W, height: H };
}

/** Plant pixels only in the border ring, center is bare soil → EXPECTED EXCESSIVE_BACKGROUND. */
export function backgroundHeavy(seed = 8) {
  const rnd = mulberry32(seed);
  const d = buf();
  soilBackground(d, rnd);
  const band = 18;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const edge = x < band || x >= W - band || y < band || y >= H - band;
      if (edge && ((x + y) % 3 !== 0)) {
        const n = rnd() * 22;
        setPx(d, x, y, 46 + n, 120 + n, 42 + n);
      }
    }
  }
  return { data: d, width: W, height: H };
}

export const IMAGE_QUALITY_CASES = [
  { id: "iq-sharp-leaf", origin: "synthetic-screening", build: sharpLeaf, expectedFlags: [], expectedVerdict: "usable" },
  { id: "iq-blurred", origin: "synthetic-screening", build: blurredLeaf, expectedFlags: ["blurry"], expectedVerdict: "unusable" },
  { id: "iq-dark", origin: "synthetic-screening", build: darkLeaf, expectedVerdict: "unusable", expectedFlags: ["too_dark"] },
  { id: "iq-bright", origin: "synthetic-screening", build: brightLeaf, expectedVerdict: "unusable", expectedFlags: ["too_bright"] },
  { id: "iq-tiny-leaf", origin: "synthetic-screening", build: tinyLeaf, expectedVerdict: "unusable", expectedFlags: ["leaf_too_small"] },
  { id: "iq-no-plant", origin: "synthetic-screening", build: noPlant, expectedVerdict: "unusable", expectedFlags: ["no_plant_or_leaf"] },
  { id: "iq-non-leaf", origin: "synthetic-screening", build: nonLeafObject, expectedVerdict: "unusable", expectedFlags: ["no_plant_or_leaf"] },
  { id: "iq-background-heavy", origin: "synthetic-screening", build: backgroundHeavy, expectedVerdict: "unusable", expectedFlags: ["excessive_background"] },
];

export const IMAGE_QUALITY_SUMMARY = {
  total: IMAGE_QUALITY_CASES.length,
  groundTruth: 0,
  origin: "synthetic-screening (procedural, seeded)",
  note: "procedural synthetic images (seeded). Gate behaviour on constructed signals only — NOT field images.",
};
