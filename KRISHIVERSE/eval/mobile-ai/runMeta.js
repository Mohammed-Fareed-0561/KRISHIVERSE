/**
 * eval/mobile-ai/runMeta.js — reproducibility metadata for benchmark runs.
 *
 * Records: git commit SHA, runtime versions, device/environment, random seed,
 * dataset file hashes, KB version, model artifact hashes. Deterministic where
 * possible; never fabricates a value it cannot read (falls back to "unavailable").
 */
/* global process: readonly */
import { execSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import os from "node:os";

export const BENCHMARK_SEED = 20261008;

const FRONTEND_DIR = process.cwd(); // benchmarks run with KRISHIVERSE as cwd

function safeExec(cmd) {
  try {
    return execSync(cmd, { stdio: ["ignore", "pipe", "ignore"] }).toString().trim();
  } catch {
    return "unavailable";
  }
}

export function gitCommit() {
  return safeExec("git rev-parse HEAD");
}

export function gitDirty() {
  const out = safeExec("git status --porcelain");
  return out === "unavailable" ? "unavailable" : out.length > 0;
}

export function hashFile(absPath) {
  try {
    if (!existsSync(absPath)) return null;
    return createHash("sha256").update(readFileSync(absPath)).digest("hex");
  } catch {
    return null;
  }
}

export function fileSize(absPath) {
  try {
    if (!existsSync(absPath)) return null;
    return statSync(absPath).size;
  } catch {
    return null;
  }
}

/** KB version + record counts from the production KB manifest (read-only). */
export function kbVersion() {
  const manifestPath = join(FRONTEND_DIR, "src", "data", "kb", "v2", "manifest.json");
  try {
    if (!existsSync(manifestPath)) return { version: "unavailable", path: null };
    const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
    return {
      version: manifest.version || manifest.generatedAt || "unavailable",
      generatedAt: manifest.generatedAt || null,
      recordCount: manifest.recordCount ?? manifest.totalRecords ?? null,
      path: "KRISHIVERSE/src/data/kb/v2/manifest.json",
      hash: hashFile(manifestPath),
    };
  } catch {
    return { version: "unavailable", path: null };
  }
}

/** Model artifact inventory (sizes + hashes) — read-only, production assets. */
export function modelInventory() {
  const candidates = [
    "public/models/efficientnet_b0_plantvillage.onnx",
    "public/models/efficientnet_b0_plantvillage.onnx.data",
    "public/models/labels.json",
    "../models/onnx_eval_results.json",
  ];
  return Object.fromEntries(candidates.map((rel) => {
    const abs = join(FRONTEND_DIR, rel);
    return [rel, { bytes: fileSize(abs), sha256: hashFile(abs) }];
  }));
}

export function environment() {
  const cpus = os.cpus();
  return {
    node: process.version,
    os: `${os.type()} ${os.release()}`,
    arch: process.arch,
    cpuModel: cpus[0]?.model || "unknown",
    cpuCount: cpus.length,
    totalMemMB: Math.round(os.totalmem() / 1024 / 1024),
    deviceClass: "desktop-reference",
    browser: "not-applicable (node benchmark harness)",
  };
}

/**
 * Build the standard runMeta block for a benchmark.
 * @param {string} benchmarkId stable id, e.g. "rice-chatbot-arms-v1"
 * @param {string[]} datasetFiles repo-relative paths whose hashes pin the dataset version
 * @param {object} configuration extra config keys (adapters, thresholds, env flags)
 */
export function buildRunMeta(benchmarkId, datasetFiles = [], configuration = {}) {
  const datasetHashes = {};
  for (const rel of datasetFiles) {
    datasetHashes[rel] = hashFile(join(FRONTEND_DIR, rel));
  }
  return {
    benchmarkId,
    date: new Date().toISOString(),
    gitCommit: gitCommit(),
    gitDirty: gitDirty(),
    seed: BENCHMARK_SEED,
    runtime: `node ${process.version}`,
    device: environment(),
    kb: kbVersion(),
    models: modelInventory(),
    datasetHashes,
    configuration: {
      harness: "KRISHIVERSE/eval/mobile-ai (isolated)",
      telemetry: "none — benchmark harness performs no network calls unless an adapter explicitly opts in via env",
      needleTelemetry: "NEEDLE_TELEMETRY=0 DO_NOT_TRACK=1 mandated for any Needle execution (see docs/ai/needle-evaluation.md)",
      ...configuration,
    },
  };
}
