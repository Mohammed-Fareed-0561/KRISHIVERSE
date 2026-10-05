// End-to-end verification of the /advisory/ask Groq path using the now-working
// key. Drives the app in-process (no HTTP listen) so stdout buffering and
// background processes aren't involved.
import "dotenv/config";
import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import { buildApp } from "./src/bootstrap.js";
import request from "supertest";

const mem = await MongoMemoryServer.create();
await mongoose.connect(mem.getUri());

const app = buildApp();

const health = await request(app).get("/api/v1/health");
console.log("HEALTH:", health.status, JSON.stringify(health.body));

const q = "What should I spray on tomato plants with early blight spots?";
const t0 = Date.now();
const res = await request(app).post("/api/v1/advisory/ask").send({ question: q, language: "en", context: { crop: "tomato" } }).timeout({ deadline: 60000 });
const ms = Date.now() - t0;
console.log("ADVISORY:", res.status, ms + "ms");
console.log("BODY:", JSON.stringify(res.body).slice(0, 600));

await mongoose.disconnect();
await mem.stop();
process.exit(0);