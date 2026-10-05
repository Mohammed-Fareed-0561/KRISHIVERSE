// Smoke test: verify onnxruntime-web loads the model via the same wasmPath setup
// the browser will use, and runs inference (random input). This validates the
// ORT integration and model integrity outside the browser.
import * as ort from "onnxruntime-web";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

ort.env.wasm.wasmPaths = pathToFileURL(path.resolve(__dirname, "..", "node_modules", "onnxruntime-web", "dist") + path.sep).href;
ort.env.wasm.numThreads = 1;

const modelPath = path.resolve(__dirname, "..", "public", "models", "efficientnet_b0_plantvillage.onnx");
const labelsPath = path.resolve(__dirname, "..", "public", "models", "labels.json");

const labels = JSON.parse(fs.readFileSync(labelsPath, "utf8"));
const bytes = fs.readFileSync(modelPath);
const t0 = performance.now();
const session = await ort.InferenceSession.create(bytes, { executionProviders: ["wasm"] });
const loadMs = performance.now() - t0;

const input = new Float32Array(1 * 3 * 224 * 224).fill(0.5);
const tensor = new ort.Tensor("float32", input, [1, 3, 224, 224]);
const t1 = performance.now();
const out = await session.run({ input: tensor });
const inferMs = performance.now() - t1;

const logits = Array.from(out.logits.data);
console.log("model:", path.basename(modelPath));
console.log("classes:", labels.classes.length, "| mean:", labels.mean.join(","), "| input_size:", labels.input_size);
console.log("session load:", loadMs.toFixed(0) + "ms | inference:", inferMs.toFixed(0) + "ms");
console.log("logits shape:", out.logits.dims, "| values:", logits.map((v) => v.toFixed(3)).join(", "));
console.log("SMOKE TEST OK");
