/**
 * eval/mobile-ai/adapters/needle.js — Needle 3 benchmark adapter (JS side).
 *
 * Runs needleRunner.py as a subprocess ONLY when explicitly enabled:
 *   KV_BENCH_NEEDLE=1            -> require availability (fail loudly if absent)
 *   KV_BENCH_NEEDLE_MODEL=<path> -> path to needle3.cact
 *
 * Privacy: the adapter forces NEEDLE_TELEMETRY=0 and DO_NOT_TRACK=1 into the
 * child environment, mirroring docs/ai/needle-evaluation.md. No farmer data,
 * no KrishiVerse chat history — only benchmark case text is passed.
 */
/* global process: readonly */
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const RUNNER = join(HERE, "needleRunner.py");

function pythonBin() {
  for (const cand of ["python3", "python", "py"]) {
    const probe = spawnSync(cand, ["--version"], { encoding: "utf8" });
    if (!probe.error && /Python/i.test(`${probe.stdout}${probe.stderr}`)) return cand;
  }
  return null;
}

function needlePackageInstalled(py) {
  const probe = spawnSync(py, ["-c", "import needle"], { encoding: "utf8" });
  return probe.status === 0;
}

let cached = null;

export function needleAvailability() {
  if (cached) return cached;
  const py = pythonBin();
  if (!py) {
    cached = { available: false, reason: "no python interpreter found on PATH (python3/python/py)" };
    return cached;
  }
  if (!needlePackageInstalled(py)) {
    cached = {
      available: false,
      reason: "python package 'cactus-needle' not installed",
      howToRun: "pip install cactus-needle   # then: NEEDLE_MODEL_PATH=<path/needle3.cact> KV_BENCH_NEEDLE=1 npx vitest run eval/mobile-ai",
    };
    return cached;
  }
  const model = process.env.KV_BENCH_NEEDLE_MODEL || process.env.NEEDLE_MODEL_PATH || "";
  if (model && !existsSync(model)) {
    cached = { available: false, reason: `NEEDLE_MODEL_PATH not found: ${model}` };
    return cached;
  }
  if (!model) {
    cached = {
      available: false,
      reason: "KV_BENCH_NEEDLE_MODEL/NEEDLE_MODEL_PATH not set (needle3.cact path required)",
      howToRun: "download weights from huggingface.co/Cactus-Compute/needle3, then set KV_BENCH_NEEDLE_MODEL",
    };
    return cached;
  }
  cached = { available: true, python: py, model };
  return cached;
}

/**
 * @returns {{ok:boolean, result?:object, confidence?:number, ms?:number, error?:string}}
 */
export function runNeedle(task, text) {
  const avail = needleAvailability();
  if (!avail.available) return { ok: false, error: avail.reason };
  const child = spawnSync(avail.python, [RUNNER], {
    input: JSON.stringify({ task, text }),
    encoding: "utf8",
    timeout: 30000,
    env: {
      ...process.env,
      NEEDLE_TELEMETRY: "0",   // Needle telemetry is ON by default in the binary
      DO_NOT_TRACK: "1",
      NEEDLE_MODEL_PATH: avail.model,
    },
  });
  if (child.error) return { ok: false, error: String(child.error.message || child.error) };
  try {
    return JSON.parse(child.stdout.trim().split("\n").pop());
  } catch {
    return { ok: false, error: `unparseable needle output: ${(child.stdout || "").slice(0, 200)}` };
  }
}

export const needleArm = {
  id: "needle",
  label: "Cactus Needle 3 (structured extraction / intent / clarification)",
  available: () => needleAvailability().available,
  skipReason: () => needleAvailability().reason,
  howToRun: () => needleAvailability().howToRun
    || "pip install cactus-needle && export KV_BENCH_NEEDLE_MODEL=<needle3.cact> KV_BENCH_NEEDLE=1",
  run: runNeedle,
};

export default needleArm;
