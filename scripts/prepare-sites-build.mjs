#!/usr/bin/env node
import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dist = path.join(root, "dist");
const index = path.join(dist, "client", "index.html");
const worker = path.join(root, "worker", "index.js");
const hosting = path.join(root, ".openai", "hosting.json");

for (const file of [index, worker]) {
  if (!existsSync(file)) throw new Error("Missing Sites build input: " + file);
}

mkdirSync(path.join(dist, "server"), { recursive: true });
mkdirSync(path.join(dist, ".openai"), { recursive: true });
copyFileSync(worker, path.join(dist, "server", "index.js"));
// The public GitHub repository is deployed on Vercel and has no Sites project config.
// When this source is handed to Sites, preserve its local hosting config in the bundle.
if (existsSync(hosting)) copyFileSync(hosting, path.join(dist, ".openai", "hosting.json"));

console.log("Prepared build: dist/server/index.js" + (existsSync(hosting) ? " and Sites hosting config" : " (Vercel source)"));
