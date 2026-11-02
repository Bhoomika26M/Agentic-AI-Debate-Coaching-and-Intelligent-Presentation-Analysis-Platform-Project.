// Copies the Silero VAD model, its worklet, and the onnxruntime WASM files
// into the served public folder. Everything runs in the page: no CDN, no
// hosted speech service, and the browser never sends audio anywhere but the
// local API.
import { copyFileSync, existsSync, mkdirSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
const target = join(root, "public", "vad");
mkdirSync(target, { recursive: true });

const copied = [];
function copyAll(from, match) {
  if (!existsSync(from)) return;
  for (const name of readdirSync(from)) {
    if (!match.test(name)) continue;
    copyFileSync(join(from, name), join(target, name));
    copied.push(name);
  }
}

const vadDist = join(root, "node_modules", "@ricky0123", "vad-web", "dist");
copyAll(vadDist, /^(silero_vad.*\.onnx|vad\.worklet\.bundle\.min\.js)$/);
copyAll(join(root, "node_modules", "onnxruntime-web", "dist"), /\.(wasm|mjs)$/);

if (copied.length === 0) {
  console.error("No VAD assets found. Run `npm install` first.");
  process.exit(1);
}
console.log(`Voice assets ready in public/vad: ${copied.sort().join(", ")}`);
